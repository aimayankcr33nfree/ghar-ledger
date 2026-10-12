// Shared operations: attendance marks, paying bills/services, entry rows and lists.
import * as S from './store.js';
import * as C from './core.js';
import {h, dv, sp, bt, L, lang, fmt, sheet, toast, once, chips, moneyInput, field, icon, openUrl, dateField} from './ui.js';
import {G, today, me, cat, catLabel, memberName, member, MODE, modeLabel, came, qtyText, relDate, pro, isPro} from './ctx.js';

/* attendance */
export const markId = (svcId, date) => 'm_' + svcId + '_' + date;
export function setMark(svc, date, qty) {
	const id = markId(svc.id, date);
	if (qty == null || (qty === (svc.qty || 0) && svc.type !== 'fixed')) {if (S.get(id)) S.del(id); return;}
	if (svc.type === 'fixed' && qty !== 0) {if (S.get(id)) S.del(id); return;}
	S.put({id, kind: 'mark', svcId: svc.id, date, qty});
}
export function toggleMark(svc, date) {
	const q = C.qtyOn(S.state(), svc, date);
	if (svc.type === 'piece') return qtyPicker(svc, date);
	if (svc.type === 'qty' && !(svc.qty > 0) && q === 0) return qtyPicker(svc, date);
	setMark(svc, date, q > 0 ? 0 : null);
	const nq = C.qtyOn(S.state(), svc, date);
	toast(`${svc.emoji || ''} ${svc.name} — ${relDate(date)}: ${nq > 0 ? came(svc, true) : came(svc, false)}`, {ms: 2200});
}
export function qtyPicker(svc, date) {
	const cur = C.qtyOn(S.state(), svc, date);
	const isPiece = svc.type === 'piece' || svc.unit === 'can' || svc.unit === 'pc';
	const opts = svc.type === 'fixed' ? [] : isPiece ? [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20] : [0.5, 1, 1.5, 2, 2.5, 3, 4];
	let custom = '';
	return sheet({
		id: 'qty', title: `${svc.emoji || ''} ${svc.name} · ${C.fmtDate(date, lang(), {weekday: true})}`, cls: 'small',
		body: api => h('div', {class: 'pad'},
			h('p', {class: 'note'}, isPiece ? L('कितने?|How many?') : L('कितना आया?|How much came?')),
			h('div', {class: 'chips mt8'},
				opts.map(q => h('button', {class: 'chip' + (q === cur ? ' on' : ''), onclick: () => {setMark(svc, date, q); api.close();}}, qtyText(q, svc.unit))),
				h('button', {class: 'chip' + (cur === 0 ? ' on' : ''), onclick: () => {setMark(svc, date, 0); api.close();}}, '✕ ' + came(svc, false)),
				svc.type !== 'piece' ? bt('chip', {onclick: () => {setMark(svc, date, null); api.close();}}, L('रोज़ जैसा|Usual')) : null),
			svc.type === 'fixed' ? null : field(L('या लिखें|Or type'), h('input', {class: 'inp', inputmode: 'decimal', placeholder: isPiece ? '7' : '1.25', oninput: e => {custom = e.target.value;}}))),
		foot: svc.type === 'fixed' ? null : api => h('button', {
			class: 'btn pri block', onclick: once(() => {
				const q = parseFloat(C.devToAsc(custom).replace(',', '.'));
				if (!(q >= 0) || q > 99) {toast(L('सही संख्या लिखें|Enter a valid number')); return;}
				setMark(svc, date, Math.round(q * 100) / 100); api.close();
			}),
		}, L('ठीक है|Done')),
	});
}

/* bills */
export function payBillSheet(b, due) {
	const st = S.state(), isNeed = b.cycle === 'need';
	let amt = b.amt || 0, date = today(), mode = b.autopay ? 'upi' : 'upi', who = me();
	const lbl = () => `${fmt(amt)} ${L('भर दिया|paid')}`;
	let btn;
	return sheet({
		id: 'paybill', title: `${b.emoji || '🧾'} ${b.name}`,
		body: () => h('div', {class: 'pad'},
			!isNeed ? h('p', {class: 'note'}, (due < today() ? L('बाक़ी था: |Was due: ') : L('तारीख: |Due: ')) + C.fmtDate(due, lang(), {year: due.slice(0, 4) !== today().slice(0, 4)}) + ' · ' + L('तय रकम |Planned ') + fmt(b.amt)) : h('p', {class: 'note'}, L('सिलेंडर/बुकिंग कितने का पड़ा?|How much did it cost?')),
			field(L('कितना भरा?|Amount paid'), moneyInput(amt, p => {amt = p || 0; btn.textContent = lbl();}), L('बिल कम-ज़्यादा आया हो तो बदल दें — तय रकम वैसी ही रहेगी|Change it if the bill differs — the plan stays as it is')),
			dateField(date, v => {date = v;}),
			field(L('कैसे|How'), chips(MODE(), mode, v => {mode = v;})),
			membersField(who, v => {who = v;})),
		foot: api => h('div', {class: 'btnrow'},
			!isNew0(b, due) ? bt('btn ghost', {style: {flex: 'none'}, id: 'bill-skip', onclick: once(async () => {await api.close(); skipBill(b, due);})}, L('इस बार नहीं|Skip')) : null,
			btn = h('button', {
				class: 'btn pri', id: 'bill-paid', onclick: once(async () => {
					if (!(amt > 0)) {toast(L('रकम लिखें|Enter the amount')); return;}
					const t = S.put({id: C.newId('t'), kind: 'tx', type: 'out', amt, cat: b.cat || 'other', note: b.name, date, who, mode, billId: b.id, billDue: isNeed ? date : due, at: S.now()});
					await api.close();
					toast(`${b.name} ${fmt(amt)} ${L('भर दिया|paid')} ✓`, {undo: () => S.del(t.id)});
				}),
			}, lbl())),
	});
}
const isNew0 = (b, due) => b.cycle === 'need' || !due;
export function skipBill(b, due) {
	const prev = S.get(b.id);
	S.put({...prev, skips: [...(prev.skips || []), due]});
	toast(`${b.name}: ${L('इस बार नहीं|skipped this time')}`, {undo: () => S.restore(prev)});
}
export function membersField(who, onPick) {
	const ms = S.settings().members;
	if (ms.length < 2) return null;
	return field(L('किसने|Who'), chips(ms.map(m => [m.id, `${m.emoji || '🙂'} ${m.name}`]), who, onPick));
}

/* services */
export function paySvcSheet(svc, mk, o = {}) {
	const st = S.state(), bl = C.svcBill(st, svc, mk);
	let amt = bl.amt, date = today(), mode = o.mode || 'cash', who = me(), btn;
	const lbl = () => `${fmt(amt)} ${L('चुकाया|paid')}`;
	return sheet({
		id: 'paysvc', title: `${svc.emoji || ''} ${svc.name} — ${C.monthLabel(mk, lang())}`,
		body: () => h('div', {class: 'pad'},
			o.note ? h('p', {class: 'pill ok', style: {display: 'block', padding: '8px 12px', lineHeight: 1.45}}, o.note) : null,
			h('p', {class: 'note'}, C.svcBillLine(svc, bl, lang())),
			field(L('कितना दिया?|Amount paid'), moneyInput(amt, p => {amt = p || 0; btn.textContent = lbl();})),
			dateField(date, v => {date = v;}),
			field(L('कैसे|How'), chips(MODE(), mode, v => {mode = v;})),
			membersField(who, v => {who = v;})),
		foot: api => dv('btnrow', mk < C.mkey(today()) ? bt('btn ghost', {style: {flex: 'none'}, id: 'svc-skip', onclick: once(async () => {await api.close(); skipSvc(svc, mk);})}, L('इस बार नहीं|Skip')) : null, btn = h('button', {
			class: 'btn pri', id: 'svc-paid', onclick: once(async () => {
				if (!(amt > 0)) {toast(L('रकम लिखें|Enter the amount')); return;}
				const t = S.put({id: C.newId('t'), kind: 'tx', type: 'out', amt, cat: svc.cat || 'services', note: `${svc.name} — ${C.MONTHS[lang() === 'en' ? 'en' : 'hi'][+mk.slice(5) - 1]}`, date, who, mode, svcId: svc.id, svcMonth: mk, at: S.now()});
				await api.close();
				toast(`${svc.name}: ${fmt(amt)} ${L('चुकाया|paid')} ✓`, {undo: () => S.del(t.id)});
			}),
		}, lbl())),
	});
}
export function skipSvc(svc, mk) {
	const prev = S.get(svc.id);
	S.put({...prev, skips: [...(prev.skips || []), mk]});
	toast(`${svc.name}: ${L('इस बार नहीं|skipped')}`, {undo: () => S.restore(prev)});
}
export function sendSvcWA(svc, mk) {
	return pro('wa', () => {
		const upto = mk === C.mkey(today()) ? today() : null;
		const text = C.svcWhatsApp(S.state(), svc, mk, lang(), upto);
		openUrl(C.waLink(svc.phone, text));
	});
}

/* entries */
export function txRow(t, o = {}) {
	const c = cat(t.cat), st = S.state();
	const who = memberName(t.who);
	const sub = [o.date ? relDate(t.date) : null, who, t.type === 'out' ? modeLabel(t.mode) : null,
		t.billId ? '🧾 ' + L('बिल|bill') : null, t.svcId ? '🏠 ' + L('सेवा|service') : null, t.goalId ? '🏺 ' + ((st.byId.get(t.goalId) || {}).name || '') : null].filter(Boolean).join(' · ');
	const sign = t.type === 'in' ? '+' : '';
	return bt('row', {onclick: () => G.openAdd({editId: t.id}), 'data-tx': t.id},
		h('div', {class: 'row-ic', 'aria-hidden': 1}, c.e),
		dv('row-main', dv('row-t', t.note ? `${catLabel(t.cat)} · ${t.note}` : catLabel(t.cat)), sub ? dv('row-s', sub) : null),
		dv('row-end', h('span', {class: 'amt num' + (t.type === 'in' ? ' in' : t.type === 'save' ? ' save' : '')}, sign + fmt(t.amt)),
			t.type === 'save' ? sp('pill gold', L('बचत|saved')) : t.type === 'in' ? sp('pill ok', L('आया|in')) : null));
}
export function entriesSheet(title, list, o = {}) {
	const total = list.reduce((a, t) => a + t.amt, 0);
	return sheet({
		id: 'entries', title, cls: 'tall',
		body: api => {
			const cur = list.map(t => S.get(t.id)).filter(Boolean);
			if (!cur.length) return dv('empty', dv('empty-e', '🗒️'), dv('empty-t', L('कोई एंट्री नहीं|No entries')));
			const groups = new Map();
			for (const t of cur.slice().reverse()) {if (!groups.has(t.date)) groups.set(t.date, []); groups.get(t.date).push(t);}
			return h('div', null,
				o.explain ? h('div', {class: 'box', style: {marginBottom: '14px'}}, o.explain) : null,
				[...groups.entries()].map(([d, ts]) => h('div', {class: 'sec mt12'},
					dv('sec-h', h('h3', {style: {fontSize: '15px'}}, C.fmtDate(d, lang(), {weekday: true})), sp('meta num', fmt(ts.reduce((a, t) => a + t.amt, 0)))),
					dv('list', ts.map(t => txRow(t))))));
		},
		foot: () => h('div', {class: 'row-total', style: {borderRadius: '14px'}}, h('span', null, L('कुल|Total') + ` · ${list.length}`), sp('num', fmt(total))),
		live: true,
	});
}
