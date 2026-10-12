// Local-first data layer. localStorage is the truth on this phone; sync is best-effort.
import * as C from './core.js';

const K = {rec: 'gk3.rec', dev: 'gk3.dev', q: 'gk3.q'};
const LIMIT = 4.5e6; // chars; browsers allow ~5M
let recs = {}, dev = {}, queue = {}, st = null, warned = false;
const subs = new Set();

function read(k, d) {try {const v = localStorage.getItem(k); return v ? JSON.parse(v) : d;} catch (e) {return d;}}
function write(k, v) {
	try {
		const s = JSON.stringify(v);
		localStorage.setItem(k, s);
		if (k === K.rec && s.length > LIMIT && !warned) {warned = true; emit({warn: 'space'});}
		return true;
	} catch (e) {emit({warn: 'full'}); return false;}
}
export function load() {
	recs = read(K.rec, {}) || {}; dev = read(K.dev, {}) || {}; queue = read(K.q, {}) || {};
	st = null;
	// round-1 phones kept a 22-character `familyKey`: derive the new 12-character code from it (the same on
	// every phone of that family, so they stay together), keep the PIN working, and re-send everything encrypted
	if (dev.familyKey && !dev.secret) {
		const hx = C.sha256('gk3-migrate|' + dev.familyKey);
		dev.secret = Array.from({length: 12}, (_, i) => C.CROCK[parseInt(hx.slice(i * 2, i * 2 + 2), 16) & 31]).join('');
		if (dev.pinHash && !dev.pinSalt) dev.pinSalt = dev.familyKey;
		delete dev.familyKey; dev.cursor = 0; dev.fullAt = 0;
		for (const id in recs) queue[id] = 1;
		write(K.dev, dev); write(K.q, queue);
	}
}
export const now = () => Date.now();
// record stamps use the phone clock corrected by the server's clock (skew-safe last-writer-wins)
export const stampNow = () => Date.now() + (dev.clockOffset || 0);
export const today = () => C.todayStr(now());
export function state() {return st || (st = C.buildState(Object.values(recs)));}
export const settings = () => state().settings;
export const get = id => {const r = recs[id]; return r && !r.deleted ? r : null;};
export const raw = id => recs[id] || null;
export const all = () => Object.values(recs);
export function on(fn) {subs.add(fn); return () => subs.delete(fn);}
function emit(info) {for (const f of subs) {try {f(info || {});} catch (e) {console.warn(e);}}}
function changed(info) {st = null; emit(info);}

function stamp(r) {
	const prev = recs[r.id];
	r.updated = Math.max(stampNow(), prev ? (prev.updated || 0) + 1 : 0);
	r.by = dev.me || r.by || '';
	if (!r.created) r.created = prev && prev.created ? prev.created : r.updated;
	delete r.deleted;
	return r;
}
export function put(r, info) {return putMany([r], info)[0];}
export function putMany(list, info) {
	const out = [];
	for (const x of list) {const r = stamp({...x}); recs[r.id] = r; queue[r.id] = 1; out.push(r);}
	write(K.rec, recs); write(K.q, queue); changed({local: true, ...(info || {})});
	return out;
}
export function del(id, info) {return delMany([id], info);}
export function delMany(ids, info) {
	for (const id of ids) {
		const prev = recs[id]; if (!prev || prev.deleted) continue;
		recs[id] = {id, kind: prev.kind, updated: Math.max(stampNow(), (prev.updated || 0) + 1), by: dev.me || '', deleted: true};
		queue[id] = 1;
	}
	write(K.rec, recs); write(K.q, queue); changed({local: true, ...(info || {})});
}
// restore an exact earlier version (undo): re-stamped so it wins everywhere
export function restore(snapshot) {if (snapshot) put(snapshot, {undo: true});}
export function saveSettings(patch) {
	const cur = recs.settings && !recs.settings.deleted ? recs.settings : C.defaultSettings();
	return put({...cur, ...patch, id: 'settings', kind: 'settings'});
}

/* device-only prefs: lang, theme, elder, me, pinHash/pinSalt, secret (family code), cursor, licence cache, clockOffset, … */
export const devGet = (k, d) => (dev[k] === undefined ? d : dev[k]);
export function devSet(patch) {Object.assign(dev, patch); write(K.dev, dev); emit({dev: Object.keys(patch)});}

/* sync helpers */
export const pendingIds = () => Object.keys(queue);
export function requeueAll() {for (const id in recs) queue[id] = 1; write(K.q, queue);}
export function pendingRows(ids) {return ids.map(id => recs[id]).filter(Boolean);}
export function ackPushed(rows) {
	for (const r of rows) if (recs[r.id] && recs[r.id].updated === r.updated) delete queue[r.id];
	write(K.q, queue);
}
// records arrive decrypted from sync; newer `updated` (server-corrected clock) wins
export function mergeRemote(list) {
	let n = 0;
	for (const r of list) {
		if (!r || !r.id || !r.kind) continue;
		if (C.newer(r, recs[r.id])) {recs[r.id] = r; delete queue[r.id]; n++;}
	}
	if (n) {write(K.rec, recs); write(K.q, queue); changed({remote: true, n});}
	return n;
}
export function importRecords(list, o = {}) {
	let n = 0;
	for (const r0 of list) {
		if (!r0 || !r0.id || !r0.kind) continue;
		const r = {...r0};
		if (!o.keepUpdated) r.updated = Math.max(stampNow(), (recs[r.id] && recs[r.id].updated || 0) + 1);
		if (!recs[r.id] || C.newer(r, recs[r.id]) || !o.keepUpdated) {recs[r.id] = r; queue[r.id] = 1; n++;}
	}
	write(K.rec, recs); write(K.q, queue); changed({local: true, import: n});
	return n;
}
export function exportJSON() {
	return {app: 'ghar-kharch', format: 3, version: C.VERSION, exported: new Date(now()).toISOString(), records: Object.values(recs).filter(r => !r.deleted)};
}
export function wipe() {
	for (const k of Object.values(K)) try {localStorage.removeItem(k);} catch (e) {/* ignore */}
	recs = {}; dev = {}; queue = {}; st = null;
}
export function wipeRecords() {recs = {}; queue = {}; write(K.rec, recs); write(K.q, queue); changed({local: true});}
