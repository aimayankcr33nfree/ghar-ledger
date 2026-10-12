// Phone reminders: Notifications API + Periodic Background Sync in the service worker.
// 9 pm "आज का हिसाब", payday "पहले बचत", helpers' dues, trial ending. Asked only after the 3rd day of use,
// never on first run. Fallbacks: the .ics files on Home and the cards on Today.
import * as S from './store.js';
import * as C from './core.js';
import {L, lang} from './ui.js';

const STATE = 'gkstate-v1';
export const supported = () => typeof Notification !== 'undefined' && 'serviceWorker' in navigator && typeof caches !== 'undefined';
async function reg() {try {return await Promise.race([navigator.serviceWorker.getRegistration(), new Promise(r => setTimeout(() => r(null), 1500))]);} catch (e) {return null;}}
export function info() {
	const sup = supported(), perm = sup ? Notification.permission : 'unsupported';
	return {
		supported: sup, perm, on: !!S.devGet('remind') && perm === 'granted',
		canAsk: sup && perm === 'default' && !S.devGet('remAsked') && S.devGet('openDays', 0) >= 3 && !!S.devGet('onboarded'),
		enable, decline, disable,
	};
}
export async function enable() {
	S.devSet({remAsked: true});
	if (!supported()) return false;
	let p = Notification.permission;
	if (p === 'default') {try {p = await Notification.requestPermission();} catch (e) {p = 'denied';}}
	if (p !== 'granted') {S.devSet({remind: false}); return false;}
	S.devSet({remind: true});
	await writeState();
	const r = await reg();
	if (r) {
		try {
			if (r.periodicSync) {
				const q = await navigator.permissions.query({name: 'periodic-background-sync'}).catch(() => ({state: 'denied'}));
				if (q.state === 'granted') await r.periodicSync.register('gk-remind', {minInterval: 60 * 60 * 1000});
			}
		} catch (e) { /* the app still checks whenever it is opened */ }
		try {await r.showNotification(L('घर खर्च|Ghar Kharch'), {body: L('ठीक है — रोज़ रात 9 बजे याद दिलाएँगे।|Done — we will remind you at 9 pm every day.'), tag: 'gk-hello', icon: 'icon-192.png'});} catch (e) { /* ignore */ }
	}
	return true;
}
export function decline() {S.devSet({remAsked: true});}
export async function disable() {
	S.devSet({remind: false});
	await writeState();
	const r = await reg();
	try {if (r && r.periodicSync) await r.periodicSync.unregister('gk-remind');} catch (e) { /* ignore */ }
}
// the plan the service worker reads (Cache Storage, so it survives without the page)
export async function writeState() {
	if (!supported()) return;
	const st = S.state(), td = S.today(), P = C.planState(S.devGet('license'), st.settings, S.now(), td);
	const at = (d, hh) => new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10), hh, 0, 0).getTime();
	const items = C.reminderPlan(st, td, {lang: lang(), at, trialLeft: P.trialLeft, target: C.saveTarget(st, C.cycleFor(td, st.settings))});
	const written = [...new Set(st.tx.filter(t => !t.auto && t.date >= C.addDays(td, -2)).map(t => t.date))];
	const body = {v: 1, on: !!S.devGet('remind'), lang: lang(), items, written, updated: Date.now()};
	try {const c = await caches.open(STATE); await c.put('state.json', new Response(JSON.stringify(body), {headers: {'Content-Type': 'application/json'}}));} catch (e) { /* ignore */ }
}
// ask the service worker to show what is due now (used when the app opens; also the test hook)
export async function check(now) {
	const r = await reg(); const w = r && (r.active || r.waiting);
	if (!w) return [];
	return new Promise(res => {
		const ch = new MessageChannel(); ch.port1.onmessage = e => res(e.data || []);
		w.postMessage({type: 'remind-check', now}, [ch.port2]); setTimeout(() => res([]), 3000);
	});
}
let timer = null;
export function schedule() {if (!S.devGet('remind')) return; clearTimeout(timer); timer = setTimeout(() => {writeState().then(() => check());}, 1200);}
