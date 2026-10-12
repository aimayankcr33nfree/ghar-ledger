// Shared app context: registry of cross-screen actions + small helpers.
import * as S from './store.js';
import * as C from './core.js';
import {L, lang} from './ui.js';

export const G = {}; // filled by screens: openAdd, openExplain, lockSheet, render, …
export const st = () => S.state();
export const today = () => S.today();
export const me = () => S.devGet('me', '');
export const plan = () => C.planState(S.devGet('license'), S.settings(), S.now(), S.today());
export const isPro = () => plan().pro;
// run fn if Pro; otherwise show the gentle lock sheet (nothing is ever deleted)
export function pro(feature, fn) {if (isPro()) return fn(); G.lockSheet && G.lockSheet(feature); return null;}
export function cat(id) {return C.catOf(S.state(), id);}
export function catLabel(id) {return C.catName(cat(id), lang());}
export function member(id) {return C.memberOf(S.state(), id);}
export function memberName(id) {const m = member(id); return m ? m.name : '';}
export function myName() {return memberName(me()) || L('मैं|Me');}
export function familyName() {return S.settings().familyName || L('हमारा घर|Our home');}
export function initials(name) {
	const w = String(name || '').trim().split(/\s+/).filter(Boolean);
	if (!w.length) return '🏠';
	const first = s => [...s][0] + ([...s][1] && /[ा-्ँ-ः]/.test([...s][1]) ? [...s][1] : '');
	return first(w[0]);
}
export const MODE = () => [['upi', 'UPI'], ['cash', L('नकद|Cash')], ['card', L('कार्ड|Card')]];
export const modeLabel = m => (MODE().find(x => x[0] === m) || [0, ''])[1];
export function cycleName(b) {
	return {
		m: L('हर महीने|Monthly'), '2m': L('हर 2 महीने|Every 2 months'), '3m': L('हर 3 महीने|Quarterly'), y: L('हर साल|Yearly'),
		'28d': L('हर 28 दिन|Every 28 days'), '84d': L('हर 84 दिन|Every 84 days'), need: L('जब ज़रूरत|When needed'),
	}[b] || '';
}
export function svcFem(svc) {return svc.fem != null ? !!svc.fem : ['maid', 'cook'].includes(svc.tpl);}
export const came = (svc, yes) => (yes ? (svcFem(svc) ? L('आई|Came') : L('आया|Came')) : (svcFem(svc) ? L('नहीं आई|Absent') : L('नहीं आया|Absent')));
export function qtyText(q, unit) {
	if (unit === 'pc') return `${q} ${C.unitLabel('pc', lang(), q)}`;
	const s = q === 0.5 ? '½' : q === 1.5 ? '1½' : q === 2.5 ? '2½' : q === 0.25 ? '¼' : q === 0.75 ? '¾' : String(q);
	return `${s} ${C.unitLabel(unit, lang(), q)}`.trim();
}
export const typeName = t => ({out: L('खर्च|Spend'), in: L('आमदनी|Income'), save: L('बचत|Saving'), lend: L('उधार|Lend'), shagun: L('शगुन|Shagun')}[t]);
export function relDate(d) {return C.relDay(d, today(), lang());}
export function daysText(n) {return lang() === 'en' ? `${n} day${n === 1 ? '' : 's'}` : `${n} दिन`;}
