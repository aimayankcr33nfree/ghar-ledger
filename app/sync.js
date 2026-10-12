// Family sync over plain Supabase REST with fetch. Local data is the truth; the server only stores ciphertext.
// Order comes from a server-stamped sequence (seq), so a phone with a wrong clock never misses an edit.
import * as S from './store.js';
import * as C from './core.js';
import * as V from './vault.js';

export const SB_URL = 'https://hwycxdeqxrcudtobwgex.supabase.co';
export const SB_KEY = 'sb_publishable_O8kFpMgViIvgMFE2sTtrEw_Rv7FXa0R';
const T = 'gk_records', PAGE = 1000, CHUNK = 300, OVERLAP = 200, META = '_rotated';
let state = 'off', lastErr = '', lastOk = 0, debounce = null, iv = null, chain = Promise.resolve(), queued = false;
const subs = new Set();
export const onState = f => subs.add(f);
let pendSince = 0;
function setState(s, err) {if (s === 'pending' && state !== 'pending') pendSince = Date.now(); state = s; if (err !== undefined) lastErr = err; subs.forEach(f => f(state));}
export const info = () => ({state, lastErr, lastOk, pending: S.pendingIds().length, online: navigator.onLine !== false, pendingFor: state === 'pending' ? Date.now() - pendSince : 0});

let ctxCache = null;
async function ctx(secret = S.devGet('secret')) {
	if (!secret) return null;
	if (ctxCache && ctxCache.secret === secret) return ctxCache;
	// the code is stretched (PBKDF2, 200k rounds) once; the result is kept on this phone (device-only, never synced)
	const kc0 = S.devGet('kc'), kc = kc0 && kc0.s === secret && kc0.v === V.KDF_V ? kc0 : null, mine = secret === S.devGet('secret');
	const slow = !kc && !V.isReady(secret) ? setTimeout(() => {try {window.dispatchEvent(new CustomEvent('gk-securing'));} catch (e) { /* not a browser */ }}, 400) : null;
	const m = await V.material(secret, kc);
	clearTimeout(slow);
	if (mine && !kc) {
		// rows sent before key stretching (round 2) live under the old id: send everything again under the new one
		if (S.devGet('cursor', 0) > 0) {S.requeueAll(); S.devSet({cursor: 0, fullAt: 0});}
		S.devSet({kc: m.cache});
	}
	ctxCache = {secret, fam: m.fam, key: m.key, cache: m.cache};
	return ctxCache;
}
const hdr = fam => ({apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'x-family': fam, 'Content-Type': 'application/json', Accept: 'application/json'});
async function http(url, opt) {
	const r = await fetch(url, {cache: 'no-store', ...opt});
	if (!r.ok) {let t = ''; try {t = await r.text();} catch (e) { /* ignore */ } const err = new Error('HTTP ' + r.status + (t ? ': ' + t.slice(0, 200) : '')); err.http = r.status; err.body = t; throw err;}
	return r;
}
async function rpc(fam, name, args = {}) {
	const r = await http(`${SB_URL}/rest/v1/rpc/${name}`, {method: 'POST', headers: hdr(fam), body: JSON.stringify(args)});
	const t = await r.text();
	return t ? JSON.parse(t) : null;
}
// all rows after a server cursor, decrypted
async function pullRows(c, cursor) {
	const out = []; let max = cursor || 0, rotated = false;
	const from = Math.max(0, (cursor || 0) - OVERLAP);
	for (let off = 0; off < 400000; off += PAGE) {
		const r = await http(`${SB_URL}/rest/v1/${T}?select=id,data,updated,seq&seq=gt.${from}&order=seq.asc&limit=${PAGE}&offset=${off}`, {headers: hdr(c.fam)});
		const rows = await r.json();
		for (const row of rows) {
			if (+row.seq > max) max = +row.seq;
			const rec = row.data && row.data.c ? await V.open(c.key, row.data.c) : null;
			if (!rec) continue;
			if (rec.kind === 'meta') {if (rec.rotated) rotated = true; continue;}
			out.push(rec);
		}
		if (rows.length < PAGE) break;
	}
	return {recs: out, max, rotated};
}
async function pushRecs(c, recs) {
	for (let i = 0; i < recs.length; i += CHUNK) {
		const part = await Promise.all(recs.slice(i, i + CHUNK).map(async r => ({family: c.fam, id: await V.rowId(c.secret, r.id), kind: 'e', data: {c: await V.seal(c.key, r)}, updated: r.updated, deleted: false})));
		await http(`${SB_URL}/rest/v1/${T}`, {method: 'POST', headers: {...hdr(c.fam), Prefer: 'resolution=merge-duplicates,return=minimal'}, body: JSON.stringify(part)});
	}
}
// licence + server clock (used to correct record stamps). status 'moved' = this code was replaced by a new one.
async function fetchStatus(c) {
	const t0 = Date.now(), r = await rpc(c.fam, 'gk_status'), t1 = Date.now();
	const patch = {};
	if (r && r.now) patch.clockOffset = Math.round(+r.now - (t0 + t1) / 2);
	if (r && r.status === 'moved') patch.rotated = true;
	else patch.license = r ? {status: r.status, plan: r.plan, paid_until: r.paid_until, checked: t1} : null;
	return {r, patch};
}
export async function status() {
	const c = await ctx(); if (!c) return null;
	const {r, patch} = await fetchStatus(c);
	S.devSet(patch);
	return r;
}
// user mistakes come back as {error} with HTTP 200 (no red console noise); thrown here with the reason in .body
function check(r) {if (r && r.error) {const e = new Error(r.error); e.body = r.error; e.user = true; throw e;} return r;}
export async function claim(plan, utr) {const c = await ctx(); const r = check(await rpc(c.fam, 'gk_claim', {p_plan: plan, p_utr: String(utr).replace(/\s/g, '')})); await status(); return r;}
export async function redeem(code) {const c = await ctx(); const r = check(await rpc(c.fam, 'gk_redeem', {p_code: String(code).toUpperCase().replace(/[^0-9A-Z]/g, '')})); await status(); return r;}
const pro = () => C.planState(S.devGet('license'), S.settings(), S.now(), S.today()).pro;

export function syncNow() {
	if (queued) return chain;
	queued = true;
	chain = chain.then(() => {queued = false; return runOnce();});
	return chain;
}
async function runOnce() {
	const c = await ctx().catch(() => null);
	if (!c || !S.devGet('onboarded')) {setState('off'); return;}
	if (S.devGet('rotated')) {setState('rotated'); return;}
	if (navigator.onLine === false) {setState(S.pendingIds().length ? 'pending' : 'off', ''); return;}
	try {
		await status();
		if (S.devGet('rotated')) {setState('rotated'); return;}
		if (!pro()) {setState('locked'); return;}
		const full = Date.now() - (S.devGet('fullAt', 0) || 0) > 864e5;
		const res = await pullRows(c, full ? 0 : S.devGet('cursor', 0));
		if (res.rotated) {S.devSet({rotated: true}); setState('rotated'); return;}
		if (res.recs.length) S.mergeRemote(res.recs);
		S.devSet({cursor: res.max, ...(full ? {fullAt: Date.now()} : {})});
		const ids = S.pendingIds();
		if (ids.length) {const recs = S.pendingRows(ids); await pushRecs(c, recs); S.ackPushed(recs);}
		lastOk = Date.now();
		setState(S.pendingIds().length ? 'pending' : 'ok', '');
	} catch (e) {
		if (e && e.http) setState('err', e.http === 404 ? 'Supabase tables not found — run SUPABASE.sql (' + e.message + ')' : e.message);
		else setState(S.pendingIds().length ? 'pending' : 'off', String(e && e.message || e));
	}
}
// joining: fetch and decrypt the whole family; refuses when no family settings exist for this code
export async function readFamily(secret) {
	try {
		const c = await ctx(secret);
		const res = await pullRows(c, 0);
		if (res.rotated) return {ok: false, reason: 'rotated'};
		if (!res.recs.some(r => r.kind === 'settings' && !r.deleted)) return {ok: false, reason: 'notfound'};
		const st = await fetchStatus(c); // only for a family that exists (a wrong code never creates a licence)
		if (st.patch.rotated) return {ok: false, reason: 'rotated'};
		return {ok: true, recs: res.recs, max: res.max, dev: st.patch};
	} catch (e) {return {ok: false, reason: e && e.http ? 'server' : 'network', error: String(e && e.message || e)};}
}
// "सबको हटाकर नया कोड": everything is re-encrypted under a new code, the licence moves, old rows are deleted
export async function rotate(newSecret) {
	const old = await ctx(), m = await V.material(newSecret), next = {secret: newSecret, fam: m.fam, key: m.key, cache: m.cache};
	const recs = S.all().filter(r => !r.deleted);
	await pushRecs(next, recs);
	await rpc(old.fam, 'gk_move', {p_new: next.fam});
	await pushRecs(old, [{id: META, kind: 'meta', rotated: true, updated: S.stampNow()}]);
	const keep = await V.rowId(old.secret, META);
	await http(`${SB_URL}/rest/v1/${T}?family=eq.${old.fam}&id=neq.${keep}`, {method: 'DELETE', headers: hdr(old.fam)});
	ctxCache = next;
	S.devSet({secret: newSecret, kc: m.cache, cursor: 0, fullAt: 0, rotated: false});
	for (const r of recs) S.ackPushed([r]);
	await syncNow();
}
// "सारा डेटा मिटाएँ" — also removes this family's rows from the server
export async function deleteServerCopy() {
	const c = await ctx(); if (!c) return;
	await http(`${SB_URL}/rest/v1/${T}?family=eq.${c.fam}`, {method: 'DELETE', headers: hdr(c.fam)});
}
// the family's licence comes with it, so a phone joining a paid family never sees the "trial over" sheet
export function adoptJoin(secret, res) {
	const kc = ctxCache && ctxCache.secret === secret ? ctxCache.cache : null;
	ctxCache = null; S.devSet({...(res.dev || {}), secret, ...(kc ? {kc} : {}), cursor: res.max || 0, fullAt: Date.now(), rotated: false});
}
export function start() {
	syncNow();
	S.on(i => {if (i && i.local) {if (state === 'ok') setState('pending'); clearTimeout(debounce); debounce = setTimeout(syncNow, 2000);}});
	window.addEventListener('online', () => syncNow());
	window.addEventListener('offline', () => setState(S.pendingIds().length ? 'pending' : 'off'));
	window.addEventListener('focus', () => syncNow());
	document.addEventListener('visibilitychange', () => {if (document.visibilityState === 'visible') syncNow();});
	clearInterval(iv);
	iv = setInterval(() => {if (document.visibilityState === 'visible') syncNow();}, 60000);
}
