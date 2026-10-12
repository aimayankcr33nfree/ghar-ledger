// End-to-end encryption for family sync (WebCrypto; runs in browsers and Node 18+).
// The 12-character family code never leaves the family's phones. It is stretched with PBKDF2-SHA-256
// (200,000 rounds, fixed app salt + a per-purpose label) into two independent secrets:
//   family id  → the server's `family` column / x-family header (so the id does not reveal the code quickly)
//   record key → AES-GCM-256 for every record + an HMAC key for row ids.
// The slow step runs once per code; its result is cached in memory and (by sync.js) on the phone.
const te = new TextEncoder(), td = new TextDecoder();
const subtle = () => globalThis.crypto.subtle;
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const b64 = u8 => {let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s);};
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export const ITER = 200000, KDF_V = 2;
const mats = new Map(); // code → Promise<{fam, key, mac, cache}>
async function stretch(secret, label) {
	const base = await subtle().importKey('raw', te.encode(secret), 'PBKDF2', false, ['deriveBits']);
	return new Uint8Array(await subtle().deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt: te.encode('ghar-kharch-gk3|' + label), iterations: ITER}, base, 256));
}
async function build(secret, fam, kb) {
	const base = await subtle().importKey('raw', kb, 'HKDF', false, ['deriveKey']);
	const hk = info => ({name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: te.encode(info)});
	const key = await subtle().deriveKey(hk('records-aes-gcm-v2'), base, {name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
	const mac = await subtle().deriveKey(hk('row-id-hmac-v2'), base, {name: 'HMAC', hash: 'SHA-256', length: 256}, false, ['sign']);
	return {fam, key, mac, cache: {v: KDF_V, s: secret, fam, kb: b64(kb)}};
}
// everything derived from a code; `cached` = an earlier result's .cache (skips the slow step)
export function material(secret, cached) {
	if (!mats.has(secret)) {
		const ok = cached && cached.v === KDF_V && cached.s === secret && cached.fam && cached.kb;
		mats.set(secret, ok ? build(secret, cached.fam, unb64(cached.kb))
			: Promise.all([stretch(secret, 'family-id'), stretch(secret, 'record-key')]).then(([a, b]) => build(secret, hex(a).slice(0, 32), b)));
		mats.get(secret).catch(() => mats.delete(secret));
	}
	return mats.get(secret);
}
export const isReady = secret => mats.has(secret);
export async function familyId(secret) {return (await material(secret)).fam;}
export async function keyFor(secret) {return (await material(secret)).key;}
// row ids: keyed hash of the record id (needs the stretched key, so ids do not help guessing the code)
export async function rowId(secret, id) {const m = await material(secret); return hex(await subtle().sign('HMAC', m.mac, te.encode(id))).slice(0, 32);}
export async function seal(key, obj) {
	const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
	const ct = new Uint8Array(await subtle().encrypt({name: 'AES-GCM', iv}, key, te.encode(JSON.stringify(obj))));
	const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
	return b64(out);
}
// returns the record, or null when it was not sealed with this key
export async function open(key, s) {
	try {
		const u = unb64(s);
		return JSON.parse(td.decode(await subtle().decrypt({name: 'AES-GCM', iv: u.subarray(0, 12)}, key, u.subarray(12))));
	} catch (e) {return null;}
}
