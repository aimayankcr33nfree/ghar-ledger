// आज / Today
import * as S from './store.js';
import * as C from './core.js';
import {h, dv, sp, bt, L, lang, fmt, sheet, toast, once, icon, longPress, emptyState} from './ui.js';
import {G, today, me, familyName, initials, came, qtyText, relDate, myName, plan} from './ctx.js';
import {toggleMark, qtyPicker, payBillSheet, paySvcSheet, txRow} from './ops.js';

export function header(title, sub) {
	const s = S.settings(), state = G.syncState ? G.syncState() : 'off';
	const dot = h('span', {class: 'sync ' + state, 'aria-hidden': 1});
	const offline = navigator.onLine === false;
	return h('header', {class: 'top'},
		dv('top-t', h('h1', null, title), sub ? dv('sub', sub) : null),
		G.syncChip ? G.syncChip() : offline ? bt('pill warn offpill', {id: 'offline-pill', onclick: () => G.syncSheet && G.syncSheet()}, L('ऑफ़लाइन · फ़ोन में सुरक्षित|Offline · safe on phone')) : null, // sync chip: home.js (MAKER-B)
		bt('avatar', {'aria-label': L('सिंक की जानकारी|Sync status'), onclick: () => G.syncSheet && G.syncSheet()}, initials(s.familyName || myName()), dot));
}

// the one daily number. Its parts use the same names as the Month tab: "रोज़ के लिए" is never called "बचा".
function heroCard(Lm, big) {
	let cls = 'hero', label = L('आज|Today'), num, small, sub, link = null, bar = null;
	if (Lm.status === 'noplan') {
		num = fmt(Lm.outToday); small = L('खर्च हुआ|spent');
		sub = L(`इस महीने अब तक ${fmt(Lm.totals.gaya)} खर्च`, `${fmt(Lm.totals.gaya)} spent this month`);
		link = h('span', {class: 'hero-link', role: 'link', onclick: e => {e.stopPropagation(); G.openPlan && G.openPlan('income');}}, L('आमदनी लिखें → रोज़ की सीमा देखें|Set income → see your daily limit'));
	} else if (Lm.lastDay && Lm.poolLeft >= 0) {
		cls += ' last';
		label = L('महीने का आख़िरी दिन|Last day of the month');
		num = fmt(Lm.poolLeft); small = L('रोज़ के पैसे में से बचे|left from the daily money');
		sub = L('कल से नया महीना — बचे पैसे गुल्लक में डाल सकते हैं|A new month starts tomorrow — this can go to savings');
	} else if (Lm.status === 'red') {
		cls += ' red';
		if (Lm.pool <= 0 && Lm.varToday <= Lm.limit) {
			num = fmt(0); small = L('और खर्च की गुंजाइश नहीं|nothing left to spend');
			sub = L(`रोज़ के पैसे से ${fmt(-Lm.poolLeft)} ज़्यादा खर्च हो चुका · ${Lm.daysLeft} दिन बाक़ी`, `Daily money overspent by ${fmt(-Lm.poolLeft)} · ${Lm.daysLeft} days left`);
		} else {
			num = fmt(Lm.over); small = L('ज़्यादा हो गया|over the limit');
			sub = Lm.tomorrow != null ? L(`कल ${fmt(Lm.tomorrow)} · रोज़ के लिए ${fmt(Math.max(0, Lm.poolLeft))} · ${Lm.daysLeft} दिन`, `Tomorrow ${fmt(Lm.tomorrow)} · ${fmt(Math.max(0, Lm.poolLeft))} for daily spends · ${Lm.daysLeft} days`)
				: L('कल से नया महीना|New month starts tomorrow');
		}
	} else {
		if (Lm.status === 'amber') cls += ' amber';
		num = fmt(Lm.left); small = L('आज और खर्च कर सकते हैं|you can still spend today');
		sub = L(`इस महीने रोज़ के लिए ${fmt(Lm.poolLeft)} · ${Lm.daysLeft} दिन`, `${fmt(Lm.poolLeft)} for daily spends this month · ${Lm.daysLeft} days`);
		const pct = Lm.limit > 0 ? Math.min(1, Lm.varToday / Lm.limit) : 0;
		bar = h('div', {class: 'hero-bar', 'aria-hidden': 1}, h('i', {style: {width: (pct * 100).toFixed(1) + '%'}}));
	}
	return h('button', {class: cls + (big ? ' elder-hero' : ''), id: 'hero', 'data-status': Lm.lastDay ? 'last' : Lm.status, onclick: () => openExplain(), 'aria-label': `${label} ${num} ${small}. ${sub}. ${L('हिसाब देखने के लिए टैप करें|Tap to see the math')}`},
		dv('hero-l', h('span', null, label), sp('hero-how', L('कैसे? ⓘ|How? ⓘ'))),
		h('div', {class: 'hero-n num' + (num.length > 10 && !big ? ' mid' : '')}, num),
		h('div', {class: 'hero-s', style: {fontWeight: 600, marginTop: '-2px'}}, small),
		big ? null : h('div', {class: 'hero-s mt6'}, sub),
		bar, link);
}
// "बचा ₹27,090 = रोज़ के लिए ₹13,144 + बाक़ी बिल/सेवाएँ ₹13,946" — the same line as on the Month tab
export function reconLine(r, id) {
	if (!r) return null;
	const parts = C.reconParts(r, lang());
	return h('p', {class: 'recon', id: id || 'recon'},
		sp('recon-b', `${L('बचा|Left')} ${fmt(r.bacha)}`), ' = ',
		parts.map(([l, v], i) => h('span', {class: 'recon-p'}, i ? (v < 0 ? ' − ' : ' + ') : (v < 0 ? '−' : ''), `${l} `, h('b', {class: 'num'}, fmt(Math.abs(v))))));
}

export function openExplain() {
	const st = S.state(), td = today(), Lm = C.todayLimit(st, td);
	return sheet({
		id: 'explain', title: L('नंबर कैसे बनता है|How the number is made'), cls: 'tall',
		body: () => explainBody(Lm),
		foot: api => bt('btn ghost block', {onclick: () => api.close()}, L('समझ गया|Got it')),
	});
}
export function explainBody(Lm) {
	const T = Lm.totals;
	if (Lm.status === 'noplan') {
		return h('div', {class: 'pad'},
			h('p', {class: 'lead'}, L('अभी आमदनी नहीं लिखी है, इसलिए हम सिर्फ़ खर्च गिन रहे हैं।|No income is set yet, so we only count spends.')),
			dv('box', xrow('', L('आज का खर्च|Spent today'), Lm.outToday), xrow('', L('इस महीने अब तक (गया)|This month so far (spent)'), T.gaya)),
			h('p', {class: 'note mt14'}, L('आमदनी लिखते ही रोज़ की सीमा दिखेगी: (आमदनी − बचत − बिल − सेवाएँ − पहले का खर्च) ÷ बचे दिन।|Set income to see a daily limit: (income − savings − bills − services − earlier spends) ÷ days left.')),
			bt('btn pri block mt14', {onclick: () => G.openPlan && G.openPlan('income')}, L('आमदनी लिखें|Set income')));
	}
	const lines = C.explainLines(Lm, lang());
	return h('div', {class: 'pad'},
		h('p', {class: 'lead'}, L('पहले बचत, बिल और सेवाओं का पैसा अलग — फिर बचा पैसा बाक़ी दिनों में बराबर।|Savings, bills and home help go aside first; the rest is split over the days left.')),
		dv('box xl', lines.map(x => h('div', {class: 'xl-r' + (x.op === '=' ? ' eq' : '')},
			sp('xl-op', x.op), dv('xl-m', dv('xl-l', x.label), x.sub ? dv('xl-s', x.sub) : null), sp('xl-a', fmt(x.amt))))),
		h('div', {class: 'box mt14'},
			h('div', {class: 'xl-l', style: {marginBottom: '6px'}}, L('महीना टैब से मिलान|Matches the Month tab')),
			dv('note', `${L('आया|In')} ${fmt(T.aaya)} − ${L('बचाया|Saved')} ${fmt(T.bachaya)} − ${L('गया|Spent')} ${fmt(T.gaya)} = ${L('बचा|Left')} ${fmt(T.bacha)}`),
			reconLine(Lm.recon, 'recon-how'),
			h('div', {class: 'note mt6'}, L('हर रुपया एक ही बार गिना जाता है: पिछले महीने के जो बिल/सेवाएँ इस महीने चुकाए या बाक़ी हैं, वे इसी महीने अलग रखे जाते हैं। बचत कभी खर्च में नहीं गिनी जाती।|Every rupee is counted once: last month\'s bills and help that are paid or still due this month are set aside in this month. Savings never count as spending.'))));
}
function xrow(op, label, amt) {return dv('xl-r', sp('xl-op', op), dv('xl-m', dv('xl-l', label)), sp('xl-a', fmt(amt)));}

/* cards (at most a few, most important first) */
function card(id, cls, title, sub, btns) {
	return h('div', {class: 'nudge ' + (cls || ''), id},
		dv('salary-t', title), sub ? dv('salary-s', sub) : null,
		btns && btns.length ? h('div', {class: 'btnrow mt12'}, btns) : null);
}
function paydayDate(s, td) {const y = +td.slice(0, 4), m = +td.slice(5, 7); return C.ymd(y, m, Math.min(s.payday || 1, C.dim(y, m)));}
function salaryCard(Lm) {
	const st = S.state(), s = st.settings, td = today();
	if (!(s.income > 0)) return null;
	const pd = paydayDate(s, td);
	if (td < pd || S.devGet('salaryLater') === td) return null;
	const since = pd < Lm.cycle.start ? Lm.cycle.start : C.addDays(pd, -5);
	const got = st.tx.some(t => t.type === 'in' && t.date >= since && (t.cat === 'salary' || t.amt >= s.income * 0.5));
	if (got) return null;
	const target = C.saveTarget(st, Lm.cycle);
	const saveCat = (() => {const u = C.catUsage(st, 'save', td); let best = 'sip', n = -1; for (const [k, v] of u) if (v > n) {best = k; n = v;} return u.size ? best : 'sip';})();
	const go = once(() => {
		const a = S.put({id: C.newId('t'), kind: 'tx', type: 'in', amt: s.income, cat: 'salary', note: '', date: td, who: me(), mode: 'upi', at: S.now()});
		const b = target > 0 ? S.put({id: C.newId('t'), kind: 'tx', type: 'save', amt: target, cat: saveCat, note: L('पहले बचत|Save first'), date: td, who: me(), mode: 'upi', at: S.now() + 1}) : null;
		toast(b ? L(`${fmt(s.income)} आमदनी · ${fmt(target)} बचत लिखी`, `Income ${fmt(s.income)} · saved ${fmt(target)}`) : L(`${fmt(s.income)} आमदनी लिखी`, `Income ${fmt(s.income)} added`),
			{undo: () => S.delMany([a.id, b && b.id].filter(Boolean)), action: () => G.openAdd({editId: a.id}), actLabel: L('बदलें|Edit')});
	});
	return card('salary-card', 'gold', target > 0 ? L(`तनख़्वाह आई? पहले ${fmt(target)} बचत में डालें`, `Salary in? Save ${fmt(target)} first`) : L('तनख़्वाह आई?|Salary in?'),
		L(`${fmt(s.income)} आमदनी${target > 0 ? ` और ${fmt(target)} बचत` : ''} एक टैप में लिखें — बाद में बदल सकते हैं`, `Record ${fmt(s.income)} income${target > 0 ? ` and ${fmt(target)} saving` : ''} in one tap — editable later`),
		[bt('btn pri sm', {style: {flex: 2}, onclick: go}, target > 0 ? L('आमदनी लिखें + बचत की|Add income + save') : L('आमदनी लिखें|Add income')),
			bt('btn ghost sm', {onclick: () => S.devSet({salaryLater: td})}, L('बाद में|Later'))]);
}
function lastDayCard(Lm) {
	if (!Lm.lastDay || !Lm.hasPlan || Lm.poolLeft < 100 || S.devGet('lastDayDone') === Lm.cycle.key) return null;
	// the planned saving not yet put aside is part of what goes in (otherwise the first rupees would only fill the target)
	const saveLeft = Math.max(0, Lm.recon.saveLeft || 0), amt = Math.floor((Lm.poolLeft + saveLeft) / 100) * 100;
	const why = saveLeft ? L(`रोज़ के पैसे में से बचे ${fmt(Lm.poolLeft)} + तय बचत जो अभी नहीं डाली ${fmt(saveLeft)}`, `${fmt(Lm.poolLeft)} left from the daily money + ${fmt(saveLeft)} planned saving not yet put aside`) : '';
	return card('lastday-card', 'gold', L(`${fmt(amt)} गुल्लक में डालें?`, `Move ${fmt(amt)} to savings?`),
		(why ? why + '. ' : '') + L('बाक़ी बिल/सेवाओं का पैसा पहले से अलग रखा है।|Money for unpaid bills and help is already kept aside.'),
		[bt('btn gold sm', {id: 'lastday-save', style: {flex: 2}, onclick: () => G.saveLeftover && G.saveLeftover({amt, explain: why, date: today(), key: 'lastDayDone', cycle: Lm.cycle.key, title: L('गुल्लक में डालें|Move to savings'), note: L('महीने के आख़िर में बचे|Left at month end')})}, L(`${fmt(amt)} गुल्लक में डालें`, `Save ${fmt(amt)}`)),
			bt('btn ghost sm', {onclick: () => S.devSet({lastDayDone: Lm.cycle.key})}, L('रहने दें|Not now'))]);
}
function rotatedCard() {
	if (!(G.syncInfo && G.syncInfo().state === 'rotated')) return null;
	return card('rotated-card', 'warn', L('इस परिवार का कोड बदल दिया गया है|This family\'s code was changed'),
		L('सिंक रुक गया है। परिवार के किसी सदस्य से नया कोड या न्योता लिंक लेकर दोबारा जुड़ें — इस फ़ोन का हिसाब सुरक्षित है।|Sync has stopped. Ask a family member for the new code or invite link and join again — this phone\'s data is safe.'),
		[bt('btn pri sm', {id: 'rotated-join', onclick: () => G.joinOther && G.joinOther()}, L('नया कोड डालें|Enter new code'))]);
}
// trial-ending / renewal card: text and rules live in home.js trialNudge() (MAKER-B)
function trialCard() {
	const n = G.trialNudge ? G.trialNudge() : null;
	if (!n || !n.show) return null;
	return card(n.id, n.cls, n.title, n.text, [bt('btn pri sm', {id: n.actionId, style: {flex: 2}, onclick: n.action}, n.actionLabel), bt('btn ghost sm', {id: n.dismissId, onclick: n.dismiss}, n.dismissLabel)]);
}
function reminderCard() {
	if (!G.reminders) return null;
	const R = G.reminders();
	if (!R.canAsk) return null;
	return card('remind-card', '', L('रोज़ रात 9 बजे याद दिलाएँ?|Remind you at 9 pm every day?'),
		L('"आज का हिसाब", तनख़्वाह के दिन "पहले बचत", और दूधवाले-कामवाली का बाक़ी — फ़ोन पर सूचना आएगी।|"Today\'s accounts", "save first" on payday, and helpers\' dues — as phone notifications.'),
		[bt('btn pri sm', {id: 'remind-yes', style: {flex: 2}, onclick: () => R.enable()}, L('हाँ, याद दिलाएँ|Yes, remind me')),
			bt('btn ghost sm', {id: 'remind-no', onclick: () => R.decline()}, L('नहीं|No'))]);
}
function eveningCard(td) {
	const st = S.state(), hr = new Date(S.now()).getHours();
	if (hr < 20 || S.devGet('eveningDay') === td || st.tx.some(t => t.date === td && !t.auto)) return null;
	return card('evening-card', '', L('आज का हिसाब लिखा?|Written today\'s accounts?'), L('एक मिनट लगेगा — दूध, सब्ज़ी, ऑटो…|Takes a minute — milk, vegetables, auto…'),
		[bt('btn pri sm', {style: {flex: 2}, onclick: () => G.openAdd({type: 'out'})}, L('खर्च लिखें|Write a spend')), bt('btn ghost sm', {onclick: () => S.devSet({eveningDay: td})}, L('आज कुछ नहीं|Nothing today'))]);
}
function cards(Lm, td) {
	const top = [rotatedCard(), G.closeCard ? G.closeCard() : null, lastDayCard(Lm), salaryCard(Lm)].filter(Boolean);
	const soft = [trialCard(), reminderCard(), eveningCard(td)].filter(Boolean).slice(0, 1);
	return [...top, ...soft];
}

/* helpers' attendance: the button toggles; tapping the name opens the details */
export function attendanceList(td, o = {}) {
	const st = S.state();
	const svcs = st.svcs.filter(s => s.active !== false && C.svcActiveOn(s, td));
	if (!svcs.length) return null;
	return h('div', {class: 'list' + (o.big ? ' att-big' : ''), id: 'attendance'}, svcs.map(svc => {
		const q = C.qtyOn(st, svc, td), mk = C.markOf(st, svc, td);
		let label, cls = 'att-btn', sub;
		if (svc.type === 'fixed') {
			label = (q > 0 ? '✓ ' : '✕ ') + came(svc, q > 0); if (!(q > 0)) cls += ' no';
			const bl = C.svcBill(st, svc, C.mkey(td), {upto: td});
			sub = L(`इस महीने ${bl.leaves} छुट्टी`, `${bl.leaves} ${bl.leaves === 1 ? 'leave' : 'leaves'} this month`);
		} else if (svc.type === 'piece') {
			label = q > 0 ? '✓ ' + qtyText(q, svc.unit) : (mk === 0 ? '✕ ' + came(svc, false) : '+ ' + L('कितने?|Count')); if (!(q > 0)) cls += mk === 0 ? ' no' : ' zero';
			sub = `${fmt(C.rateOn(svc, td))} / ${C.unitLabel(svc.unit, lang(), 1) || L('नग|piece')}`;
		} else {
			label = q > 0 ? '✓ ' + qtyText(q, svc.unit) : '✕ ' + came(svc, false); if (!(q > 0)) cls += ' no';
			sub = `${qtyText(svc.qty || 0, svc.unit)} ${L('रोज़|a day')}`;
		}
		const more = () => (svc.type === 'fixed' ? G.serviceSheet && G.serviceSheet(svc.id) : qtyPicker(svc, td));
		const row = h('div', {class: 'att', 'data-svc': svc.id},
			bt('att-name', {'aria-label': `${svc.name}: ${L('बदलें या पूरा महीना देखें|change or see the month')}`, onclick: more},
				h('span', {class: 'row-ic', 'aria-hidden': 1}, svc.emoji || '🏠'),
				h('span', {class: 'att-t'}, h('span', {class: 'att-n'}, svc.name), o.big ? null : h('span', {class: 'row-s'}, sub))),
			h('button', {class: cls, 'aria-pressed': q > 0 ? 'true' : 'false', 'aria-label': `${svc.name}: ${label}. ${L('बदलने के लिए टैप करें|Tap to change')}`, onclick: () => toggleMark(svc, td)}, label));
		if (svc.type !== 'fixed') longPress(row, () => qtyPicker(svc, td));
		return row;
	}));
}

function duesList(td) {
	const st = S.state(), D = C.dues(st, td);
	if (!D.length) return null;
	return h('div', {class: 'list', id: 'dues'}, D.map(d => {
		const isBill = d.kind === 'bill', name = isBill ? d.bill.name : `${d.svc.name} — ${C.MONTHS[lang() === 'en' ? 'en' : 'hi'][+d.month.slice(5) - 1]}`;
		let when;
		if (isBill) when = d.days < 0 ? L(`${-d.days} दिन से बाक़ी`, `${-d.days} days overdue`) : d.days === 0 ? L('आज|Today') : d.days === 1 ? L('कल|Tomorrow') : L(`${C.fmtDate(d.due, 'hi', {short: true})} · ${d.days} दिन बाद`, `${C.fmtDate(d.due, 'en', {short: true})} · in ${d.days} days`);
		else when = L('हिसाब बाक़ी|Account due');
		return h('div', {class: 'row', 'data-due': d.key},
			h('div', {class: 'row-ic', 'aria-hidden': 1}, isBill ? (d.bill.emoji || '🧾') : (d.svc.emoji || '🏠')),
			dv('row-main', dv('row-t', name, ' ', h('span', {class: 'num', style: {fontWeight: 600, color: 'var(--ink2)'}}, '· ' + fmt(d.amt))),
				dv('row-s', d.prev ? sp('pill warn', L('पिछले महीने का|From last month')) : h('span', {class: d.overdue ? 'up' : ''}, when))),
			bt('paybtn', {onclick: () => (isBill ? payBillSheet(d.bill, d.due) : paySvcSheet(d.svc, d.month))}, isBill ? L('भर दिया|Paid') : L('चुकाया|Paid')));
	}));
}

function todaysList(td, big) {
	const st = S.state(), list = st.tx.filter(t => t.date === td).slice().reverse();
	if (!list.length) return dv('list' + (big ? ' big-list' : ''), emptyState('🪷', L('आज अभी कुछ नहीं लिखा|Nothing written today'), big ? L('नीचे "खर्च लिखें" दबाएँ|Tap "Add spend" below') : L('नीचे + दबाकर पहला खर्च लिखें|Tap + below to write the first spend')));
	const out = list.filter(t => t.type === 'out').reduce((a, t) => a + t.amt, 0);
	return h('div', {class: 'list' + (big ? ' big-list' : ''), id: 'today-list'}, list.map(t => txRow(t)),
		dv('row-total', h('span', null, L('आज कुल खर्च|Spent today')), sp('num', fmt(out))));
}
function proofLine(st, td) {
	const ys = C.yearSaved(st, td), sk = C.streak(st, td);
	if (!ys && sk < 2) return null;
	return h('p', {class: 'proof', id: 'proof'},
		ys ? h('span', null, L('इस साल अब तक |Saved this year: '), h('b', {class: 'num'}, fmt(ys)), L(' बचाया|')) : null,
		ys && sk >= 2 ? ' · ' : null,
		sk >= 2 ? h('span', null, L('लगातार |'), h('b', {class: 'num'}, String(sk)), L(' दिन से हिसाब लिखा| days in a row of writing')) : null);
}

export function renderToday() {
	const st = S.state(), td = today(), Lm = C.todayLimit(st, td);
	if (S.devGet('elder')) return renderElder(st, td, Lm);
	const att = attendanceList(td), dl = duesList(td);
	return h('frag', null,
		header(C.fmtDate(td, lang(), {weekday: true}), familyName()),
		heroCard(Lm),
		Lm.hasPlan ? reconLine(Lm.recon, 'recon-today') : null,
		cards(Lm, td),
		att ? h('section', {class: 'sec'}, dv('sec-h', h('h3', null, L('आज का खाता', "Today's helpers")), sp('meta', L('नाम दबाएँ = बदलें|Tap a name to change'))), att) : null,
		dl ? h('section', {class: 'sec'}, dv('sec-h', h('h3', null, L('देना है|To pay')), sp('meta', L('अगले 5 दिन + बाक़ी|Next 5 days + overdue'))), dl) : null,
		h('section', {class: 'sec'}, dv('sec-h', h('h3', null, L('आज के खर्च', "Today's entries"))), todaysList(td)),
		proofLine(st, td));
}

// elder mode (free): big number, helpers as big buttons, two big actions, today's list in big type
function renderElder(st, td, Lm) {
	const att = attendanceList(td, {big: true});
	return h('frag', null,
		header(C.fmtDate(td, lang(), {weekday: true}), familyName()),
		heroCard(Lm, true),
		[rotatedCard(), G.closeCard ? G.closeCard() : null].filter(Boolean),
		att ? h('section', {class: 'sec'}, dv('sec-h', h('h3', null, L('आज कौन आया?|Who came today?'))), att) : null,
		h('div', {class: 'bigrow'},
			bt('bigbtn pri', {id: 'elder-add', onclick: () => G.openAdd({type: 'out', mode: 'cash'})}, icon('plus', 30), L('खर्च लिखें|Add spend')),
			bt('bigbtn alt', {id: 'elder-voice', onclick: () => G.openVoice && G.openVoice()}, sp('', '🎤'), L('बोलकर|Speak'))),
		h('section', {class: 'sec'}, dv('sec-h', h('h3', null, L('आज के खर्च', "Today's spends"))), todaysList(td, true)));
}
