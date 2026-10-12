// खाता / Khata — services, bills, उधार, शगुन
import * as S from './store.js';
import * as C from './core.js';
import {h, dv, sp, bt, trow, L, lang, fmt, sheet, toast, once, chips, toggle, field, icon, moneyInput, emptyState, confirmSheet, openUrl, download} from './ui.js';
import {G, today, me, cat, catLabel, MODE, came, qtyText, relDate, daysText, cycleName, isPro, pro, myName} from './ctx.js';
import {header} from './today.js';
import {setMark, qtyPicker, payBillSheet, paySvcSheet, skipBill, skipSvc, sendSvcWA, txRow} from './ops.js';

let seg = 'svc', shQuery = '';
export const SEGS = () => [['svc', L('सेवाएँ|Services')], ['bill', L('बिल|Bills')], ['lend', L('उधार|Loans')], ['shagun', L('शगुन|Shagun')]];

export function renderKhata() {
	const segEl = h('div', {class: 'seg', role: 'tablist'}, SEGS().map(([k, lb]) => h('button', {role: 'tab', class: k === seg ? 'on' : '', 'aria-selected': k === seg ? 'true' : 'false', 'data-seg': k, onclick: () => {seg = k; G.render();}}, lb)));
	let body;
	if (seg === 'svc') body = servicesView();
	else if (seg === 'bill') body = billsView();
	else if (seg === 'lend') body = lendView();
	else body = shagunView();
	return h('frag', null, header(L('खाता|Khata'), L('लोगों और बिलों का हिसाब|Accounts with people & bills')), dv('stick', segEl), body);
}

/* services */
function servicesView() {
	const st = S.state(), td = today(), mk = C.mkey(td);
	const list = st.svcs.filter(s => s.active !== false || C.svcBill(st, s, mk).amt > 0);
	const addBtn = bt('btn pri block', {id: 'add-svc', style: {marginTop: '14px'}, onclick: () => addService()}, icon('plus', 20), L('नई सेवा|New service'));
	if (!list.length) return h('div', null, dv('list', emptyState('🥛', L('दूधवाला, कामवाली, प्रेस…|Milkman, maid, ironing…'), L('रोज़ एक टैप, महीने के अंत में WhatsApp पर हिसाब।|One tap a day, a WhatsApp bill at month end.'))), addBtn);
	return h('div', null, list.map(svc => {
		const bl = C.svcBill(st, svc, mk, {upto: td}), paid = C.svcPaid(st, svc, mk);
		const meta = [];
		if (svc.type === 'fixed') meta.push(L(`${fmt(C.rateOn(svc, td))}/महीना`, `${fmt(C.rateOn(svc, td))}/month`), L(`${bl.leaves} छुट्टी`, `${bl.leaves} ${bl.leaves === 1 ? 'leave' : 'leaves'}`));
		else if (svc.type === 'piece') meta.push(`${fmt(C.rateOn(svc, td))}/${C.unitLabel(svc.unit, lang(), 1)}`, qtyText(bl.qty, svc.unit));
		else meta.push(`${qtyText(svc.qty || 0, svc.unit)} ${L('रोज़|daily')} · ${fmt(C.rateOn(svc, td))}`, daysText(bl.days), bl.absent.length ? L(`${bl.absent.length} बार नहीं आए`, `${bl.absent.length} absent`) : null);
		return bt('card svc-card', {'data-svc': svc.id, onclick: () => serviceSheet(svc.id)},
			dv('svc-top', h('div', {class: 'row-ic', 'aria-hidden': 1}, svc.emoji || '🏠'),
				dv('row-main', dv('row-t', svc.name), dv('row-s', L('इस महीने अब तक|This month so far'))),
				dv('svc-amt num', fmt(bl.amt))),
			dv('svc-meta', meta.filter(Boolean).map(m => h('span', null, m)),
				paid ? sp('pill ok', '✓ ' + L('चुकाया|Paid')) : svc.active === false ? sp('pill mute', L('बंद|Stopped')) : sp('pill mute', L('बाक़ी|Unpaid'))));
	}), addBtn);
}

// opens on the oldest month that is still unpaid (that is what the helper is waiting for), else this month
export function oldestUnpaid(st, svc, td) {
	const cur = C.mkey(td);
	for (let mk = C.mkey(svc.start || td), i = 0; i < 60 && mk < cur; i++, mk = C.shiftMonthKey(mk, 1)) {
		if (C.svcPaid(st, svc, mk) || C.svcSkipped(svc, mk)) continue;
		if (C.svcBill(st, svc, mk).amt > 0) return mk;
	}
	return cur;
}
export function serviceSheet(id, mk0) {
	let mk = mk0 || (S.get(id) ? oldestUnpaid(S.state(), S.get(id), today()) : C.mkey(today()));
	return sheet({
		id: 'svc', title: '', cls: 'tall', live: true,
		body: api => {
			const st = S.state(), svc = S.get(id), td = today();
			if (!svc) {setTimeout(() => api.close(), 0); return null;}
			api.setTitle(`${svc.emoji || ''} ${svc.name}`);
			const cur = C.mkey(td), isCur = mk === cur;
			const bl = C.svcBill(st, svc, mk, isCur ? {upto: td} : {}), paid = C.svcPaid(st, svc, mk), skipped = C.svcSkipped(svc, mk);
			const y = +mk.slice(0, 4), m = +mk.slice(5, 7), D = C.dim(y, m), first = C.dow(mk + '-01');
			const cells = [];
			for (let i = 0; i < 7; i++) cells.push(h('div', {class: 'cal-h', 'aria-hidden': 1}, C.DAY1[lang() === 'en' ? 'en' : 'hi'][i]));
			for (let i = 0; i < first; i++) cells.push(h('div', {class: 'cal-d off', 'aria-hidden': 1}));
			for (let d = 1; d <= D; d++) {
				const ds = mk + '-' + String(d).padStart(2, '0');
				if (!C.svcActiveOn(svc, ds)) {cells.push(dv('cal-d off', h('b', null, d))); continue;}
				const q = C.qtyOn(st, svc, ds), mark = C.markOf(st, svc, ds);
				let cls = 'cal-d', txt;
				if (svc.type === 'fixed') {txt = q > 0 ? '✓' : '✕'; if (!(q > 0)) cls += ' no';}
				else if (svc.type === 'piece') {txt = q > 0 ? String(q) : mark === 0 ? '✕' : '·'; if (mark === 0) cls += ' no'; else if (q > 0) cls += ' cu';}
				else {txt = q > 0 ? (q === 0.5 ? '½' : q === 1.5 ? '1½' : String(q)) : '✕'; if (!(q > 0)) cls += ' no'; else if (mark !== undefined) cls += ' cu';}
				if (ds > td) cls += ' fut'; if (ds === td) cls += ' today';
				cells.push(h('button', {class: cls, 'data-day': ds, 'aria-label': `${C.fmtDate(ds, lang())}: ${q > 0 ? came(svc, true) + (svc.type !== 'fixed' ? ' ' + qtyText(q, svc.unit) : '') : came(svc, false)}`, onclick: () => tapDay(svc, ds)}, h('b', null, d), sp('q', txt)));
			}
			const lines = [];
			lines.push(dv('ln', h('span', null, C.svcBillLine(svc, bl, lang()).replace(/^[^:]+: /, '')), null));
			if (bl.absent.length) lines.push(dv('ln note', (svc.type === 'fixed' ? L('छुट्टी: |Leaves: ') : L('नहीं आए: |Absent: ')) + bl.absent.map(d => +d.slice(8)).join(', ') + L(' तारीख|')));
			if (svc.type === 'fixed') lines.push(dv('ln note', L(`${svc.freeLeaves || 0} छुट्टी माफ़${svc.leaveCut ? ` · उसके बाद ${fmt(svc.leaveCut)}/छुट्टी कटेगा` : ''}`, `${svc.freeLeaves || 0} free leaves${svc.leaveCut ? ` · then ${fmt(svc.leaveCut)} per leave` : ''}`)));
			return h('div', {class: 'pad'},
				h('div', {class: 'mswitch'},
					bt('iconbtn', {'aria-label': L('पिछला महीना|Previous month'), onclick: () => {mk = C.shiftMonthKey(mk, -1); api.refresh();}}, icon('back')),
					dv('t', h('b', null, C.monthLabel(mk, lang())), h('span', null, isCur ? (svc.type === 'fixed' ? L('टैप करें: आई ↔ नहीं आई|Tap: came ↔ absent') : svc.type === 'piece' ? L('टैप करें: कितने कपड़े|Tap: count pieces') : L('टैप करें: आया → नहीं आया → बदलें|Tap: came → absent → change')) : '')),
					bt('iconbtn', {'aria-label': L('अगला महीना|Next month'), disabled: mk >= cur, style: {opacity: mk >= cur ? .3 : 1}, onclick: () => {if (mk < cur) {mk = C.shiftMonthKey(mk, 1); api.refresh();}}}, icon('next'))),
				h('div', {class: 'cal', id: 'svc-cal'}, cells),
				h('div', {class: 'box billbox', id: 'svc-bill'},
					dv('xl-l', isCur ? L('अब तक का हिसाब|Bill so far') : L('महीने का हिसाब|Month bill')),
					lines,
					dv('ln tot', h('span', null, L('कुल|Total')), sp('num', fmt(bl.amt))),
					paid ? dv('ln', sp('pill ok', L(`✓ ${C.fmtDate(paid.tx.date, 'hi', {short: true})} को ${fmt(paid.amt)} दिए`, `✓ Paid ${fmt(paid.amt)} on ${C.fmtDate(paid.tx.date, 'en', {short: true})}`)),
						bt('linkbtn', {onclick: () => {const t = {...paid.tx}; S.del(t.id); toast(L('भुगतान हटा दिया|Payment removed'), {undo: () => S.restore(t)});}}, L('हटाएँ|Remove'))) : null,
					skipped ? dv('ln', sp('pill mute', L('इस महीने का छोड़ दिया|Skipped this month'))) : null),
				mk < cur && !paid && !skipped ? h('p', {class: 'pill warn mt10', id: 'svc-due-note'}, L(`${C.monthLabel(mk, 'hi')} का हिसाब बाक़ी है|${C.monthLabel(mk, 'en')} is still unpaid`)) : null,
				h('div', {class: 'btnrow mt14'},
					bt('btn wa', {id: 'svc-wa', onclick: () => sendSvcWA(svc, mk)}, icon('wa', 20), L('WhatsApp पर हिसाब|Bill on WhatsApp')),
					!paid && bl.amt > 0 ? bt('btn line', {id: 'svc-upi', onclick: () => payByUpi(svc, mk, bl.amt)}, '₹ ', L('UPI से भुगतान|Pay by UPI')) : null),
				!paid ? bt('btn pri block', {id: 'svc-pay', style: {marginTop: '10px'}, onclick: () => paySvcSheet(svc, mk)}, L(`चुकाया — ${fmt(bl.amt)}`, `Paid — ${fmt(bl.amt)}`)) : null,
				h('div', {class: 'btnrow mt10'},
					bt('btn ghost sm', {onclick: () => editService(svc)}, icon('edit', 18), L('बदलें|Edit')),
					!paid && !skipped && mk < cur ? bt('btn ghost sm', {onclick: () => skipSvc(svc, mk)}, L('इस बार नहीं|Skip')) : null),
				svc.phone ? h('p', {class: 'note', style: {marginTop: '10px', textAlign: 'center'}}, '📞 ' + svc.phone) : null);
		},
	});
}
// "UPI से भुगतान करें": opens the family's UPI app with the helper's UPI ID and the bill, then asks to mark it paid
function payByUpi(svc, mk, amt) {
	if (!C.isVpa(svc.vpa)) return vpaSheet(svc, () => payByUpi(S.get(svc.id), mk, amt));
	const mon = C.MONTHS[lang() === 'en' ? 'en' : 'hi'][+mk.slice(5) - 1];
	openUrl(C.upiPayLink({pa: svc.vpa, pn: svc.name, am: amt, tn: `${svc.name} ${mon}`}));
	setTimeout(() => paySvcSheet(svc, mk, {mode: 'upi', note: L('UPI ऐप में भुगतान हो गया हो तो "चुकाया" दबाएँ|If the UPI app shows success, tap "Paid"')}), 600);
}
function vpaSheet(svc, then) {
	let v = svc.vpa || '';
	return sheet({
		id: 'vpa', title: L(`${svc.name} का UPI ID`, `${svc.name}'s UPI ID`), cls: 'small',
		body: () => h('div', {class: 'pad'},
			h('p', {class: 'note'}, L('उनके फ़ोन के UPI ऐप (GPay/PhonePe/Paytm) में "UPI ID" लिखा होता है — जैसे 98xxxxxx@ybl।|It is shown in their UPI app (GPay/PhonePe/Paytm) — e.g. 98xxxxxx@ybl.')),
			h('input', {class: 'inp mt8', id: 'vpa-in', value: v, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', inputmode: 'email', placeholder: 'naam@okaxis', oninput: e => {v = e.target.value.trim();}})),
		foot: api => {
			// a wrong ID is refused at once; only the real save is guarded against a double tap
			const go = once(async () => {const p = S.get(svc.id); S.put({...p, vpa: v}); await api.close(); if (then) then();});
			return bt('btn pri block', {id: 'vpa-save', onclick: () => {
				if (!C.isVpa(v)) {toast(L('UPI ID सही नहीं लगता — जैसे naam@okaxis|That does not look like a UPI ID — e.g. name@okaxis')); return;}
				go();
			}}, L('सेव करें और भुगतान करें|Save and pay'));
		},
		focus: '#vpa-in',
	});
}
function tapDay(svc, ds) {
	const st = S.state(), q = C.qtyOn(st, svc, ds), mark = C.markOf(st, svc, ds);
	if (svc.type === 'fixed') {setMark(svc, ds, q > 0 ? 0 : null); return;}
	if (svc.type === 'piece') {qtyPicker(svc, ds); return;}
	if (mark === undefined && q > 0) setMark(svc, ds, 0); // default → absent
	else if (mark === 0) qtyPicker(svc, ds); // absent → custom
	else setMark(svc, ds, null); // custom → default
}

export function makeSvc(tpl, v) {
	const t = C.SVC_TPL.find(x => x.tpl === tpl) || {};
	return {
		id: v.id || C.newId('s'), kind: 'svc', tpl: tpl || 'custom', name: v.name || L(t.hi, t.en) || L('सेवा|Service'), emoji: v.emoji || t.e || '🏠',
		type: v.type || t.type || 'fixed', rate: v.rate || 0, qty: v.qty != null ? v.qty : (t.qty != null ? t.qty : 1), unit: v.unit || t.unit || 'pc',
		freeLeaves: v.freeLeaves != null ? v.freeLeaves : (t.freeLeaves || 0), leaveCut: v.leaveCut || 0, phone: v.phone || '', cat: v.cat || t.cat || 'services',
		start: v.start || C.mkey(today()) + '-01', rates: v.rates || [], active: true, skips: [],
	};
}
export function addService() {
	const st = S.state();
	if (!isPro() && st.svcs.filter(s => s.active !== false).length >= C.FREE.svc) {G.lockSheet('svc'); return;}
	return serviceForm(null);
}
function editService(svc) {return serviceForm(svc);}
function serviceForm(svc) {
	const td = today(), isNew = !svc;
	const v = svc ? {...svc} : makeSvc('milk', {});
	let rateFrom = td, newRate = svc ? C.rateOn(svc, td) : 0;
	const sh = sheet({
		id: 'svcform', title: isNew ? L('नई सेवा|New service') : L('सेवा बदलें|Edit service'), cls: 'tall',
		body: api => h('div', {class: 'pad'},
			isNew ? field(L('कौन-सी सेवा?|Which service?'), chips([...C.SVC_TPL.map(t => [t.tpl, `${t.e} ${L(t.hi, t.en)}`]), ['custom', L('✏️ कोई और|✏️ Other')]], v.tpl, k => {
				const nv = makeSvc(k === 'custom' ? null : k, {}); if (k === 'custom') {nv.tpl = 'custom'; nv.name = ''; nv.type = 'fixed'; nv.emoji = '🙂';}
				Object.assign(v, nv, {id: v.id}); newRate = 0; api.refresh();
			})) : null,
			field(L('नाम|Name'), h('input', {class: 'inp', id: 'svc-name', value: v.name, maxlength: 30, oninput: e => {v.name = e.target.value;}})),
			v.tpl === 'custom' ? field(L('हिसाब कैसे?|How is it charged?'), chips([['qty', L('रोज़ की मात्रा|Daily quantity')], ['fixed', L('महीने का तय|Fixed monthly')], ['piece', L('हर नग|Per piece')]], v.type, k => {v.type = k; api.refresh();})) : null,
			v.type === 'fixed' ? h('div', null,
				field(L('महीने के कितने? (₹)|Per month (₹)'), moneyInput(isNew ? v.rate : newRate, p => {if (isNew) v.rate = p || 0; else newRate = p || 0;}, {label: L('महीने का|Monthly')})),
				field(L('कितनी छुट्टी माफ़?|Free leaves per month'), chips([0, 1, 2, 3, 4].map(n => [n, String(n)]), v.freeLeaves, n => {v.freeLeaves = n;})),
				field(L('उसके बाद हर छुट्टी पर कटेगा (₹) — चाहें तो|Cut per extra leave (₹) — optional'), moneyInput(v.leaveCut, p => {v.leaveCut = p || 0;}))) :
				h('div', null,
					field(v.type === 'piece' ? L('हर नग का रेट (₹)|Rate per piece (₹)') : L(`रेट (₹ प्रति ${C.unitLabel(v.unit, 'hi', 1) || 'नग'})`, `Rate (₹ per ${C.unitLabel(v.unit, 'en', 1) || 'unit'})`), moneyInput(isNew ? v.rate : newRate, p => {if (isNew) v.rate = p || 0; else newRate = p || 0;})),
					v.type === 'qty' ? field(L('रोज़ कितना?|Daily quantity'), chips([0.5, 1, 1.5, 2, 3].map(n => [n, qtyText(n, v.unit)]), v.qty, n => {v.qty = n;})) : null),
			!isNew ? field(L('नया रेट कब से लागू?|New rate applies from'), h('input', {class: 'inp', type: 'date', value: rateFrom, onchange: e => {rateFrom = e.target.value || td;}}), L('पिछले महीनों का हिसाब नहीं बदलेगा|Past months will not change')) : null,
			field(L('WhatsApp नंबर (चाहें तो)|WhatsApp number (optional)'), h('input', {class: 'inp', type: 'tel', inputmode: 'tel', id: 'svc-phone', value: v.phone, placeholder: '98XXXXXXXX', maxlength: 14, oninput: e => {v.phone = e.target.value.replace(/[^\d+]/g, '');}})),
			field(L('UPI ID (चाहें तो) — सीधे UPI से भुगतान के लिए|UPI ID (optional) — to pay straight by UPI'), h('input', {class: 'inp', id: 'svc-vpa', value: v.vpa || '', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', inputmode: 'email', placeholder: 'naam@okaxis', oninput: e => {v.vpa = e.target.value.trim();}})),
			isNew ? field(L('कब से गिनें?|Count from'), h('input', {class: 'inp', type: 'date', value: v.start, max: td, onchange: e => {v.start = e.target.value || v.start;}}), L('महीने की शुरुआत से गिनना हो तो 1 तारीख रहने दें|Keep the 1st to count the whole month')) : null,
			!isNew ? h('div', {class: 'btnrow mt18'},
				svc.active !== false ? bt('btn ghost sm', {onclick: () => confirmSheet(L('सेवा बंद करें?|Stop this service?'), L('आज के बाद गिनती नहीं होगी। पुराना हिसाब रहेगा।|No counting after today. Past records stay.'), L('बंद करें|Stop'), async () => {await api.close(); const p = S.get(svc.id); S.put({...p, active: false, end: td}); toast(L('सेवा बंद की|Service stopped'), {undo: () => S.restore(p)});})}, L('सेवा बंद करें|Stop service'))
					: bt('btn ghost sm', {onclick: async () => {const p = S.get(svc.id); await api.close(); S.put({...p, active: true, end: undefined});}}, L('फिर शुरू करें|Restart')),
				bt('btn ghost sm red', {onclick: () => confirmSheet(L('सेवा हटाएँ?|Delete service?'), L('इसकी हाज़िरी भी हट जाएगी। भुगतान के खर्च बने रहेंगे।|Its attendance is removed too. Payments stay as spends.'), L('हटाएँ|Delete'), async () => {
					await G.closeAll(); const p = S.get(svc.id); const marks = S.all().filter(r => r.kind === 'mark' && r.svcId === svc.id && !r.deleted).map(r => ({...r}));
					S.delMany([svc.id, ...marks.map(m => m.id)]); toast(L('सेवा हटा दी|Service deleted'), {undo: () => S.putMany([p, ...marks])});
				}, {danger: true})}, L('हटाएँ|Delete'))) : null),
		foot: api => h('button', {
			class: 'btn pri block', id: 'svc-save', onclick: once(async () => {
				if (!v.name.trim()) {toast(L('नाम लिखें|Enter a name')); return;}
				if (v.vpa && !C.isVpa(v.vpa)) {toast(L('UPI ID सही नहीं लगता — जैसे naam@okaxis|That does not look like a UPI ID — e.g. name@okaxis')); return;}
				if (isNew) {
					if (!(v.rate > 0)) {toast(L('रेट लिखें|Enter the rate')); return;}
					const r = S.put({...v, name: v.name.trim()});
					await api.close();
					toast(L(`${r.name} जुड़ गया`, `${r.name} added`), {undo: () => S.del(r.id)});
				} else {
					const p = S.get(svc.id), nv = {...p, name: v.name.trim(), phone: v.phone, vpa: v.vpa || '', qty: v.qty, freeLeaves: v.freeLeaves, leaveCut: v.leaveCut, type: v.type};
					if (newRate > 0 && newRate !== C.rateOn(p, rateFrom)) nv.rates = [...(p.rates || []).filter(x => x.from !== rateFrom), {from: rateFrom, rate: newRate}];
					S.put(nv);
					await api.close();
					toast(L('बदल दिया ✓|Saved ✓'), {undo: () => S.restore(p)});
				}
			}),
		}, isNew ? L('सेवा जोड़ें|Add service') : L('सेव करें|Save')),
	});
	return sh;
}

/* bills */
function billsView() {
	const st = S.state(), td = today();
	const bills = st.bills.filter(b => b.active !== false);
	const addBtn = h('div', {class: 'btnrow mt14'},
		bt('btn pri', {id: 'add-bill', onclick: () => addBill()}, icon('plus', 20), L('नया बिल|New bill')),
		bills.length ? bt('btn ghost', {id: 'bills-ics', onclick: () => billsICS()}, icon('cal', 20), L('कैलेंडर में याद|Calendar reminders')) : null);
	if (!bills.length) return h('div', null, dv('list', emptyState('🧾', L('किराया, बिजली, रिचार्ज…|Rent, electricity, recharge…'), L('तारीख याद रहेगी, "देना है" में दिखेगा।|Shows under "To pay" when due.'))), addBtn);
	return h('div', null, dv('list', bills.map(b => {
		const next = C.billNext(st, b, td), last = C.billLastPaid(st, b);
		const c = C.cycleFor(td, st.settings);
		let status;
		if (b.cycle === 'need') status = last ? sp('pill mute', L(`पिछली बार ${C.diffDays(last.date, td)} दिन पहले`, `last ${C.diffDays(last.date, td)} days ago`)) : sp('pill mute', L('जब ज़रूरत|when needed'));
		else if (next && next < td) status = sp('pill bad', L('बाक़ी|Overdue'));
		else if (C.billOcc(b, c.start, c.end).length && C.billOcc(b, c.start, c.end).every(d => C.billPaid(st, b, d) || C.billSkipped(b, d))) status = sp('pill ok', '✓ ' + L('भरा|Paid'));
		else if (next && next <= c.end) {const dd = C.diffDays(td, next); status = b.autopay ? sp('pill gold', L('ऑटो-पे|Autopay')) : sp('pill warn', dd === 0 ? L('आज|Today') : L(`${dd} दिन में`, `in ${dd} days`));}
		else status = null;
		const sub = [cycleName(b.cycle), b.cycle !== 'need' && next ? L('अगली: |Next: ') + C.fmtDate(next, lang(), {short: true, year: next.slice(0, 4) !== td.slice(0, 4)}) : null, b.autopay ? L('ऑटो-पे|autopay') : null].filter(Boolean).join(' · ');
		return bt('row', {'data-bill': b.id, onclick: () => billSheet(b.id)},
			h('div', {class: 'row-ic', 'aria-hidden': 1}, b.emoji || '🧾'),
			dv('row-main', dv('row-t', b.name), dv('row-s', sub)),
			dv('row-end', sp('amt num', b.amt ? fmt(b.amt) : '—'), status));
	})), addBtn);
}
function billsICS() {pro('ics', () => {download('ghar-kharch-bills.ics', 'text/calendar', C.icsBills(S.state(), today(), lang(), S.now())); toast(L('फ़ाइल खोलें — हर बिल से एक दिन पहले याद आएगा|Open the file — you get a reminder a day before each bill'));});}

export function billSheet(id) {
	return sheet({
		id: 'bill', title: '', live: true,
		body: api => {
			const st = S.state(), b = S.get(id), td = today();
			if (!b) {setTimeout(() => api.close(), 0); return null;}
			api.setTitle(`${b.emoji || '🧾'} ${b.name}`);
			const next = C.billNext(st, b, td), paidList = st.tx.filter(t => t.billId === b.id).slice().reverse().slice(0, 8);
			return h('div', {class: 'pad'},
				h('div', {class: 'sumcard'},
					h('div', null, dv('k', L('तय रकम|Planned')), dv('v num', b.amt ? fmt(b.amt) : '—')),
					h('div', null, dv('k', b.cycle === 'need' ? L('पिछली बार|Last booked') : L('अगली तारीख|Next due')),
						h('div', {class: 'v', style: {fontSize: '19px'}}, b.cycle === 'need' ? (paidList[0] ? C.fmtDate(paidList[0].date, lang(), {short: true}) : '—') : next ? C.fmtDate(next, lang(), {short: true, year: next.slice(0, 4) !== td.slice(0, 4)}) : '—'))),
				h('p', {class: 'note mt10'}, cycleName(b.cycle) + (b.autopay ? ' · ' + L('ऑटो-पे|autopay') : '') + ' · ' + catLabel(b.cat)),
				h('div', {class: 'btnrow mt12'},
					bt('btn pri', {id: 'bill-pay', onclick: () => payBillSheet(b, b.cycle === 'need' ? td : next || td)}, b.cycle === 'need' ? L('बुक किया / भरा|Booked / paid') : L('भर दिया|Paid')),
					next && b.cycle !== 'need' ? bt('btn ghost', {onclick: () => skipBill(b, next)}, L('इस बार नहीं|Skip this time')) : null),
				paidList.length ? dv('sec', dv('sec-h', h('h3', null, L('पिछले भुगतान|Past payments'))), dv('list', paidList.map(t => txRow(t, {date: true})))) : null,
				h('div', {class: 'btnrow mt16'},
					bt('btn ghost sm', {onclick: () => billForm(b)}, icon('edit', 18), L('बदलें|Edit')),
					bt('btn ghost sm red', {onclick: () => confirmSheet(L('बिल हटाएँ?|Delete bill?'), L('पुराने भुगतान खर्च में बने रहेंगे।|Past payments stay as spends.'), L('हटाएँ|Delete'), async () => {await G.closeAll(); const p = S.get(b.id); S.del(b.id); toast(L('बिल हटा दिया|Bill deleted'), {undo: () => S.restore(p)});}, {danger: true})}, icon('trash', 18), L('हटाएँ|Delete'))));
		},
	});
}
export function makeBill(tpl, v) {
	const t = C.BILL_TPL.find(x => x.tpl === tpl) || {};
	const cyc = v.cycle || t.cycle || 'm';
	return {
		id: v.id || C.newId('b'), kind: 'bill', tpl: tpl || 'custom', name: v.name || L(t.hi, t.en) || L('बिल|Bill'), emoji: v.emoji || t.e || '🧾',
		amt: v.amt || 0, cat: v.cat || t.cat || 'other', cycle: cyc, dueDay: cyc === 'm' ? (v.dueDay || t.dueDay || 5) : undefined,
		nextDue: v.nextDue, autopay: v.autopay != null ? v.autopay : !!t.autopay, active: true, skips: [],
	};
}
export function anchorFor(cycle, dueDay, nextDate, td) {
	if (cycle === 'need') return td;
	if (cycle === 'm') {const y = +td.slice(0, 4), m = +td.slice(5, 7); return C.ymd(y, m, Math.min(dueDay || 1, C.dim(y, m)));}
	return nextDate || td;
}
export function addBill() {
	const st = S.state();
	if (!isPro() && st.bills.filter(b => b.active !== false).length >= C.FREE.bill) {G.lockSheet('bill'); return;}
	return billForm(null);
}
function billForm(b) {
	const td = today(), isNew = !b;
	const v = b ? {...b} : makeBill('rent', {});
	let nextDate = b ? (C.billNext(S.state(), b, td) || b.nextDue) : C.addDays(td, 7);
	let paidThisMonth = false;
	const cyc = () => [['m', L('हर महीने|Monthly')], ['2m', L('2 महीने|2 months')], ['3m', L('3 महीने|Quarterly')], ['y', L('साल|Yearly')], ['28d', L('28 दिन|28 days')], ['84d', L('84 दिन|84 days')], ['need', L('जब ज़रूरत|When needed')]];
	return sheet({
		id: 'billform', title: isNew ? L('नया बिल|New bill') : L('बिल बदलें|Edit bill'), cls: 'tall',
		body: api => h('div', {class: 'pad'},
			isNew ? field(L('कौन-सा बिल?|Which bill?'), chips([...C.BILL_TPL.map(t => [t.tpl, `${t.e} ${L(t.hi, t.en)}`]), ['custom', L('✏️ कोई और|✏️ Other')]], v.tpl, k => {
				const nv = makeBill(k === 'custom' ? null : k, {}); if (k === 'custom') {nv.tpl = 'custom'; nv.name = '';}
				Object.assign(v, nv, {id: v.id}); api.refresh();
			})) : null,
			field(L('नाम|Name'), h('input', {class: 'inp', id: 'bill-name', value: v.name, maxlength: 30, oninput: e => {v.name = e.target.value;}})),
			field(v.cycle === 'need' ? L('लगभग कितने का? (₹)|About how much? (₹)') : L('कितना? (₹)|Amount (₹)'), moneyInput(v.amt, p => {v.amt = p || 0;}), v.tpl === 'power' ? L('हर बार अलग आए तो भरते समय बदल दें|If it varies, change it when paying') : null),
			field(L('कितने दिन में?|How often?'), chips(cyc(), v.cycle, k => {v.cycle = k; if (k === 'm' && !v.dueDay) v.dueDay = 5; api.refresh();})),
			v.cycle === 'm' ? field(L('हर महीने किस तारीख को?|Due on which day?'), h('select', {class: 'inp', id: 'bill-day', onchange: e => {v.dueDay = +e.target.value;}}, Array.from({length: 31}, (_, i) => h('option', {value: i + 1, selected: v.dueDay === i + 1}, String(i + 1)))))
				: v.cycle !== 'need' ? field(L('अगली बार कब?|Next due date'), h('input', {class: 'inp', type: 'date', id: 'bill-next', value: nextDate, onchange: e => {nextDate = e.target.value || nextDate;}})) : null,
			isNew && v.cycle === 'm' ? trow(L('इस महीने भर दिया?|Already paid this month?'), L('हाँ हो तो इस महीने बाक़ी नहीं दिखेगा|If yes, it won\'t show as due this month'), toggle(paidThisMonth, x => {paidThisMonth = x;}, L('इस महीने भर दिया?|Paid this month?'))) : null,
			v.cycle !== 'need' ? trow(L('ऑटो-पे (अपने-आप कटता है)|Autopay (auto-debited)'), L('तारीख पर अपने-आप खर्च में लिख देंगे|We add the spend on the due date'), toggle(!!v.autopay, x => {v.autopay = x;}, L('ऑटो-पे|Autopay'))) : null,
			field(L('श्रेणी|Category'), h('select', {class: 'inp', onchange: e => {v.cat = e.target.value;}}, S.settings().cats.filter(c => c.t === 'out' && !c.sys).map(c => h('option', {value: c.id, selected: c.id === v.cat}, `${c.e} ${C.catName(c, lang())}`))))),
		foot: api => h('button', {
			class: 'btn pri block', id: 'bill-save', onclick: once(async () => {
				if (!v.name.trim()) {toast(L('नाम लिखें|Enter a name')); return;}
				if (v.cycle !== 'need' && !(v.amt > 0)) {toast(L('रकम लिखें|Enter the amount')); return;}
				if (isNew) {
					const r = makeBill(v.tpl, {...v, name: v.name.trim(), nextDue: anchorFor(v.cycle, v.dueDay, nextDate, td)});
					const made = [S.put(r)];
					if (paidThisMonth && v.cycle === 'm') made.push(S.put({id: C.newId('t'), kind: 'tx', type: 'out', amt: r.amt, cat: r.cat, note: r.name, date: r.nextDue <= td ? r.nextDue : td, who: me(), mode: 'upi', billId: r.id, billDue: r.nextDue, at: S.now()}));
					await api.close();
					toast(L(`${r.name} जुड़ गया`, `${r.name} added`), {undo: () => S.delMany(made.map(x => x.id))});
				} else {
					const p = S.get(b.id);
					const nv = {...p, name: v.name.trim(), amt: v.amt, cycle: v.cycle, dueDay: v.cycle === 'm' ? v.dueDay : undefined, autopay: !!v.autopay, cat: v.cat};
					if (v.cycle !== p.cycle || (v.cycle === 'm' && v.dueDay !== p.dueDay) || (v.cycle !== 'm' && v.cycle !== 'need' && nextDate !== (C.billNext(S.state(), p, td) || p.nextDue))) {
						if (v.cycle === 'm') {
							const m0 = C.mkey(td) + '-01', m1 = C.addDays(C.addMonths(m0, 1), -1), st0 = S.state();
							const paidThis = C.billOcc(p, m0, m1).some(d => C.billPaid(st0, p, d)) || st0.tx.some(t => t.billId === p.id && t.date >= m0);
							nv.nextDue = anchorFor('m', v.dueDay, null, paidThis ? C.addMonths(m0, 1) : td);
						} else nv.nextDue = anchorFor(v.cycle, v.dueDay, nextDate, td);
					}
					S.put(nv);
					await api.close();
					toast(L('बदल दिया ✓|Saved ✓'), {undo: () => S.restore(p)});
				}
			}),
		}, isNew ? L('बिल जोड़ें|Add bill') : L('सेव करें|Save')),
	});
}
// autopay: record the spend on/after the due date, once (deterministic id → no duplicates across phones)
export function runAutopay() {
	const st = S.state(), td = today(); let n = 0;
	for (const b of st.bills) {
		if (!b.autopay || b.active === false || b.cycle === 'need' || !b.nextDue) continue;
		for (const due of C.billOcc(b, C.addDays(td, -40) > b.nextDue ? C.addDays(td, -40) : b.nextDue, td)) {
			const id = 'ap_' + b.id + '_' + due;
			if (S.raw(id) || C.billPaid(st, b, due) || C.billSkipped(b, due)) continue;
			S.put({id, kind: 'tx', type: 'out', amt: b.amt, cat: b.cat, note: b.name + ' · ' + L('ऑटो-पे|autopay'), date: due, who: me(), mode: 'upi', billId: b.id, billDue: due, at: S.now()});
			n++;
		}
	}
	return n;
}

/* उधार */
function lendView() {
	const st = S.state(), td = today(), sum = C.lendSummary(st);
	const open = st.lends.filter(l => !l.settled).sort((a, b) => (a.date < b.date ? -1 : 1));
	const done = st.lends.filter(l => l.settled);
	const addBtn = bt('btn pri block', {id: 'add-lend', style: {marginTop: '14px'}, onclick: () => pro('registers', () => G.openAdd({type: 'lend'}))}, icon('plus', 20), L('उधार लिखें|Add a loan'));
	return h('div', null,
		h('div', {class: 'sumcard', id: 'lend-sum'},
			h('div', null, dv('k', L('लेना है|To get back')), h('div', {class: 'v num', style: {color: 'var(--in)'}}, fmt(sum.lena))),
			h('div', null, dv('k', L('देना है|To give back')), h('div', {class: 'v num', style: {color: 'var(--red)'}}, fmt(sum.dena)))),
		h('p', {class: 'note', style: {margin: '8px 4px 0'}}, L('उधार आया/गया में नहीं गिना जाता, पर दिया या लौटाया पैसा रोज़ के पैसे से घटता है और वापस आया पैसा जुड़ता है।|Loans are not income or spending, but money lent or repaid comes out of the daily money and money returned to you goes back in.')),
		open.length ? h('div', {class: 'list mt12'}, open.map(l => lendRow(l, td))) : h('div', {class: 'list mt12'}, emptyState('🤝', L('कोई उधार बाक़ी नहीं|No open loans'), L('किसे दिया, किससे लिया — सब यहाँ याद रहेगा।|Who you lent to, who you borrowed from — remembered here.'))),
		done.length ? h('details', {class: 'sec'}, h('summary', {class: 'linkbtn'}, L(`चुकता हो गए (${done.length})`, `Settled (${done.length})`)), dv('list', done.map(l => lendRow(l, td)))) : null,
		addBtn);
}
function lendRow(l, td) {
	const left = C.lendLeft(l), days = C.diffDays(l.date, td);
	const t = l.dir === 'gave' ? L(`${l.person} को दिया ${fmt(left)}`, `Lent ${l.person} ${fmt(left)}`) : L(`${l.person} से लिया ${fmt(left)}`, `Borrowed from ${l.person} ${fmt(left)}`);
	return bt('row', {'data-lend': l.id, onclick: () => lendSheet(l.id)},
		h('div', {class: 'row-ic', 'aria-hidden': 1}, l.dir === 'gave' ? '📤' : '📥'),
		dv('row-main', dv('row-t', l.settled ? L(`${l.person} — चुकता`, `${l.person} — settled`) : t),
			dv('row-s', (l.settled ? fmt(l.amt) + ' · ' : '') + (days === 0 ? L('आज|today') : L(`${days} दिन से`, `${days} days ago`)) + ((l.payments || []).length ? L(` · ${l.payments.length} बार लौटाया`, ` · ${l.payments.length} part payment(s)`) : ''))),
		l.settled ? sp('pill ok', '✓') : sp('chev', icon('chev', 18)));
}
function lendSheet(id) {
	let part = 0;
	return sheet({
		id: 'lend', title: '', live: true,
		body: api => {
			const l = S.get(id); if (!l) {setTimeout(() => api.close(), 0); return null;}
			api.setTitle(l.dir === 'gave' ? L(`${l.person} को दिया`, `Lent to ${l.person}`) : L(`${l.person} से लिया`, `Borrowed from ${l.person}`));
			const left = C.lendLeft(l);
			return h('div', {class: 'pad'},
				dv('sumcard', h('div', null, dv('k', L('कुल|Total')), dv('v num', fmt(l.amt))), h('div', null, dv('k', L('बाक़ी|Left')), dv('v num', fmt(left)))),
				h('p', {class: 'note mt8'}, C.fmtDate(l.date, lang(), {year: true}) + (l.note ? ' · ' + l.note : '')),
				(l.payments || []).length ? h('div', {class: 'box mt10'}, l.payments.map((p, i) => h('div', {class: 'ln', style: {display: 'flex', justifyContent: 'space-between', padding: '4px 0'}}, h('span', null, C.fmtDate(p.date, lang(), {short: true})), sp('num', fmt(p.amt))))) : null,
				!l.settled ? h('div', null,
					field(l.dir === 'gave' ? L('कुछ पैसे लौटे? (₹)|Got some back? (₹)') : L('कुछ पैसे लौटाए? (₹)|Paid some back? (₹)'), dv('frow', moneyInput(0, p => {part = p || 0;}), h('button', {
						class: 'btn line sm', style: {flex: 'none'}, id: 'lend-part', onclick: once(() => {
							const cur = S.get(id); if (!(part > 0)) {toast(L('रकम लिखें|Enter amount')); return;}
							if (part > C.lendLeft(cur)) {toast(L('बाक़ी से ज़्यादा है|More than what is left')); return;}
							const prev = {...cur, payments: [...(cur.payments || [])]};
							const pays = [...(cur.payments || []), {amt: part, date: today()}];
							const done = pays.reduce((a, x) => a + x.amt, 0) >= cur.amt;
							S.put({...cur, payments: pays, settled: done});
							toast(done ? L('पूरा चुकता ✓|Fully settled ✓') : L(`${fmt(part)} लौटे`, `${fmt(part)} recorded`), {undo: () => S.restore(prev)}); part = 0;
						}),
					}, L('लिखें|Add')))),
					h('div', {class: 'btnrow mt14'},
						l.dir === 'gave' ? bt('btn wa', {id: 'lend-wa', onclick: () => pro('registers', () => openUrl('https://wa.me/?text=' + encodeURIComponent(C.lendReminder(l, lang(), myName()))))}, icon('wa', 20), L('याद दिलाएँ|Remind')) : null,
						bt('btn pri', {id: 'lend-settle', onclick: once(async () => {
							const prev = S.get(id), rest = C.lendLeft(prev); await api.close();
							S.put({...prev, payments: rest > 0 ? [...(prev.payments || []), {amt: rest, date: today()}] : prev.payments || [], settled: true});
							toast(rest > 0 ? (prev.dir === 'gave' ? L(`${prev.person} — बाक़ी ${fmt(rest)} मिले, चुकता ✓`, `${prev.person} — got the remaining ${fmt(rest)}, settled ✓`) : L(`${prev.person} — बाक़ी ${fmt(rest)} लौटाए, चुकता ✓`, `${prev.person} — returned the remaining ${fmt(rest)}, settled ✓`)) : L(`${prev.person} — चुकता ✓`, `${prev.person} — settled ✓`), {undo: () => S.restore(prev)});
						})}, l.dir === 'gave' ? L(`पूरे ${fmt(left)} मिल गए|Got all ${fmt(left)} back`) : L(`पूरे ${fmt(left)} लौटा दिए|Returned all ${fmt(left)}`)))) :
					bt('btn ghost block mt14', {onclick: () => {const prev = S.get(id); S.put({...prev, settled: false});}}, L('फिर से खोलें|Reopen')),
				bt('btn ghost sm red mt14', {onclick: () => confirmSheet(L('यह उधार हटाएँ?|Delete this loan?'), '', L('हटाएँ|Delete'), async () => {await G.closeAll(); const p = S.get(id); S.del(id); toast(L('हटा दिया|Deleted'), {undo: () => S.restore(p)});}, {danger: true})}, icon('trash', 18), L('हटाएँ|Delete')));
		},
	});
}

/* शगुन */
function occLabel(k) {const o = C.OCCASIONS.find(x => x[0] === k); return o ? L(o[1], o[2]) : (k || '');}
function shagunView() {
	const st = S.state(), groups = C.shagunByPerson(st, shQuery);
	const search = h('div', {class: 'money-wrap mt2'}, h('span', {class: 'rs', style: {display: 'grid'}}, icon('search', 18)),
		h('input', {class: 'inp', id: 'sh-search', placeholder: L('नाम से खोजें — जैसे शर्मा|Search by name — e.g. Sharma'), value: shQuery, style: {paddingLeft: '40px', fontWeight: 500}, oninput: e => {shQuery = e.target.value; const pos = e.target.selectionStart; G.render(); const n = document.getElementById('sh-search'); if (n) {n.focus(); n.setSelectionRange(pos, pos);}}}));
	const addBtn = bt('btn pri block', {id: 'add-shagun', style: {marginTop: '14px'}, onclick: () => pro('registers', () => G.openAdd({type: 'shagun'}))}, icon('plus', 20), L('शगुन लिखें|Add shagun'));
	const list = groups.length ? h('div', {class: 'list mt12'}, groups.map(g => {
		const parts = [];
		if (g.got.length) parts.push(L(`हमें दिया ${fmt(g.got[0].amt)} (${g.got[0].date.slice(0, 4)} ${occLabel(g.got[0].occasion)})`, `gave us ${fmt(g.got[0].amt)} (${g.got[0].date.slice(0, 4)} ${occLabel(g.got[0].occasion)})`));
		if (g.gave.length) parts.push(L(`हमने दिया ${fmt(g.gave[0].amt)} (${g.gave[0].date.slice(0, 4)} ${occLabel(g.gave[0].occasion)})`, `we gave ${fmt(g.gave[0].amt)} (${g.gave[0].date.slice(0, 4)} ${occLabel(g.gave[0].occasion)})`));
		return bt('row', {'data-person': g.person, onclick: () => personSheet(g.person)},
			h('div', {class: 'row-ic', 'aria-hidden': 1}, '🎁'),
			dv('row-main', dv('row-t', g.person + ' →'), dv('row-s', parts.join(' · '))));
	})) : h('div', {class: 'list mt12'}, emptyState('🎁', shQuery ? L('इस नाम से कुछ नहीं मिला|Nothing for this name') : L('शगुन / व्यवहार की डायरी|Gift register'), L('किसने कितना दिया — ताकि सही रकम लौटाएँ।|Who gave how much — so you return the right amount.')));
	return h('div', null, search, list, addBtn);
}
function personSheet(person) {
	return sheet({
		id: 'person', title: person, live: true, cls: 'tall',
		body: api => {
			const g = C.shagunByPerson(S.state(), person).find(x => C.normName(x.person) === C.normName(person));
			if (!g) {setTimeout(() => api.close(), 0); return null;}
			const all = [...g.got, ...g.gave].sort((a, b) => (a.date < b.date ? 1 : -1));
			return h('div', {class: 'pad'},
				dv('sumcard', h('div', null, dv('k', L('हमें मिला|We got')), dv('v num', fmt(g.gotSum))), h('div', null, dv('k', L('हमने दिया|We gave')), dv('v num', fmt(g.gaveSum)))),
				h('div', {class: 'list mt12'}, all.map(x => bt('row', {onclick: () => shagunEdit(x.id)},
					h('div', {class: 'row-ic', 'aria-hidden': 1}, x.dir === 'got' ? '📥' : '📤'),
					dv('row-main', dv('row-t', (x.dir === 'got' ? L('हमें दिया|Gave us') : L('हमने दिया|We gave')) + ' · ' + occLabel(x.occasion)), dv('row-s', C.fmtDate(x.date, lang(), {year: true}) + (x.note ? ' · ' + x.note : ''))),
					sp('amt num', fmt(x.amt))))),
				bt('btn pri block mt14', {onclick: () => pro('registers', () => G.openAdd({type: 'shagun', person}))}, icon('plus', 20), L('इनके लिए शगुन लिखें|Add shagun for them')));
		},
	});
}
function shagunEdit(id) {
	const x0 = S.get(id); if (!x0) return null;
	const v = {...x0};
	return sheet({
		id: 'shedit', title: L('शगुन बदलें|Edit shagun'),
		body: () => h('div', {class: 'pad'},
			field(L('नाम|Name'), h('input', {class: 'inp', value: v.person, oninput: e => {v.person = e.target.value;}})),
			field(L('रकम|Amount'), moneyInput(v.amt, p => {v.amt = p || 0;})),
			field(L('मौक़ा|Occasion'), chips(C.OCCASIONS.map(([k, hi, en]) => [k, L(hi, en)]), v.occasion, k => {v.occasion = k;})),
			field(L('तारीख|Date'), h('input', {class: 'inp', type: 'date', value: v.date, onchange: e => {v.date = e.target.value || v.date;}})),
			field(L('नोट|Note'), h('input', {class: 'inp', value: v.note || '', oninput: e => {v.note = e.target.value;}}))),
		foot: api => h('div', {class: 'btnrow'},
			bt('btn ghost', {onclick: once(async () => {const p = S.get(id); const t = p.txId ? S.get(p.txId) : null; await api.close(); S.delMany([id, t && t.id].filter(Boolean)); toast(L('हटा दिया|Deleted'), {undo: () => S.putMany([p, t].filter(Boolean))});})}, L('हटाएँ|Delete')),
			bt('btn pri', {onclick: once(async () => {
				if (!pro('registers', () => true)) return;
				if (!(v.amt > 0) || !v.person.trim()) {toast(L('नाम और रकम लिखें|Enter name and amount')); return;}
				const p = S.get(id); S.put({...p, ...v, person: v.person.trim()});
				if (p.txId && S.get(p.txId)) {const t = S.get(p.txId); S.put({...t, amt: v.amt, date: v.date});}
				await api.close(); toast(L('बदल दिया ✓|Saved ✓'));
			})}, L('सेव करें|Save'))),
	});
}
