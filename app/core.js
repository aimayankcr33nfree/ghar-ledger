// घर खर्च — pure logic. Runs in the browser and in Node (no DOM, no storage).
// All money is integer paise. All dates are local 'YYYY-MM-DD' strings.

export const VERSION = '3.1.0';
export const TRIAL_DAYS = 30;
export const FREE = {svc: 1, bill: 3};
export const PRICE = {Y: 39900, M: 4900};

const p2 = n => String(n).padStart(2, '0');

/* money */
const DEV_DIGITS = '०१२३४५६७८९';
export function devToAsc(s) {return String(s).replace(/[०-९]/g, d => DEV_DIGITS.indexOf(d));}

export function groupIN(intStr) {
	const s = String(intStr);
	if (s.length <= 3) return s;
	const last3 = s.slice(-3); let rest = s.slice(0, -3);
	const parts = [];
	while (rest.length > 2) {parts.unshift(rest.slice(-2)); rest = rest.slice(0, -2);}
	if (rest) parts.unshift(rest);
	return parts.join(',') + ',' + last3;
}

// paise -> "₹1,23,456" (paise only when non-zero). Never NaN, never "₹-0".
export function fmt(p, o = {}) {
	if (typeof p !== 'number' || !isFinite(p)) p = 0;
	p = Math.round(p);
	let a = Math.abs(p);
	if (o.round) a = Math.round(a / 100) * 100;
	const r = Math.floor(a / 100), ps = a % 100;
	if (r === 0 && ps === 0) return (o.cur === false ? '' : '₹') + '0';
	const s = groupIN(String(r)) + (ps ? '.' + p2(ps) : '');
	const sign = p < 0 ? '−' : (o.plus ? '+' : '');
	return sign + (o.cur === false ? '' : '₹') + s;
}
// plain number for CSV: 1234.50
export const rupeesStr = p => (Math.round(p) / 100).toFixed(2);

// "₹1,200.50" / "1,200" / "Rs. 500" / "१२०" -> paise; null if invalid. Max 9 rupee digits, max 2 paise digits.
export function parseAmount(v) {
	if (v == null) return null;
	if (typeof v === 'number') return isFinite(v) && v >= 0 ? Math.round(v * 100) : null;
	let s = devToAsc(String(v)).trim().toLowerCase();
	s = s.replace(/₹|inr|rs\.?|rupees?|रु\.?|रुपये|रुपए|रुपया/g, '').replace(/[,\s\u00a0]/g, '').replace(/\/-$/, '');
	if (s === '' || s === '.' || !/^\d*\.?\d*$/.test(s)) return null;
	const [i, f = ''] = s.split('.');
	if (i.replace(/^0+/, '').length > 9 || f.length > 2) return null;
	return (parseInt(i || '0', 10)) * 100 + parseInt((f + '00').slice(0, 2), 10);
}

/* dates */
export const dnum = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
export const dstr = n => {const d = new Date(Math.round(n) * 864e5); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate());};
export const addDays = (s, n) => dstr(dnum(s) + n);
export const diffDays = (a, b) => dnum(b) - dnum(a);
export const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1..12
export const dow = s => new Date(dnum(s) * 864e5).getUTCDay();
export const ymd = (y, m, d) => y + '-' + p2(m) + '-' + p2(d);
export const mkey = s => s.slice(0, 7);
export function todayStr(t = Date.now()) {const d = new Date(t); return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());}
export function addMonths(s, n, day) {
	let y = +s.slice(0, 4), m = +s.slice(5, 7) + n; const d = day || +s.slice(8, 10);
	y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1;
	return ymd(y, m, Math.min(d, dim(y, m)));
}
export function shiftMonthKey(k, n) {return addMonths(k + '-01', n).slice(0, 7);}
export function monthsBetween(a, b) {return (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));}
export function eachDay(a, b, fn) {for (let n = dnum(a), e = dnum(b); n <= e; n++) fn(dstr(n));}

export const MONTHS = {
	hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
	en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
export const MON3 = {
	hi: ['जन॰', 'फ़र॰', 'मार्च', 'अप्रै॰', 'मई', 'जून', 'जुला॰', 'अग॰', 'सितं॰', 'अक्टू॰', 'नवं॰', 'दिसं॰'],
	en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
export const DAYS = {
	hi: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
	en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
export const DAY1 = {hi: ['र', 'सो', 'मं', 'बु', 'गु', 'शु', 'श'], en: ['S', 'M', 'T', 'W', 'T', 'F', 'S']};
const L = lang => (lang === 'en' ? 'en' : 'hi');
export function fmtDate(s, lang, o = {}) {
	if (!s) return '';
	const l = L(lang), y = +s.slice(0, 4), m = +s.slice(5, 7), d = +s.slice(8, 10);
	let r = d + ' ' + (o.short ? MON3 : MONTHS)[l][m - 1];
	if (o.year) r += ' ' + y;
	if (o.weekday) r = DAYS[l][dow(s)] + ', ' + r;
	return r;
}
export function monthLabel(k, lang) {return MONTHS[L(lang)][+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4);}
export function relDay(s, today, lang) {
	const n = diffDays(s, today), en = lang === 'en';
	if (n === 0) return en ? 'Today' : 'आज';
	if (n === 1) return en ? 'Yesterday' : 'कल';
	return fmtDate(s, lang, {short: true, year: s.slice(0, 4) !== today.slice(0, 4)});
}

/* categories & templates */
// t: out | in | save
export const DEFAULT_CATS = [
	['ration', '🛒', 'राशन', 'Groceries', 'out'], ['veg', '🥬', 'सब्ज़ी-फल', 'Veg & fruit', 'out'],
	['milk', '🥛', 'दूध-डेयरी', 'Milk & dairy', 'out'], ['eatout', '🍽️', 'बाहर खाना', 'Eating out', 'out'],
	['fuel', '⛽', 'पेट्रोल-गाड़ी', 'Fuel & car', 'out'], ['travel', '🛺', 'आना-जाना', 'Travel', 'out'],
	['health', '💊', 'दवा-डॉक्टर', 'Medicine', 'out'], ['edu', '📚', 'पढ़ाई', 'Education', 'out'],
	['household', '🧺', 'घर का सामान', 'Household', 'out'], ['clothes', '👕', 'कपड़े', 'Clothes', 'out'],
	['utility', '💡', 'बिजली-पानी-गैस', 'Utilities', 'out'], ['phone', '📱', 'मोबाइल-नेट', 'Phone & net', 'out'],
	['rent', '🏠', 'किराया-EMI', 'Rent & EMI', 'out'], ['insurance', '🛡️', 'बीमा', 'Insurance', 'out'],
	['services', '🧹', 'घरेलू सेवाएँ', 'Home help', 'out'], ['kids', '🧸', 'बच्चे', 'Kids', 'out'],
	['festival', '🪔', 'त्योहार-पूजा', 'Festivals', 'out'], ['gift', '🎁', 'शगुन-उपहार', 'Gifts', 'out'],
	['fun', '🎬', 'घूमना-मनोरंजन', 'Outings', 'out'], ['care', '💇', 'सैलून-सौंदर्य', 'Self care', 'out'],
	['other', '📦', 'अन्य', 'Other', 'out'], ['opening', '🗒️', 'पहले का खर्च', 'Earlier spends', 'out', 1],
	['salary', '💼', 'तनख़्वाह', 'Salary', 'in'], ['business', '🏪', 'धंधा-दुकान', 'Business', 'in'],
	['rentin', '🏘️', 'किराया मिला', 'Rent received', 'in'], ['interest', '📈', 'ब्याज', 'Interest', 'in'],
	['giftin', '🎁', 'शगुन मिला', 'Gift received', 'in'], ['otherin', '💰', 'अन्य आमदनी', 'Other income', 'in'],
	['sip', '📈', 'SIP-म्यूचुअल फ़ंड', 'SIP / MF', 'save'], ['rd', '🏦', 'RD-FD', 'RD & FD', 'save'],
	['ppf', '🧾', 'PPF-PF', 'PPF & PF', 'save'], ['gold', '🪙', 'सोना', 'Gold', 'save'],
	['gullak', '🏺', 'गुल्लक', 'Piggy bank', 'save'],
].map(([id, e, hi, en, t, sys]) => ({id, e, hi, en, t, ...(sys ? {sys: 1} : {})}));

export const BILL_TPL = [
	{tpl: 'rent', e: '🏠', hi: 'किराया', en: 'Rent', cat: 'rent', cycle: 'm', dueDay: 5},
	{tpl: 'emi', e: '🏦', hi: 'होम/कार EMI', en: 'Home/Car EMI', cat: 'rent', cycle: 'm', dueDay: 10, autopay: true},
	{tpl: 'power', e: '💡', hi: 'बिजली', en: 'Electricity', cat: 'utility', cycle: 'm', dueDay: 15},
	{tpl: 'recharge', e: '📱', hi: 'मोबाइल रिचार्ज', en: 'Mobile recharge', cat: 'phone', cycle: '28d'},
	{tpl: 'net', e: '🌐', hi: 'इंटरनेट', en: 'Internet', cat: 'phone', cycle: 'm', dueDay: 10},
	{tpl: 'gas', e: '🔥', hi: 'गैस सिलेंडर', en: 'Gas cylinder', cat: 'utility', cycle: 'need'},
	{tpl: 'school', e: '🎒', hi: 'स्कूल फ़ीस', en: 'School fees', cat: 'edu', cycle: '3m'},
	{tpl: 'lic', e: '🛡️', hi: 'बीमा/LIC', en: 'Insurance/LIC', cat: 'insurance', cycle: 'y'},
	{tpl: 'society', e: '🏢', hi: 'सोसाइटी मेंटेनेंस', en: 'Society maintenance', cat: 'rent', cycle: 'm', dueDay: 10},
];
export const SVC_TPL = [
	{tpl: 'milk', e: '🥛', hi: 'दूधवाला', en: 'Milkman', type: 'qty', unit: 'L', qty: 1, cat: 'milk', call: ['दूधवाले भैया', 'Milkman bhaiya']},
	{tpl: 'maid', e: '🧹', hi: 'कामवाली', en: 'Maid', type: 'fixed', freeLeaves: 2, cat: 'services', call: ['दीदी', 'Didi']},
	{tpl: 'cook', e: '👩‍🍳', hi: 'खाना बनाने वाली', en: 'Cook', type: 'fixed', freeLeaves: 2, cat: 'services', call: ['दीदी', 'Didi']},
	{tpl: 'paper', e: '📰', hi: 'अख़बार', en: 'Newspaper', type: 'qty', unit: 'paper', qty: 1, cat: 'household', call: ['अख़बार वाले भैया', 'Newspaper bhaiya']},
	{tpl: 'press', e: '👔', hi: 'प्रेस वाला', en: 'Ironing (press)', type: 'piece', unit: 'pc', qty: 0, cat: 'services', call: ['प्रेस वाले भैया', 'Press bhaiya']},
	{tpl: 'water', e: '💧', hi: 'पानी कैन', en: 'Water cans', type: 'piece', unit: 'can', qty: 0, cat: 'utility', call: ['पानी वाले भैया', 'Water bhaiya']},
	{tpl: 'driver', e: '🚗', hi: 'ड्राइवर', en: 'Driver', type: 'fixed', freeLeaves: 2, cat: 'services', call: ['ड्राइवर भैया', 'Driver bhaiya']},
	{tpl: 'carwash', e: '🚿', hi: 'गाड़ी धोने वाला', en: 'Car cleaner', type: 'fixed', freeLeaves: 2, cat: 'fuel', call: ['भैया', 'Bhaiya']},
];
export const UNITS = {L: ['L', 'L'], pc: ['', ''], can: ['कैन', 'can'], kg: ['किलो', 'kg'], paper: ['अख़बार', 'paper']};
export function unitLabel(u, lang, n) {
	const en = lang === 'en', one = n === 1;
	if (u === 'pc') return en ? (one ? 'piece' : 'pieces') : (one ? 'कपड़ा' : 'कपड़े');
	if (u === 'can') return en ? (one ? 'can' : 'cans') : 'कैन';
	if (u === 'kg') return en ? 'kg' : 'किलो';
	if (u === 'paper') return en ? (one ? 'paper' : 'papers') : 'अख़बार';
	return u === 'L' ? 'L' : (u || '');
}
export const OCCASIONS = [['shaadi', 'शादी', 'Wedding'], ['bday', 'जन्मदिन', 'Birthday'], ['griha', 'गृहप्रवेश', 'Housewarming'], ['mundan', 'मुंडन', 'Mundan'], ['festival', 'त्योहार', 'Festival'], ['other', 'और कुछ', 'Other']];
export const MEMBER_CHIPS = [['पति', 'Husband', '👨'], ['पत्नी', 'Wife', '👩'], ['माँ', 'Mother', '👵'], ['पापा', 'Father', '👴'], ['बेटा', 'Son', '👦'], ['बेटी', 'Daughter', '👧']];
export const MEMBER_COLORS = ['#1F7A4D', '#B7791F', '#2B6CB0', '#B83280', '#6B46C1', '#C05621', '#2C7A7B', '#9B2C2C'];

/* state */
export function defaultSettings() {
	return {
		id: 'settings', kind: 'settings', familyName: '', members: [], income: 0, payday: 1, cycleStart: '1',
		savePct: 0, saveAmt: 0, savingsBalance: 0, savingsAsOf: '', budgets: {}, cats: DEFAULT_CATS.map(c => ({...c})),
		plan: {created: 0, paidUntil: '', code: '', type: ''}, giftSpend: true,
	};
}
export function normSettings(s) {
	const d = defaultSettings();
	if (!s) return d;
	const o = {...d, ...s, plan: {...d.plan, ...(s.plan || {})}, budgets: {...(s.budgets || {})}};
	const have = new Map((s.cats || []).map(c => [c.id, c]));
	const cats = (s.cats || []).slice();
	for (const c of DEFAULT_CATS) if (!have.has(c.id)) cats.push({...c});
	o.cats = cats; o.members = (s.members || []).slice();
	return o;
}
export function buildState(records) {
	const st = {settings: null, tx: [], bills: [], svcs: [], marks: new Map(), lends: [], shagun: [], goals: [], byId: new Map(), tomb: new Set()};
	for (const r of records) {
		if (!r || !r.id) continue;
		if (r.deleted) {st.tomb.add(r.id); continue;}
		st.byId.set(r.id, r);
		switch (r.kind) {
			case 'settings': st.settings = r; break;
			case 'tx': if (r.date && Number.isFinite(r.amt)) st.tx.push(r); break;
			case 'bill': st.bills.push(r); break;
			case 'svc': st.svcs.push(r); break;
			case 'mark': {let m = st.marks.get(r.svcId); if (!m) st.marks.set(r.svcId, m = new Map()); m.set(r.date, r.qty); break;}
			case 'lend': st.lends.push(r); break;
			case 'shagun': st.shagun.push(r); break;
			case 'goal': st.goals.push(r); break;
		}
	}
	st.settings = normSettings(st.settings);
	st.tx.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.at || a.updated || 0) - (b.at || b.updated || 0)));
	st.bills.sort((a, b) => (a.created || 0) - (b.created || 0));
	st.svcs.sort((a, b) => (a.created || 0) - (b.created || 0));
	return st;
}
export function catOf(st, id) {
	return st.settings.cats.find(c => c.id === id) || DEFAULT_CATS.find(c => c.id === id) || {id, e: '📦', hi: id || 'अन्य', en: id || 'Other', t: 'out'};
}
export function catName(c, lang) {return (lang === 'en' ? c.en : c.hi) || c.hi || c.en || c.id;}
export function memberOf(st, id) {return st.settings.members.find(m => m.id === id) || null;}

/* cycles */
function cycleFromStart(y, m, P) {
	const start = ymd(y, m, Math.min(P, dim(y, m)));
	const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
	const end = addDays(ymd(ny, nm, Math.min(P, dim(ny, nm))), -1);
	return {key: ymd(y, m, 1).slice(0, 7), start, end, days: diffDays(start, end) + 1};
}
const cycleP = s => (s && s.cycleStart === 'payday' && s.payday > 1 ? s.payday : 1);
export function cycleFor(date, settings) {
	const P = cycleP(settings);
	let y = +date.slice(0, 4), m = +date.slice(5, 7); const d = +date.slice(8, 10);
	if (d < Math.min(P, dim(y, m))) {m--; if (m < 1) {m = 12; y--;}}
	return cycleFromStart(y, m, P);
}
export function cycleByKey(key, settings) {return cycleFromStart(+key.slice(0, 4), +key.slice(5, 7), cycleP(settings));}
export function shiftCycle(c, n, settings) {return cycleByKey(shiftMonthKey(c.key, n), settings);}
export const inC = (d, c) => d >= c.start && d <= c.end;
// a cycle is named by the calendar month that holds most of its days (30 Sep–29 Oct is "October")
export function cycleNameKey(c) {return mkey(addDays(c.start, Math.floor((c.days - 1) / 2)));}
export function cycleMonth(c, lang) {return MONTHS[L(lang)][+cycleNameKey(c).slice(5, 7) - 1];}
export function cycleTitle(c, lang) {return monthLabel(cycleNameKey(c), lang);}
// the same days of the previous cycle, for fair comparisons while a month is running
export function prevSameDays(c, today, settings) {
	const prev = shiftCycle(c, -1, settings), partial = !!today && inC(today, c) && today < c.end;
	const e = addDays(prev.start, diffDays(c.start, today || c.end));
	return {prev, start: prev.start, end: partial && e < prev.end ? e : prev.end, partial, days: partial ? diffDays(c.start, today) + 1 : c.days};
}
// entries the family wrote on or after a date (first-run lumps and automatic records are not counted)
export function entriesSince(st, date) {return st.tx.filter(t => !t.auto && t.cat !== 'opening' && todayStr(t.created || t.updated || dnum(t.date) * 864e5) >= (date || '')).length;}
export function cycleLabel(c, lang) {
	if (c.start.slice(8) === '01') return fmtDate(c.start, lang).split(' ')[0] + '–' + fmtDate(c.end, lang);
	return fmtDate(c.start, lang, {short: true}) + ' – ' + fmtDate(c.end, lang, {short: true});
}

/* totals */
export function monthTotals(st, c) {
	let aaya = 0, bachaya = 0, gaya = 0, n = 0;
	for (const t of st.tx) {
		if (!inC(t.date, c)) continue; n++;
		if (t.type === 'in') aaya += t.amt; else if (t.type === 'save') bachaya += t.amt; else gaya += t.amt;
	}
	return {aaya, bachaya, gaya, bacha: aaya - bachaya - gaya, n};
}
export function txIn(st, c, f) {return st.tx.filter(t => inC(t.date, c) && (!f || f(t)));}
export function saveTarget(st, c, T) {
	const s = st.settings;
	if (s.saveAmt > 0) return s.saveAmt;
	if (!(s.savePct > 0)) return 0;
	const base = s.income > 0 ? s.income : (T || monthTotals(st, c)).aaya;
	return Math.round(base * s.savePct / 100 / 100) * 100;
}
export const isVariable = t => t.type === 'out' && !t.billId && !t.svcId;

/* bills */
const CYC_M = {m: 1, '2m': 2, '3m': 3, y: 12};
const CYC_D = {'28d': 28, '84d': 84};
export function billOcc(bill, from, to) {
	const out = [];
	if (!bill || !bill.nextDue || bill.cycle === 'need' || from > to) return out;
	const a = bill.nextDue;
	if (CYC_M[bill.cycle]) {
		const step = CYC_M[bill.cycle], day = bill.cycle === 'm' && bill.dueDay ? bill.dueDay : +a.slice(8, 10);
		let k = 0;
		if (from > a) k = Math.max(0, Math.floor(monthsBetween(a, from) / step) - 1);
		for (let i = 0; i < 400; i++, k++) {
			const d = addMonths(a, k * step, day);
			if (d > to) break;
			if (d >= from && d >= a) out.push(d);
		}
	} else if (CYC_D[bill.cycle]) {
		const n = CYC_D[bill.cycle];
		let k = from > a ? Math.floor(diffDays(a, from) / n) : 0;
		for (let i = 0; i < 400; i++, k++) {
			const d = addDays(a, k * n);
			if (d > to) break;
			if (d >= from) out.push(d);
		}
	}
	return out;
}
export function billPaid(st, bill, due) {
	let amt = 0, tx = null;
	for (const t of st.tx) if (t.billId === bill.id && t.billDue === due) {amt += t.amt; tx = t;}
	return tx ? {amt, tx} : null;
}
export const billSkipped = (bill, due) => (bill.skips || []).includes(due);
// money for bills in cycle c, counted once and in cash: every bill payment dated in c (actual amount)
// + every unpaid, not-skipped occurrence due on or before c.end (plan amount; carried-over ones included)
export function billsForCycle(st, c) {
	const lines = []; let paid = 0, due = 0;
	for (const t of st.tx) if (t.billId && t.type === 'out' && inC(t.date, c)) {
		lines.push({bill: st.byId.get(t.billId) || {id: t.billId, name: t.note || '—', emoji: '🧾'}, due: t.billDue || t.date, amt: t.amt, status: 'paid', date: t.date}); paid += t.amt;
	}
	for (const b of st.bills) {
		if (b.active === false || b.cycle === 'need' || !b.nextDue) continue;
		for (const d of billOcc(b, b.nextDue, c.end)) {
			if (billPaid(st, b, d) || billSkipped(b, d)) continue;
			lines.push({bill: b, due: d, amt: b.amt || 0, status: 'unpaid', prev: d < c.start}); due += b.amt || 0;
		}
	}
	lines.sort((x, y) => (x.due < y.due ? -1 : x.due > y.due ? 1 : 0));
	return {total: paid + due, paid, due, lines};
}
export function billNext(st, b, today) {
	if (b.cycle === 'need') return null;
	const occ = billOcc(b, b.nextDue, addDays(today, 800));
	for (const d of occ) if (!billPaid(st, b, d) && !billSkipped(b, d)) return d;
	return null;
}
export function billLastPaid(st, b) {let t = null; for (const x of st.tx) if (x.billId === b.id && (!t || x.date >= t.date)) t = x; return t;}

/* services */
export function rateOn(svc, d) {
	let r = svc.rate || 0, best = '';
	for (const x of svc.rates || []) if (x.from <= d && x.from >= best) {best = x.from; r = x.rate;}
	return r;
}
export function markOf(st, svc, d) {const m = st.marks.get(svc.id); return m && m.has(d) ? m.get(d) : undefined;}
export function qtyOn(st, svc, d) {const q = markOf(st, svc, d); return q === undefined ? (svc.qty || 0) : q;}
export function svcActiveOn(svc, d) {return d >= (svc.start || '0000') && (!svc.end || d <= svc.end);}
// bill for calendar month mk. o.upto: count only days up to this date. o.project: whole month (future days at default).
export function svcBill(st, svc, mk, o = {}) {
	const y = +mk.slice(0, 4), m = +mk.slice(5, 7), D = dim(y, m);
	const first = mk + '-01', last = mk + '-' + p2(D);
	const from = svc.start && svc.start > first ? svc.start : first;
	const endAll = svc.end && svc.end < last ? svc.end : last;
	const to = o.project ? endAll : (o.upto && o.upto < endAll ? o.upto : endAll);
	const r = {amt: 0, days: 0, qty: 0, absent: [], extra: [], leaves: 0, extraLeaves: 0, cut: 0, base: 0, rateNow: rateOn(svc, to < from ? from : to), from, to, month: mk};
	if (from > endAll) return r;
	if (svc.type === 'fixed') {
		let base = 0;
		eachDay(from, endAll, d => {base += rateOn(svc, d) / D;});
		if (to >= from) eachDay(from, to, d => {if (markOf(st, svc, d) === 0) r.absent.push(d); else r.days++;});
		r.base = Math.round(base);
		r.leaves = r.absent.length;
		r.extraLeaves = Math.max(0, r.leaves - (svc.freeLeaves || 0));
		r.cut = r.extraLeaves * (svc.leaveCut || 0);
		r.amt = Math.max(0, r.base - r.cut);
		return r;
	}
	if (to < from) return r;
	eachDay(from, to, d => {
		const q = qtyOn(st, svc, d);
		if (q > 0) {r.days++; r.qty += q; r.amt += Math.round(q * rateOn(svc, d)); if (q !== (svc.qty || 0)) r.extra.push([d, q]);}
		else if (svc.type !== 'piece' || markOf(st, svc, d) === 0) r.absent.push(d);
	});
	if (svc.type === 'piece') r.absent = r.absent.filter(d => markOf(st, svc, d) === 0);
	r.qty = Math.round(r.qty * 100) / 100;
	return r;
}
export function svcPaid(st, svc, mk) {
	let amt = 0, tx = null;
	for (const t of st.tx) if (t.svcId === svc.id && t.svcMonth === mk) {amt += t.amt; tx = t;}
	return tx ? {amt, tx} : null;
}
export const svcSkipped = (svc, mk) => (svc.skips || []).includes(mk);
// true when this helper's latest payment was made inside the month it paid for (paid at month end)
export function svcPaysSameMonth(st, svc) {
	let last = null;
	for (const t of st.tx) if (t.svcId === svc.id && t.svcMonth && (!last || t.date > last.date)) last = t;
	return !!last && mkey(last.date) <= last.svcMonth;
}
// service months still to be paid out of cycle c: months whose bill falls due (1st of next month) by c.end,
// plus this month itself for helpers who are paid at the end of the same month
export function svcDueMonths(st, svc, c) {
	const out = [];
	if (!svc.start) return out;
	const same = svcPaysSameMonth(st, svc);
	for (let mk = mkey(svc.start), i = 0; i < 60 && mk <= c.key; i++, mk = shiftMonthKey(mk, 1)) {
		if (svc.end && svc.end < mk + '-01') break;
		if (svcPaid(st, svc, mk) || svcSkipped(svc, mk)) continue;
		const dueDate = addMonths(mk + '-01', 1);
		if (dueDate <= c.end || (mk === c.key && same && svc.active !== false)) out.push(mk);
	}
	return out;
}
// money for home help in cycle c, counted once and in cash: every helper payment dated in c (any month)
// + every unpaid month that has to be paid out of this cycle (see svcDueMonths)
export function svcsForCycle(st, c) {
	const lines = []; let paid = 0, due = 0;
	for (const t of st.tx) if (t.svcId && t.type === 'out' && inC(t.date, c)) {
		lines.push({svc: st.byId.get(t.svcId) || {id: t.svcId, name: t.note || '—', emoji: '🏠'}, month: t.svcMonth, amt: t.amt, status: 'paid', date: t.date}); paid += t.amt;
	}
	for (const s of st.svcs) for (const mk of svcDueMonths(st, s, c)) {
		let amt = svcBill(st, s, mk, {project: true}).amt;
		if (s.type === 'piece' && mk === c.key) {const prev = svcBill(st, s, shiftMonthKey(mk, -1)).amt; if (prev > amt && s.start < mk + '-01') amt = prev;}
		if (!amt) continue;
		lines.push({svc: s, month: mk, amt, status: 'unpaid', prev: mk < c.key}); due += amt;
	}
	// this month's helpers who are paid next month: shown in the explanation, reserved next month
	let later = 0;
	for (const s of st.svcs) {
		if (s.active === false || !s.start || s.start > c.end || svcPaid(st, s, c.key) || svcSkipped(s, c.key) || lines.some(x => x.svc === s && x.month === c.key)) continue;
		later += svcBill(st, s, c.key, {project: true}).amt;
	}
	return {total: paid + due, paid, due, lines, later};
}
// उधार cash in this cycle: money lent or repaid goes out, money returned to us comes back.
// Money we borrow does not raise the daily number (it has to be returned).
export function loanFlows(st, c) {
	let out = 0, back = 0;
	for (const l of st.lends) {
		if (l.dir === 'gave') {if (inC(l.date, c)) out += l.amt || 0; for (const p of l.payments || []) if (inC(p.date, c)) back += p.amt || 0;}
		else for (const p of l.payments || []) if (inC(p.date, c)) out += p.amt || 0;
	}
	return {out, back, net: out - back};
}
/* today limit */
const floor10 = p => (p > 0 ? Math.floor(p / 1000) * 1000 : 0);
export function todayLimit(st, today) {
	const s = st.settings, c = cycleFor(today, s), T = monthTotals(st, c);
	const planned = s.income || 0, income = Math.max(planned, T.aaya);
	const target = saveTarget(st, c, T), save = Math.max(target, T.bachaya);
	const B = billsForCycle(st, c), S = svcsForCycle(st, c), Ln = loanFlows(st, c);
	let varBefore = 0, varToday = 0, outToday = 0;
	for (const t of st.tx) {
		if (t.type !== 'out' || !inC(t.date, c)) continue;
		if (t.date === today) outToday += t.amt;
		if (!isVariable(t)) continue;
		if (t.date === today) varToday += t.amt; else varBefore += t.amt; // a spend dated after today is already spent too
	}
	const daysLeft = Math.max(1, diffDays(today, c.end) + 1), lastDay = today >= c.end;
	const pool = income - save - B.total - S.total - Ln.net - varBefore;
	const limit = floor10(pool / daysLeft);
	const left = limit - varToday, poolLeft = pool - varToday;
	const hasPlan = income > 0;
	let status = 'green';
	if (!hasPlan) status = 'noplan';
	else if (poolLeft < 0 || (!lastDay && varToday > limit)) status = 'red';
	else if (!lastDay && varToday > 0.8 * limit) status = 'amber';
	const tomorrow = daysLeft > 1 ? floor10((pool - varToday) / (daysLeft - 1)) : null;
	// बचा (month tile) = रोज़ के लिए + बाक़ी बिल/सेवाएँ + बचत अभी डालनी + उधार में − आमदनी अभी आनी
	const recon = {bacha: T.bacha, daily: poolLeft, dues: B.due + S.due, saveLeft: save - T.bachaya, loans: Ln.net, incomeLeft: income - T.aaya};
	return {
		cycle: c, totals: T, planned, income, target, save, bills: B, svcs: S, loans: Ln, varBefore, varToday, outToday,
		pool, daysLeft, lastDay, limit, left, spentToday: varToday, poolLeft, over: Math.max(0, varToday - limit), tomorrow, status, hasPlan, recon,
	};
}
// the same reconciliation for any month (as of its last day once it is over)
export function reconcile(st, c, today) {
	const d = today > c.end ? c.end : today < c.start ? c.start : today;
	return todayLimit(st, d).recon;
}
export function reconParts(r, lang) {
	const en = lang === 'en', parts = [[en ? 'for daily spends' : 'रोज़ के लिए', r.daily]];
	if (r.dues) parts.push([en ? 'bills & help still to pay' : 'बाक़ी बिल/सेवाएँ', r.dues]);
	if (r.saveLeft) parts.push([en ? 'saving still to put aside' : 'बचत अभी डालनी', r.saveLeft]);
	if (r.loans) parts.push([r.loans > 0 ? (en ? 'lent out (net)' : 'उधार में गए') : (en ? 'loans returned (net)' : 'उधार वापस आए'), r.loans]);
	if (r.incomeLeft) parts.push([en ? 'income still to come' : 'आमदनी अभी आनी', -r.incomeLeft]);
	return parts;
}
export function reconText(r, lang) {
	const en = lang === 'en';
	return `${en ? 'Left' : 'बचा'} ${fmt(r.bacha)} = ` + reconParts(r, lang).map(([l, v], i) => (i ? (v < 0 ? ' − ' : ' + ') : (v < 0 ? '−' : '')) + `${l} ${fmt(Math.abs(v))}`).join('');
}
export function explainLines(L0, lang) {
	const en = lang === 'en', c = L0.cycle, out = [];
	const add = (op, label, amt, sub) => out.push({op, label, amt, sub});
	const MON = MON3[L(lang)];
	const lbl = cycleLabel(c, lang);
	add('', en ? `Income this month (${lbl})` : `इस महीने की आमदनी (${lbl})`, L0.income,
		en ? `planned ${fmt(L0.planned)} · came ${fmt(L0.totals.aaya)} — the bigger one is used` : `तय ${fmt(L0.planned)} · आई ${fmt(L0.totals.aaya)} — जो ज़्यादा, वही ली`);
	add('−', en ? 'Save first' : 'पहले बचत', L0.save,
		en ? `target ${fmt(L0.target)} · saved ${fmt(L0.totals.bachaya)} — the bigger one` : `लक्ष्य ${fmt(L0.target)} · डाली ${fmt(L0.totals.bachaya)} — जो ज़्यादा`);
	const bl = L0.bills.lines;
	add('−', en ? `Bills paid or due this month (${bl.length})` : `इस महीने भरे या देने वाले बिल (${bl.length})`, L0.bills.total,
		bl.map(x => `${x.bill.name}${x.status === 'paid' ? ' ✓' : x.prev ? (en ? ' (carried)' : ' (पिछला)') : ''} ${fmt(x.amt)}`).join(' · ') || (en ? 'none' : 'कोई नहीं'));
	const sl = L0.svcs.lines;
	const nextM = MONTHS[L(lang)][+c.key.slice(5) - 1], nextD = fmtDate(addDays(c.end, 1), lang, {short: true});
	add('−', en ? 'Home help paid or due this month' : 'इस महीने दी या देनी वाली सेवाएँ', L0.svcs.total,
		(sl.map(x => `${x.svc.name}${x.month ? ' (' + MON[+x.month.slice(5) - 1] + ')' : ''}${x.status === 'paid' ? ' ✓' : ''} ${fmt(x.amt)}`).join(' · ') || (en ? 'none' : 'कोई नहीं'))
		+ (L0.svcs.later ? (en ? ` · ${nextM}'s help (about ${fmt(L0.svcs.later)}) is paid on ${nextD} — counted next month` : ` · ${nextM} की सेवाएँ (लगभग ${fmt(L0.svcs.later)}) ${nextD} को — अगले महीने में गिनी जाएँगी`) : ''));
	if (L0.loans.net) add(L0.loans.net > 0 ? '−' : '+', L0.loans.net > 0 ? (en ? 'Lent or repaid this month (net)' : 'इस महीने उधार में गए (नेट)') : (en ? 'Loans returned to you (net)' : 'उधार वापस आए (नेट)'), Math.abs(L0.loans.net));
	add('−', en ? 'Daily spends before today' : 'आज से पहले का रोज़ का खर्च', L0.varBefore,
		L0.daysLeft < c.days ? (en ? `${fmtDate(c.start, lang, {short: true})} to yesterday` : `${fmtDate(c.start, lang, {short: true})} से कल तक`) : (en ? 'first day of the month' : 'महीने का पहला दिन'));
	add('=', en ? 'For daily spends this month' : 'इस महीने रोज़ के लिए', L0.pool);
	if (L0.lastDay) {
		add('−', en ? 'Spent today' : 'आज का खर्च', L0.varToday);
		add('=', en ? 'Left at the end of the month — can go to savings' : 'महीने के आख़िर में बचे — गुल्लक में डाल सकते हैं', L0.poolLeft);
		return out;
	}
	add('÷', en ? `${L0.daysLeft} days left (incl. today), rounded down to ₹10` : `${L0.daysLeft} दिन बाक़ी (आज समेत), ₹10 में नीचे`, L0.limit, en ? 'today\'s limit' : 'आज की सीमा');
	add('−', en ? 'Spent today' : 'आज का खर्च', L0.varToday, L0.outToday > L0.varToday ? (en ? `bills/help paid today (${fmt(L0.outToday - L0.varToday)}) are already counted above` : `आज भरे बिल/सेवाएँ (${fmt(L0.outToday - L0.varToday)}) ऊपर गिने जा चुके`) : '');
	add('=', en ? 'You can still spend today' : 'आज और खर्च कर सकते हैं', L0.left);
	return out;
}
/* dues */
export function dues(st, today, horizon = 5) {
	const c = cycleFor(today, st.settings), out = [];
	const until = addDays(today, horizon);
	for (const b of st.bills) {
		if (b.active === false || b.cycle === 'need' || !b.nextDue) continue;
		for (const due of billOcc(b, b.nextDue, until)) {
			if (billPaid(st, b, due) || billSkipped(b, due)) continue;
			out.push({kind: 'bill', key: 'b:' + b.id + ':' + due, bill: b, due, amt: b.amt || 0, overdue: due < today, prev: due < c.start, days: diffDays(today, due)});
		}
	}
	const curM = mkey(today), lastDay = addDays(addMonths(curM + '-01', 1), -1) === today;
	for (const s of st.svcs) {
		if (!s.start) continue;
		let mk = mkey(s.start);
		const endM = lastDay ? curM : shiftMonthKey(curM, -1);
		for (let i = 0; i < 60 && mk <= endM; i++, mk = shiftMonthKey(mk, 1)) {
			if (s.end && s.end < mk + '-01') break;
			if (svcPaid(st, s, mk) || svcSkipped(s, mk)) continue;
			const bl = svcBill(st, s, mk);
			if (bl.amt <= 0) continue;
			const dueD = addMonths(mk + '-01', 1);
			out.push({kind: 'svc', key: 's:' + s.id + ':' + mk, svc: s, month: mk, due: mk === curM ? today : dueD, amt: bl.amt, overdue: mk < curM, prev: mk < curM, days: diffDays(today, dueD)});
		}
	}
	out.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
	return out;
}

/* stats */
// category totals; for the running month the comparison is with the same days of last month
export function catStats(st, c, today) {
	const cur = new Map(), old = new Map(), cnt = new Map();
	const {prev, end: prevEnd, partial} = prevSameDays(c, today, st.settings);
	for (const t of st.tx) {
		if (t.type !== 'out') continue;
		if (inC(t.date, c)) {cur.set(t.cat, (cur.get(t.cat) || 0) + t.amt); cnt.set(t.cat, (cnt.get(t.cat) || 0) + 1);}
		else if (t.date >= prev.start && t.date <= prevEnd) old.set(t.cat, (old.get(t.cat) || 0) + t.amt);
	}
	const hasPrev = st.tx.some(t => inC(t.date, prev));
	return [...cur.entries()].map(([cat, amt]) => ({cat, amt, n: cnt.get(cat), prev: old.get(cat) || 0, delta: hasPrev ? amt - (old.get(cat) || 0) : null, partial}))
		.sort((a, b) => b.amt - a.amt || (a.cat < b.cat ? -1 : 1));
}
export function budgetStatus(st, c, today) {
	const out = [];
	const daysLeft = inC(today, c) ? diffDays(today, c.end) + 1 : 0;
	for (const [cat, b] of Object.entries(st.settings.budgets || {})) {
		if (!(b > 0)) continue;
		let spent = 0; for (const t of st.tx) if (t.type === 'out' && t.cat === cat && inC(t.date, c)) spent += t.amt;
		const left = b - spent;
		out.push({cat, budget: b, spent, left, daysLeft, perDay: left > 0 && daysLeft ? Math.floor(left / daysLeft / 100) * 100 : 0, pct: Math.min(1, spent / b)});
	}
	return out.sort((a, b) => b.budget - a.budget);
}
export const goalBy = g => g.byDate || (/^\d{4}-\d{2}-\d{2}$/.test(g.by || '') ? g.by : '');
export function goalStatus(st, g, today) {
	let saved = 0; for (const t of st.tx) if (t.type === 'save' && t.goalId === g.id) saved += t.amt;
	const remaining = Math.max(0, (g.target || 0) - saved);
	const by = goalBy(g), months = by ? Math.max(1, monthsBetween(today, by)) : 0;
	const perMonth = remaining && months ? Math.ceil(remaining / months / 100) * 100 : 0;
	return {saved, remaining, months, perMonth, pct: g.target ? Math.min(1, saved / g.target) : 0, done: g.target > 0 && saved >= g.target};
}
export const FESTIVALS = [
	{id: 'diwali', e: '🪔', hi: 'दिवाली', en: 'Diwali', amt: 1500000, dates: ['2026-11-08', '2027-10-29', '2028-10-17', '2029-11-05', '2030-10-26']},
	{id: 'rakhi', e: '🧵', hi: 'राखी', en: 'Rakhi', amt: 300000, dates: ['2026-08-28', '2027-08-17', '2028-08-05', '2029-08-23', '2030-08-13']},
	{id: 'shaadi', e: '💍', hi: 'शादियों का शगुन', en: 'Wedding-season shagun', amt: 1100000, mmdd: '11-15'},
	{id: 'school', e: '🎒', hi: 'स्कूल फ़ीस', en: 'School fees', amt: 900000},
];
// preset goals with their next date (school fees follow the next quarterly school bill if there is one)
export function festivalPresets(st, today) {
	const out = [];
	for (const f of FESTIVALS) {
		let by = '', amt = f.amt;
		if (f.dates) by = f.dates.find(d => diffDays(today, d) >= 20) || '';
		else if (f.mmdd) {by = today.slice(0, 4) + '-' + f.mmdd; if (diffDays(today, by) < 20) by = (+today.slice(0, 4) + 1) + '-' + f.mmdd;}
		else {
			const b = st.bills.find(x => x.tpl === 'school' && x.active !== false);
			by = b ? billOcc(b, addDays(today, 20), addDays(today, 400)).find(d => !billPaid(st, b, d) && !billSkipped(b, d)) || '' : '';
			if (b && b.amt) amt = b.amt;
			if (!by) {const y = +today.slice(0, 4), cand = [y + '-01-10', y + '-04-10', y + '-07-10', y + '-10-10', (y + 1) + '-01-10']; by = cand.find(d => diffDays(today, d) >= 20);}
		}
		if (by && diffDays(today, by) <= 200) out.push({...f, by, amt}); // only what is coming in the next ~6 months
	}
	return out;
}
// how much the active goals still need in this month (their monthly need minus what went in this month)
export function goalsNeedThisMonth(st, c, today) {
	let need = 0;
	for (const g of st.goals) {
		if (g.active === false) continue;
		const gs = goalStatus(st, g, today);
		if (gs.done || !gs.perMonth) continue;
		let put = 0; for (const t of st.tx) if (t.type === 'save' && t.goalId === g.id && inC(t.date, c)) put += t.amt;
		need += Math.max(0, gs.perMonth - put);
	}
	return need;
}
export function totalSavings(st, upto) {
	const s = st.settings; let t = s.savingsBalance || 0;
	for (const x of st.tx) if (x.type === 'save' && (!s.savingsAsOf || x.date >= s.savingsAsOf) && (!upto || x.date <= upto)) t += x.amt;
	return t;
}
export function emergencyMonths(st, today) {
	const total = totalSavings(st, today);
	let c = cycleFor(today, st.settings); const vals = [];
	const first = st.tx.length ? st.tx[0].date : today;
	for (let i = 0; i < 3; i++) {c = shiftCycle(c, -1, st.settings); if (c.end < first) break; vals.push(monthTotals(st, c).gaya);}
	let avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
	let basis = 'past';
	if (!avg) {
		const cur = cycleFor(today, st.settings), T = monthTotals(st, cur), el = diffDays(cur.start, today) + 1;
		if (el >= 7 && T.gaya > 0) {avg = Math.round(T.gaya / el * cur.days); basis = 'pace';}
	}
	return {total, avg, months: avg > 0 ? Math.floor(total / avg * 10) / 10 : null, basis, n: vals.length};
}
// days in a row on which the family wrote something (by the day it was written; first-run lumps don't count)
export function streak(st, today) {
	const days = new Set();
	for (const t of st.tx) if (!t.auto && t.cat !== 'opening') days.add(todayStr(t.created || t.updated || dnum(t.date) * 864e5));
	for (const m of st.marks.values()) for (const d of m.keys()) if (d <= today) days.add(d);
	let d = days.has(today) ? today : addDays(today, -1), n = 0;
	while (days.has(d) && n < 4000) {n++; d = addDays(d, -1);}
	return n;
}
export function yearSaved(st, today) {const y = today.slice(0, 4); let s = 0; for (const t of st.tx) if (t.type === 'save' && t.date.slice(0, 4) === y) s += t.amt; return s;}
export function catUsage(st, type, today) {
	const since = addDays(today, -120), m = new Map();
	for (const t of st.tx) if (t.type === type && t.date >= since && !t.billId && !t.svcId) m.set(t.cat, (m.get(t.cat) || 0) + 1);
	return m;
}
export function sortedCats(st, type, today) {
	const u = catUsage(st, type, today), base = st.settings.cats.filter(c => c.t === type && !c.hidden && !c.sys);
	return base.map((c, i) => ({c, n: u.get(c.id) || 0, i})).sort((a, b) => b.n - a.n || a.i - b.i).map(x => x.c);
}
// recent spends for the add sheet ("हाल के"): last distinct category + amount pairs
export function recentSpends(st, n = 4) {
	const out = [], seen = new Set();
	const list = st.tx.filter(t => isVariable(t) && t.cat !== 'opening').sort((a, b) => (b.created || b.updated || 0) - (a.created || a.updated || 0));
	for (const t of list) {const k = t.cat + ':' + t.amt; if (seen.has(k) || seen.has(t.cat)) continue; seen.add(k); seen.add(t.cat); out.push({cat: t.cat, last: t.amt}); if (out.length >= n) break;}
	return out;
}
export function catAverage(st, cat, today) {
	const since = addDays(today, -90); let s = 0, n = 0;
	for (const t of st.tx) if (t.type === 'out' && t.cat === cat && t.date >= since) {s += t.amt; n++;}
	return n >= 3 ? s / n : 0;
}
export function bigAmountCheck(st, type, cat, amt, today) {
	if (type === 'in') {const inc = st.settings.income || 0; return inc ? amt > inc * 2 : amt > 5000000;}
	if (amt > 5000000) return true;
	if (type === 'out') {const a = catAverage(st, cat, today); return a > 0 && amt > 10 * a && amt > 100000;}
	return false;
}
export function lendLeft(l) {return Math.max(0, (l.amt || 0) - (l.payments || []).reduce((a, p) => a + (p.amt || 0), 0));}
export function lendSummary(st) {
	let lena = 0, dena = 0;
	for (const l of st.lends) {if (l.settled) continue; const r = lendLeft(l); if (l.dir === 'gave') lena += r; else dena += r;}
	return {lena, dena};
}
export function normName(s) {return String(s || '').toLowerCase().normalize('NFC').replace(/\u093c/g, '').replace(/\u0901/g, '\u0902').replace(/\s+(जी|ji|साहब|sahab)$/u, '').replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ').trim();}
export function shagunByPerson(st, q) {
	const nq = normName(q), g = new Map();
	for (const x of st.shagun) {
		const k = normName(x.person); if (nq && !k.includes(nq)) continue;
		let e = g.get(k); if (!e) g.set(k, e = {person: x.person, got: [], gave: [], gotSum: 0, gaveSum: 0, last: ''});
		(x.dir === 'got' ? e.got : e.gave).push(x);
		if (x.dir === 'got') e.gotSum += x.amt; else e.gaveSum += x.amt;
		if (x.date > e.last) e.last = x.date;
	}
	for (const e of g.values()) {e.got.sort((a, b) => (a.date < b.date ? 1 : -1)); e.gave.sort((a, b) => (a.date < b.date ? 1 : -1));}
	return [...g.values()].sort((a, b) => (a.last < b.last ? 1 : -1));
}

/* plan / trial */
// Pro comes from the server licence (cached on the phone); before the first answer, a 30-day trial
// from the family's creation is assumed. status: trial | pending (UPI claim, being confirmed) | active | expired
export function planState(lic, settings, now = Date.now(), today = todayStr(now)) {
	let status, until, plan = '';
	if (lic && lic.paid_until) {status = lic.status || 'active'; until = lic.paid_until; plan = lic.plan || '';}
	else {const cr = settings && settings.plan && settings.plan.created || now; until = todayStr(cr + (TRIAL_DAYS - 1) * 864e5); status = 'trial';}
	const pro = until >= today && status !== 'rejected';
	if (!pro && status !== 'rejected') status = 'expired';
	const left = Math.max(0, diffDays(today, until) + 1);
	return {pro, status, until, plan, left, trial: status === 'trial', pending: status === 'pending', paid: status === 'active' || status === 'pending', trialLeft: status === 'trial' ? left : 0};
}
/* texts */
function joinAnd(arr, lang) {if (arr.length <= 1) return arr.join(''); return arr.slice(0, -1).join(', ') + (lang === 'en' ? ' and ' : ' और ') + arr[arr.length - 1];}
const qtyStr = q => (Number.isInteger(q) ? String(q) : String(Math.round(q * 100) / 100));
export function svcCall(svc, lang) {
	if (svc.call) return svc.call;
	const t = SVC_TPL.find(x => x.tpl === svc.tpl);
	if (t && (svc.name === t.hi || svc.name === t.en)) return t.call[lang === 'en' ? 1 : 0];
	return svc.name + (lang === 'en' ? '' : ' जी');
}
export function svcBillLine(svc, bl, lang) {
	const en = lang === 'en', u = unitLabel(svc.unit, lang, bl.qty), mon = MONTHS[L(lang)][+bl.month.slice(5, 7) - 1];
	if (svc.type === 'fixed') {
		let s = en ? `${mon}: ${fmt(bl.base)} for the month` : `${mon}: महीने के ${fmt(bl.base)}`;
		if (bl.cut) s += en ? ` − ${bl.extraLeaves} extra leave × ${fmt(svc.leaveCut)} = ${fmt(bl.amt)}` : ` − ${bl.extraLeaves} ज़्यादा छुट्टी × ${fmt(svc.leaveCut)} = ${fmt(bl.amt)}`;
		return s;
	}
	const rate = fmt(bl.rateNow);
	if (svc.type === 'piece') return en ? `${mon}: ${qtyStr(bl.qty)} ${u} × ${rate} = ${fmt(bl.amt)}` : `${mon}: ${qtyStr(bl.qty)} ${u} × ${rate} = ${fmt(bl.amt)}`;
	if (!bl.extra.length && bl.days) return `${mon}: ${bl.days} ${en ? 'days' : 'दिन'} × ${qtyStr(svc.qty)} ${u} @ ${rate} = ${fmt(bl.amt)}`;
	return en ? `${mon}: ${qtyStr(bl.qty)} ${u} in ${bl.days} days @ ${rate} = ${fmt(bl.amt)}` : `${mon}: ${bl.days} दिन में कुल ${qtyStr(bl.qty)} ${u} @ ${rate} = ${fmt(bl.amt)}`;
}
export function svcWhatsApp(st, svc, mk, lang, upto) {
	const en = lang === 'en', bl = svcBill(st, svc, mk, upto ? {upto} : {});
	const fam = st.settings.familyName || '';
	const days = bl.absent.map(d => String(+d.slice(8)));
	const lines = [];
	lines.push(en ? `Namaste ${svcCall(svc, lang)} 🙏` : `नमस्ते ${svcCall(svc, lang)} 🙏`);
	lines.push(svcBillLine(svc, bl, lang));
	if (svc.type === 'fixed') {
		if (bl.leaves) lines.push(en ? `Leaves: ${joinAnd(days, lang)} (${bl.leaves}; ${svc.freeLeaves || 0} free)` : `छुट्टी: ${joinAnd(days, lang)} तारीख (${bl.leaves}; ${svc.freeLeaves || 0} माफ़)`);
	} else if (days.length) lines.push(en ? `Did not come on: ${joinAnd(days, lang)}.` : `${joinAnd(days, lang)} तारीख को नहीं आए।`);
	if (svc.type === 'qty' && bl.extra.length) {
		const ex = bl.extra.filter(([, q]) => q > 0).map(([d, q]) => `${+d.slice(8)} — ${qtyStr(q)} ${unitLabel(svc.unit, lang, q)}`);
		if (ex.length) lines.push((en ? 'Changed days: ' : 'बदले हुए दिन: ') + ex.join(', '));
	}
	const paid = svcPaid(st, svc, mk);
	lines.push((en ? 'Total: ' : 'कुल: ') + fmt(bl.amt) + (paid ? (en ? ' (paid ✓)' : ' (दे दिए ✓)') : ''));
	lines.push(en ? `Thank you!${fam ? ' — ' + fam : ''}` : `धन्यवाद!${fam ? ' — ' + fam : ''}`);
	return lines.join('\n');
}
export function waLink(phone, text) {
	let p = String(phone || '').replace(/\D/g, '');
	if (p.length === 12 && p.startsWith('91')) p = p.slice(2);
	if (p.length === 11 && p.startsWith('0')) p = p.slice(1);
	return 'https://wa.me/' + (p.length === 10 ? '91' + p : '') + '?text=' + encodeURIComponent(text);
}
export function lendReminder(l, lang, me) {
	const en = lang === 'en', d = fmtDate(l.date, lang), got = (l.payments || []).reduce((a, p) => a + (p.amt || 0), 0), left = fmt(lendLeft(l)), sig = me ? ' — ' + me : '';
	if (l.dir === 'took') return en ? `Namaste ${l.person} ji 🙏 I still have ${left} of yours (you gave ${fmt(l.amt)} on ${d}${got ? `, I have returned ${fmt(got)}` : ''}). I will return it soon. Thank you for your help!${sig}`
		: `नमस्ते ${l.person} जी 🙏 आपने ${d} को ${fmt(l.amt)} दिए थे${got ? `, ${fmt(got)} लौटा दिए हैं` : ''} — बाक़ी ${left} जल्दी लौटा दूँगा। मदद के लिए बहुत धन्यवाद!${sig}`;
	return en ? `Namaste ${l.person} ji 🙏 Hope all is well at home. On ${d} I gave ${fmt(l.amt)}${got ? `, and ${fmt(got)} has come back — thank you` : ''}. Whenever convenient, could you return the remaining ${left}? No hurry at all.${sig}`
		: `नमस्ते ${l.person} जी 🙏 उम्मीद है घर पर सब ठीक है। ${d} को ${fmt(l.amt)} दिए थे${got ? `, ${fmt(got)} मिल गए — धन्यवाद` : ''}। बाक़ी ${left} जब सुविधा हो तब लौटा दीजिएगा, कोई जल्दी नहीं है।${sig}`;
}
export function reportData(st, c, today) {
	const T = monthTotals(st, c), cats = catStats(st, c).slice(0, 3), current = inC(today, c) && today <= c.end;
	return {
		family: st.settings.familyName || '', key: c.key, asOf: today < c.end ? (today < c.start ? c.start : today) : c.end, totals: T, recon: reconcile(st, c, today),
		top: cats.map(x => ({cat: catOf(st, x.cat), amt: x.amt})),
		rate: T.aaya > 0 ? Math.round(T.bachaya / T.aaya * 100) : 0,
		yearSaved: yearSaved(st, c.end < today ? c.end : today), streak: streak(st, today), current,
	};
}
export function monthSummaryText(st, c, lang, today) {
	const en = lang === 'en', R = reportData(st, c, today), T = R.totals, lbl = cycleTitle(c, lang);
	const l = [];
	l.push(`🏠 ${R.family ? R.family + ' — ' : ''}${lbl}${en ? '' : ' का हिसाब'}${R.asOf ? (en ? ` (as of ${fmtDate(R.asOf, lang)})` : ` (${fmtDate(R.asOf, lang)} तक)`) : ''}`);
	l.push('');
	l.push(`${en ? 'Came in' : 'आया'}: ${fmt(T.aaya)}`);
	l.push(`${en ? 'Saved' : 'बचाया'}: ${fmt(T.bachaya)}${R.rate ? ` (${R.rate}%)` : ''}`);
	l.push(`${en ? 'Spent' : 'गया'}: ${fmt(T.gaya)}`);
	l.push(`${en ? 'Left' : 'बचा'}: ${fmt(T.bacha)}`);
	if (R.current) l.push(reconText(R.recon, lang));
	if (R.top.length) {
		l.push(''); l.push(en ? 'Top spends:' : 'सबसे ज़्यादा खर्च:');
		R.top.forEach((x, i) => l.push(`${i + 1}. ${x.cat.e} ${catName(x.cat, lang)} ${fmt(x.amt)}`));
	}
	l.push('');
	l.push((en ? `Saved this year: ${fmt(R.yearSaved)}` : `इस साल अब तक ${fmt(R.yearSaved)} बचाया`) + (R.streak ? (en ? ` · ${R.streak}-day streak` : ` · लगातार ${R.streak} दिन हिसाब`) : ''));
	l.push(en ? '— Ghar Kharch app' : '— घर खर्च ऐप से');
	return l.join('\n');
}
/* amount in words */
export const HI_NUM = ('शून्य एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस तैंतालीस चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उन्यासी अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पंचानवे छियानवे सत्तानवे अट्ठानवे निन्यानवे').split(' ');
const EN1 = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const EN10 = 'x x twenty thirty forty fifty sixty seventy eighty ninety'.split(' ');
const en99 = n => (n < 20 ? EN1[n] : EN10[Math.floor(n / 10)] + (n % 10 ? '-' + EN1[n % 10] : ''));
export function amountWords(p, lang) {
	const en = lang === 'en'; let r = Math.floor(Math.abs(p) / 100); const ps = Math.abs(p) % 100;
	if (!r && !ps) return '';
	const w99 = n => (en ? en99(n) : HI_NUM[n]);
	const parts = [];
	const units = en ? [[1e7, 'crore'], [1e5, 'lakh'], [1e3, 'thousand'], [100, 'hundred']] : [[1e7, 'करोड़'], [1e5, 'लाख'], [1e3, 'हज़ार'], [100, 'सौ']];
	for (const [v, nm] of units) {const q = Math.floor(r / v); if (q) {parts.push((q < 100 ? w99(q) : amountWords(q * 100, lang).replace(/ (rupees?|रुपये)$/, '')) + ' ' + nm); r %= v;}}
	if (r) parts.push(w99(r));
	let s = parts.join(' ');
	if (s) s += en ? (Math.floor(Math.abs(p) / 100) === 1 ? ' rupee' : ' rupees') : ' रुपये';
	if (ps) s += (s ? (en ? ' and ' : ' ') : '') + w99(ps) + (en ? ' paise' : ' पैसे');
	return s;
}

/* voice parser */
export function normText(s) {
	return devToAsc(String(s || '')).toLowerCase().normalize('NFC')
		.replace(/\u093c/g, '').replace(/\u0901/g, '\u0902').replace(/ऑ/g, 'ओ').replace(/ॉ/g, 'ो')
		.replace(/[।?!;:"“”'‘’()]/g, ' ').replace(/(\d),(\d)/g, '$1$2').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
}
const NUMW = new Map();
HI_NUM.forEach((w, i) => NUMW.set(normText(w), i));
[['पांच', 5], ['छः', 6], ['छे', 6], ['छ', 6], ['नो', 9], ['पन्द्रह', 15], ['सत्तरह', 17], ['इक्यावन', 51], ['उनसठ', 59], ['अठावन', 58], ['अट्ठाइस', 28], ['बाइस', 22], ['तेइस', 23], ['सत्ताइस', 27]].forEach(([w, n]) => NUMW.set(normText(w), n));
EN1.forEach((w, i) => NUMW.set(w, i)); EN10.forEach((w, i) => { if (i > 1) NUMW.set(w, i * 10); });
const MULT = new Map([['सौ', 100], ['सो', 100], ['hundred', 100], ['हजार', 1000], ['हज़ार', 1000], ['thousand', 1000], ['लाख', 1e5], ['lakh', 1e5], ['lac', 1e5], ['lakhs', 1e5], ['करोड', 1e7], ['crore', 1e7]].map(([k, v]) => [normText(k), v]));
const FRAC = new Map([['डेढ', 1.5], ['ढाई', 2.5], ['अढाई', 2.5]].map(([k, v]) => [normText(k), v]));
const PREF = new Map([['साढे', 0.5], ['सवा', 0.25], ['पौने', -0.25]].map(([k, v]) => [normText(k), v]));
function numTok(w) {
	if (/^₹?\d+(\.\d+)?k?$/.test(w)) { const k = w.endsWith('k'); const v = parseFloat(w.replace(/[₹k]/g, '')); return { n: k ? v * 1000 : v }; }
	if (/^\d+(\.\d+)?(रु|रुपये|रुपए|rs)$/.test(w)) return { n: parseFloat(w) };
	if (NUMW.has(w)) return { n: NUMW.get(w), word: 1 };
	if (MULT.has(w)) return { m: MULT.get(w) };
	if (FRAC.has(w)) return { n: FRAC.get(w), word: 1 };
	if (PREF.has(w)) return { p: PREF.get(w) };
	return null;
}
// parse a run of number tokens into a value
function runValue(toks) {
	let total = 0, cur = 0, has = false, pref = 0, lastBare = null;
	for (const t of toks) {
		if (t.p !== undefined) { pref = t.p; continue; }
		if (t.n !== undefined) {
			let n = t.n;
			if (pref) { n = (n === 0 ? 1 : n) + pref; pref = 0; }
			if (lastBare !== null && lastBare >= 1 && lastBare <= 9 && n >= 10 && n < 100 && cur === lastBare) { cur = lastBare * 100 + n; lastBare = null; has = true; continue; }
			cur += n; has = true; lastBare = Number.isInteger(t.n) && t.n < 10 ? t.n : null; continue;
		}
		if (t.m) {
			let base = cur || 1; if (pref) { base = 1 + pref; pref = 0; }
			if (t.m === 100) cur = base * 100; else { total += base * t.m; cur = 0; }
			has = true; lastBare = null;
		}
	}
	return has ? total + cur : null;
}
const UNIT_W = new Set(['किलो', 'kg', 'kilo', 'किग्रा', 'लीटर', 'litre', 'liter', 'l', 'ltr', 'दर्जन', 'dozen', 'पैकेट', 'packet', 'ग्राम', 'gram', 'g', 'gm', 'पाव', 'नग', 'piece', 'pieces', 'कप', 'प्लेट', 'plate', 'बोतल', 'bottle', 'कैन', 'can', 'kilos', 'kgs']);
// keyword -> category ; generic words are dropped from the note
const KW = [
	['veg', 'सब्जी सब्जियां सब्जियाँ फल फ्रूट vegetable vegetables veggies fruit fruits sabzi sabji', 'आलू प्याज टमाटर भिंडी गोभी मटर धनिया मिर्च लौकी केला केले सेब आम अनार अदरक लहसुन नींबू खीरा गाजर पालक onion onions potato potatoes tomato tomatoes banana bananas apple apples'],
	['milk', 'दूध milk dairy doodh dudh', 'दही पनीर मक्खन घी छाछ curd paneer butter ghee dahi'],
	['ration', 'राशन किराना ration grocery groceries kirana rashan', 'आटा चावल दाल तेल चीनी नमक मसाला मसाले बिस्कुट चायपत्ती atta rice dal oil sugar salt dmart blinkit bigbasket zepto'],
	['fuel', 'पेट्रोल डीजल सीएनजी petrol diesel fuel cng', 'गाडी पंक्चर सर्विसिंग puncture servicing'],
	['travel', 'आना-जाना किराया-भाड़ा travel', 'ओटो ऑटो रिक्शा बस टैक्सी मेट्रो ट्रेन टिकट ओला उबर auto rickshaw bus taxi cab metro train ticket ola uber rapido'],
	['eatout', 'बाहर restaurant eating', 'होटल रेस्टोरेंट ढाबा चाय समोसा पिज्जा बर्गर जोमैटो स्विगी नाश्ता हलवाई मिठाई चाट hotel zomato swiggy pizza burger tea chai snacks dinner lunch sweets'],
	['health', 'दवा दवाई दवाइयां medicine medicines', 'डाक्टर डोक्टर अस्पताल टेस्ट जांच केमिस्ट doctor chemist medical hospital test pharmacy'],
	['edu', 'पढाई education', 'स्कूल फीस किताब किताबें कोपी कापी ट्यूशन स्टेशनरी school fees fee book books tuition stationery'],
	['clothes', 'कपडे कपडा clothes', 'साडी जूते चप्पल शर्ट कुर्ता सूट saree shoes shirt kurta'],
	['household', 'सामान household', 'बर्तन साबुन झाडू सर्फ डिटर्जेंट बल्ब soap detergent utensils bulb'],
	['utility', 'बिजली electricity bijli', 'गैस सिलेंडर पानी gas cylinder water paani pani'],
	['phone', 'रिचार्ज recharge', 'मोबाइल इंटरनेट वाईफाई wifi mobile internet broadband jio airtel'],
	['rent', 'किराया rent', 'emi ईएमआई किस्त'],
	['festival', 'पूजा puja', 'मंदिर प्रसाद दिवाली होली राखी दशहरा नवरात्रि दान temple diwali holi festival donation'],
	['fun', 'मनोरंजन', 'सिनेमा फिल्म मूवी पिक्चर घूमना पार्क movie cinema netflix outing trip'],
	['care', 'सैलून', 'नाई कटिंग पार्लर salon parlour parlor haircut'],
	['kids', 'बच्चे kids', 'खिलौना खिलौने toy toys'],
	['gift', 'गिफ्ट उपहार तोहफा gift', ''],
	['insurance', 'बीमा insurance', 'एलआईसी lic policy'],
].map(([cat, gen, items]) => [cat, new Set(normText(gen).split(' ').filter(Boolean)), new Set(normText(items).split(' ').filter(Boolean))]);
const FILL = new Set(normText('का की के को में से ने पर रुपये रुपए रुपया रु rs rupees rupee ₹ आज कल परसों खर्च खर्चा दिए दिया दी लिए लिया ली लिखो लिख लिखें डालो डालें डाले डाला डाली जोड़ो जोडो और है हैं था थे हुआ हुए गया गए वाला वाले वाली for of on the a an to spent spend paid pay today yesterday and rupaye in add write please प्लीज़ भी ka ki ke ko me mein se ne par aaj kal parso rupaye rupay rupiya rs. wala wali waale diye diya liye liya likho').split(' '));
const SVC_W = [
	['milk', /(दूधवाला|दूध वाला|दूधवाले|दूध वाले|दूधवाली|दूध वाली|milkman|milk man|doodhwala|dudhwala)/],
	['maid', /(कामवाली|काम वाली|कामवाला|काम वाला|बाई|मेड|maid|kaamwali|kamwali)/],
	['cook', /(खाना बनाने वाली|खाना बनाने वाला|कुक|महाराज|cook)/],
	['paper', /(अखबार|पेपर वाला|newspaper|paper)/],
	['press', /(प्रेस वाला|प्रेसवाला|प्रेस वाले|इस्त्री|धोबी|press|ironing|dhobi)/],
	['water', /(पानी वाला|पानी कैन|पानी वाले|water)/],
	['driver', /(ड्राइवर|ड्रायवर|driver)/],
	['carwash', /(गाडी धोने|car wash|car cleaner)/],
];
const NEG = /(नहीं आ|नही आ|नहीं आय|नहीं आई|नहीं आए|नहीं आये|छुट्टी|absent|didn'?t come|did not come|not come|no show|on leave|नागा)/;
export function parseVoice(raw, o = {}) {
	const today = o.today || todayStr();
	const s = normText(raw);
	if (!s) return null;
	let date = today;
	if (/(परसों|परसो|day before yesterday|(^| )parso(n)?( |$))/.test(s)) date = addDays(today, -2);
	else if (/(^| )(कल|yesterday|kal)( |$)/.test(s)) date = addDays(today, -1);
	// absence of a home service
	for (const [svc, re] of SVC_W) if (re.test(s) && NEG.test(s)) return { kind: 'absent', svc, date, text: raw };
	let type = 'out', cat = null;
	if (/(सैलरी|तनख्वाह|तनखा|तनख़्वाह|वेतन|आमदनी|कमाई|salary|income|received|credited|पगार)/.test(s)) { type = 'in'; cat = /(सैलरी|तनख्वाह|तनखा|वेतन|salary|पगार)/.test(s) ? 'salary' : /(धंधा|दुकान|business)/.test(s) ? 'business' : 'otherin'; }
	else if (/(किराया (आया|मिला)|rent received)/.test(s)) { type = 'in'; cat = 'rentin'; }
	else if (/(ब्याज|interest)/.test(s)) { type = 'in'; cat = 'interest'; }
	else if (/(बचत|एसआईपी|सिप|(^| )sip( |$)|आरडी|(^| )rd( |$)|एफडी|(^| )fd( |$)|पीपीएफ|ppf|गुल्लक|saving|savings|invest|निवेश)/.test(s)) {
		type = 'save'; cat = /(एसआईपी|सिप|sip|म्यूचुअल|mutual)/.test(s) ? 'sip' : /(आरडी|rd|एफडी|fd)/.test(s) ? 'rd' : /(पीपीएफ|ppf)/.test(s) ? 'ppf' : /(सोना|gold)/.test(s) ? 'gold' : 'gullak';
	} else if (/(उधार|udhaar|udhar|lent|borrowed|कर्ज|कर्जा)/.test(s)) {
		type = 'lend';
	} else if (/(शगुन|व्यवहार|नेग|shagun)/.test(s)) type = 'shagun';
	// tokens and number runs
	const toks = s.split(' ');
	const runs = []; let cur = null;
	toks.forEach((w, i) => {
		const nt = numTok(w);
		// "दो" also means "give": only a number when next to another number word or a unit/multiplier
		if (nt && !cur) { cur = { a: i, b: i, toks: [nt] }; return; }
		if (nt && cur) { cur.b = i; cur.toks.push(nt); return; }
		if (cur) { runs.push(cur); cur = null; }
	});
	if (cur) runs.push(cur);
	for (const r of runs) { r.v = runValue(r.toks); r.unit = r.b + 1 < toks.length && UNIT_W.has(toks[r.b + 1]); r.lone = r.toks.length === 1 && r.toks[0].p === undefined && r.toks[0].word && r.v < 10; }
	let cand = runs.filter(r => r.v != null && r.v > 0 && !r.unit);
	if (cand.length > 1) { const nl = cand.filter(r => !r.lone); if (nl.length) cand = nl; }
	const best = cand.sort((x, y) => y.v - x.v)[0];
	const amt = best ? Math.round(best.v * 100) : null;
	const used = new Set(); if (best) for (let i = best.a; i <= best.b; i++) used.add(i);
	// category
	const words = toks.filter((w, i) => !used.has(i));
	let generic = new Set(), hit = null;
	if (type === 'out') {
		for (const w of words) for (const [c, gen, items] of KW) {
			if (gen.has(w) || items.has(w)) { if (!hit) hit = c; if (gen.has(w)) generic.add(w); }
		}
		if (/बाहर खाना|बाहर का खाना|eating out|ate out/.test(s)) { hit = 'eatout'; generic.add('बाहर'); generic.add('खाना'); }
		if (hit === 'rent' && /(ओटो|ऑटो|रिक्शा|बस|auto|bus|cab|taxi)/.test(s)) hit = 'travel';
		if (hit === 'utility' && /(पानी)/.test(s) && !/(बिल|bill|कैन)/.test(s)) hit = 'utility';
		cat = hit || null;
	}
	let note = words.filter(w => !FILL.has(w) && !generic.has(w) && !/^\d/.test(w) && !NUMW.has(w) && !MULT.has(w) && !UNIT_W.has(w) && !PREF.has(w) && !FRAC.has(w));
	let person = '', dir = '';
	if (type === 'lend') {
		dir = /(लिए|लिया|ली|से|took|borrowed|from)/.test(s) && !/(को |gave|lent|to )/.test(s) ? 'took' : 'gave';
		const m = s.match(/(\S+)\s+(को|से)(?=\s|$)/) || s.match(/(?:to|from)\s+(\S+)/);
		if (m && !numTok(m[1])) person = m[1];
		note = note.filter(w => !/(उधार|udhaar|udhar|lent|borrowed|को|से|to|from)/.test(w) && w !== person);
	}
	if (type === 'in' || type === 'save') note = note.filter(w => !/(सैलरी|तनख्वाह|वेतन|आमदनी|salary|income|received|आई|आया|मिली|मिला|बचत|saving|savings|sip|एसआईपी|सिप|गुल्लक|आरडी|एफडी|पीपीएफ|rd|fd|ppf)/.test(w));
	if (type === 'shagun') note = note.filter(w => !/(शगुन|व्यवहार|नेग|shagun)/.test(w));
	// keep original spelling for note words
	const orig = String(raw || '').trim().split(/\s+/);
	const noteStr = note.map(w => { const o2 = orig.find(x => normText(x) === w); return o2 || w; }).join(' ').trim();
	return { kind: 'tx', type, amt, cat, note: noteStr, date, person, dir, text: raw };
}

/* SMS parser */
const MON_I = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
function yy(y) { y = +y; return y < 100 ? 2000 + y : y; }
function okDate(y, m, d, today) {
	if (!(m >= 1 && m <= 12 && d >= 1 && d <= dim(y, m))) return null;
	const s = ymd(y, m, d);
	if (s > addDays(today, 1) || s < addDays(today, -400)) return null;
	return s;
}
export function smsDate(s, today) {
	let m;
	const res = [
		[/\b(\d{4})-(\d{2})-(\d{2})/, x => okDate(+x[1], +x[2], +x[3], today)],
		[/\b(\d{1,2})[-\s/]?(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*[-\s/,]*(\d{4}|\d{2})\b/i, x => okDate(yy(x[3]), MON_I[x[2].toLowerCase()], +x[1], today)],
		[/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/, x => okDate(yy(x[3]), +x[2], +x[1], today)],
	];
	for (const [re, f] of res) { m = s.match(re); if (m) { const d = f(m); if (d) return d; } }
	return null;
}
const MERCH_CAT = [
	['ration', /\b(dmart|d-mart|blinkit|bigbasket|big basket|zepto|grofers|jiomart|reliance fresh|more retail|kirana|grocery|general store|supermarket|instamart)\b/i],
	['phone', /\b(airtel|jio|vodafone|vi prepaid|bsnl|recharge|act fibernet|broadband|prepaid)\b/i],
	['health', /\b(medplus|apollo|pharm\w*|chemist|medical|hospital|clinic|1mg|netmeds|pharmeasy|diagnostic|lab)\b/i],
	['eatout', /\b(zomato|swiggy|restaurant|cafe|dhaba|hotel|pizza|domino|mcdonald|kfc|burger|haldiram|sweets)\b/i],
	['fuel', /\b(petrol|fuel|hpcl|iocl|bpcl|indian oil|bharat petroleum|hindustan petroleum|filling station|shell)\b/i],
	['utility', /\b(vidyut|electric\w*|power|bses|tata power|adani|msedcl|uppcl|torrent|gas|indane|bharat gas|hp gas|water)\b/i],
	['travel', /\b(irctc|uber|ola|rapido|metro|redbus|railway|makemytrip)\b/i],
	['household', /\b(amazon|flipkart|meesho)\b/i],
	['clothes', /\b(myntra|ajio|trends|pantaloons|max fashion)\b/i],
	['edu', /\b(school|academy|tuition|vidyalaya|college)\b/i],
	['insurance', /\b(lic|insurance|policy)\b/i],
	['veg', /\b(sabzi|sabji|vegetables?|fruits?)\b/i],
	['milk', /\b(dairy|milk|amul|mother dairy)\b/i],
];
function cleanMerchant(m) {
	if (!m) return '';
	let x = m.replace(/\s+/g, ' ').trim().replace(/^(mr|mrs|ms|m\/s)\.?\s+/i, '').replace(/[.,;:-]+$/, '');
	if (/@/.test(x)) x = x.split('@')[0].replace(/[._-]+/g, ' ');
	x = x.replace(/\b(ref|refno|upi|on|via|using|from)\b.*$/i, '').trim();
	if (x.length > 32) x = x.slice(0, 32).trim();
	if (/^[A-Z0-9 .&'-]+$/.test(x) && /[A-Z]{2}/.test(x)) x = x.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
	if (/^\d+$/.test(x) || /^x+\d*$/i.test(x)) return '';
	return x;
}
export function parseSMS(text, today = todayStr()) {
	const raw = String(text || '');
	const s = raw.replace(/\s+/g, ' ').trim();
	if (!s) return { ok: false, reason: 'empty' };
	if (/\b(otp|one[- ]time password|verification code|passcode)\b/i.test(s)) return { ok: false, reason: 'otp' };
	// drop balance clauses so we never read the balance as the amount
	const t = s.replace(/\b(?:avl\.?|aval\.?|avbl\.?|available|total|clear|a\/c|ac)?\s*bal(?:ance)?\.?\s*(?:is|:|-|of|in)?\s*(?:a\/c\s*\S+\s*)?(?:as on [^,]+?\s*(?:is)?\s*)?(?:rs\.?|inr|₹)?\s*[\d,]+(?:\.\d+)?\s*(?:cr|dr)?\b/gi, ' ');
	const DEB = /\b(debited|debit(?:ed)?|spent|sent|paid|withdrawn|withdrawal|purchase|deducted|transferred to|dr\b)/i;
	const CRE = /\b(credited|credit(?!\s*card)|received|deposited|refund(?:ed)?|cr\b)/i;
	const md = t.match(DEB), mc = t.match(CRE);
	let type = null;
	if (md && mc) type = md.index <= mc.index ? 'out' : 'in';
	else if (md) type = 'out'; else if (mc) type = 'in';
	let am = t.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) || t.match(/(?:debited|credited)\s+(?:by|for|with)\s*([\d,]+(?:\.\d{1,2})?)/i);
	const hasBal = /\b(bal(ance)?|avl|aval)\b/i.test(s);
	if (!type) return { ok: false, reason: hasBal ? 'balance' : 'unknown' };
	if (!am) return { ok: false, reason: hasBal ? 'balance' : 'unknown' };
	const amt = parseAmount(am[1]);
	if (!amt) return { ok: false, reason: 'unknown' };
	const date = smsDate(s, today) || today;
	let merchant = '';
	const pats = type === 'out' ? [
		/trf to ([A-Za-z0-9 .&'_-]+?) Ref/i,
		/;\s*([A-Za-z0-9 .&'_-]+?) credited/i,
		/UPI\/P2[MA]\/\d+\/([^/\n]+?)(?:\/| Not| not|$)/i,
		/\bAt ([A-Za-z0-9 .&'_-]+?) on\b/i,
		/\bto ([A-Za-z0-9 .&@'_-]+?)\s+(?:on|from|via|using|ref|upi)\b/i,
		/\bTo:? ([A-Za-z0-9 .&@'_-]+?)(?: On| on|\.|,| Ref|$)/,
		/\bthrough UPI to ([A-Za-z0-9 .&'_-]+?)(?:\.| Aval| Avl|$)/i,
		/\bto ([A-Za-z0-9 .&@'_-]+?)[.,]/i,
	] : [
		/(?:NEFT Cr-|IMPS Cr-|Cr-)([A-Za-z0-9 .&'_-]+?)(?:\.|,|$| Avl)/i,
		/UPI\/P2[AM]\/\d+\/([^/\n.]+)/i,
		/\bfrom ([A-Za-z0-9 .&@'_-]+?)(?:\s+on\b|\.|,| UPI| Ref|$)/i,
		/received from ([A-Za-z0-9 .&@'_-]+?)(?: on|\.|,|$)/i,
	];
	for (const p of pats) { const m = s.match(p); if (m) { merchant = cleanMerchant(m[1]); if (merchant) break; } }
	const mode = /\bcard\b/i.test(s) ? 'card' : 'upi';
	let cat = null;
	if (type === 'out') { for (const [c, re] of MERCH_CAT) if (re.test(merchant) || (c !== 'household' && re.test(s.replace(/sbi|hdfc|icici|axis|kotak|pnb|paytm|phonepe|google pay|gpay/gi, '')))) { cat = c; break; } }
	else cat = /(salary|sal\b|payroll)/i.test(s) ? 'salary' : /(pvt\.? ?ltd|limited|ltd\b|technologies|software|solutions|services|infotech)/i.test(merchant || s) && amt >= 1000000 ? 'salary' : /(interest|int\.? cr)/i.test(s) ? 'interest' : 'otherin';
	const bank = (s.match(/\b(SBI|HDFC|ICICI|Axis|Kotak|PNB|Paytm|PhonePe|Google Pay|GPay|Bank of Baroda|BOB|Canara|Union Bank|IDFC|Yes Bank|IndusInd)\b/i) || [])[1] || '';
	return { ok: true, type, amt, date, merchant, mode, cat, bank, dated: !!smsDate(s, today) };
}

/* sha256 & codes */
const SHA_K = (() => { const k = []; let n = 2; while (k.length < 64) { let p = true; for (let i = 2; i * i <= n; i++) if (n % i === 0) { p = false; break; } if (p) k.push((Math.cbrt(n) % 1) * 4294967296 | 0); n++; } return k; })();
const SHA_H = (() => { const h = []; let n = 2; while (h.length < 8) { let p = true; for (let i = 2; i * i <= n; i++) if (n % i === 0) { p = false; break; } if (p) h.push((Math.sqrt(n) % 1) * 4294967296 | 0); n++; } return h; })();
export function sha256(str) {
	const b = new TextEncoder().encode(String(str)), l = b.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
	m.set(b); m[l] = 0x80; const bits = l * 8;
	m[n - 4] = bits >>> 24; m[n - 3] = bits >>> 16; m[n - 2] = bits >>> 8; m[n - 1] = bits; m[n - 5] = Math.floor(bits / 4294967296);
	const H = SHA_H.slice(), W = new Int32Array(64);
	const r = (x, y) => (x >>> y) | (x << (32 - y));
	for (let o = 0; o < n; o += 64) {
		for (let i = 0; i < 16; i++) W[i] = (m[o + i * 4] << 24) | (m[o + i * 4 + 1] << 16) | (m[o + i * 4 + 2] << 8) | m[o + i * 4 + 3];
		for (let i = 16; i < 64; i++) { const a = W[i - 15], c = W[i - 2]; W[i] = (W[i - 16] + (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) + W[i - 7] + (r(c, 17) ^ r(c, 19) ^ (c >>> 10))) | 0; }
		let [a, bb, c, d, e, f, g, h] = H;
		for (let i = 0; i < 64; i++) {
			const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + SHA_K[i] + W[i]) | 0;
			const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
			h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
		}
		H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
	}
	return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
export const pinHash = (secret, pin) => sha256('gk3pin|' + secret + '|' + pin);

/* family secret: 12 Crockford base-32 characters, shown as XXXX-XXXX-XXXX (no I, L, O, U) */
export const CROCK = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function newSecret(rnd) {
	const b = new Uint8Array(12);
	if (rnd) for (let i = 0; i < 12; i++) b[i] = Math.floor(rnd() * 256); else globalThis.crypto.getRandomValues(b);
	return [...b].map(x => CROCK[x & 31]).join('');
}
// case-insensitive, ignores spaces/dashes, reads O as 0 and I/L as 1; null when not a 12-character code
export function normSecret(s) {
	const t = String(s || '').toUpperCase().replace(/[\s\-–—_.]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
	return /^[0-9A-HJKMNP-TV-Z]{12}$/.test(t) ? t : null;
}
export const fmtSecret = s => (s ? s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12) : '');
export const isUtr = u => /^\d{12}$/.test(String(u || '').replace(/\s/g, ''));
// UPI deep link (NPCI "upi://pay" intent). am is in paise.
export const isVpa = v => /^[a-z0-9._-]{2,256}@[a-z][a-z0-9.-]{1,63}$/i.test(String(v || '').trim());
export function upiPayLink({pa, pn, am, tn}) {
	const q = [`pa=${encodeURIComponent(String(pa).trim())}`, `pn=${encodeURIComponent(pn || '')}`];
	if (am) q.push(`am=${(am / 100).toFixed(2)}`);
	q.push('cu=INR');
	if (tn) q.push(`tn=${encodeURIComponent(tn)}`);
	return 'upi://pay?' + q.join('&');
}

/* keys & ids */
const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export function randomKey(n = 22, rnd) {
	const bytes = new Uint8Array(n * 2);
	if (rnd) for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(rnd() * 256);
	else globalThis.crypto.getRandomValues(bytes);
	let s = ''; for (let i = 0; s.length < n && i < bytes.length; i++) if (bytes[i] < 248) s += B62[bytes[i] % 62];
	while (s.length < n) s += B62[Math.floor(Math.random() * 62)];
	return s;
}
export function newId(prefix = 'r') { return prefix + Date.now().toString(36) + randomKey(6); }

/* export: CSV & ICS */
const csvq = v => { const s = String(v == null ? '' : v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function toCSV(st, lang) {
	const en = lang === 'en';
	const head = en ? ['Date', 'Type', 'Category', 'Amount (₹)', 'Note', 'Who', 'Mode', 'Linked to'] : ['तारीख', 'प्रकार', 'श्रेणी', 'राशि (₹)', 'नोट', 'किसने', 'माध्यम', 'जुड़ा'];
	const TY = en ? { in: 'Came in', save: 'Saved', out: 'Spent' } : { in: 'आया', save: 'बचाया', out: 'गया' };
	const MO = en ? { upi: 'UPI', cash: 'Cash', card: 'Card' } : { upi: 'UPI', cash: 'नकद', card: 'कार्ड' };
	const rows = [head];
	for (const t of st.tx) {
		const c = catOf(st, t.cat), m = memberOf(st, t.who);
		const link = t.billId ? (st.byId.get(t.billId) || {}).name : t.svcId ? (st.byId.get(t.svcId) || {}).name + ' ' + (t.svcMonth || '') : t.goalId ? (st.byId.get(t.goalId) || {}).name : '';
		rows.push([t.date, TY[t.type] || t.type, catName(c, lang), rupeesStr(t.amt), t.note || '', m ? m.name : '', MO[t.mode] || '', link || '']);
	}
	for (const l of st.lends) rows.push([l.date, en ? (l.dir === 'gave' ? 'Lent' : 'Borrowed') : (l.dir === 'gave' ? 'उधार दिया' : 'उधार लिया'), l.person, rupeesStr(l.amt), (l.note || '') + (l.settled ? (en ? ' (settled)' : ' (चुकता)') : ` (${en ? 'left' : 'बाक़ी'} ${rupeesStr(lendLeft(l))})`), '', '', '']);
	for (const x of st.shagun) rows.push([x.date, en ? (x.dir === 'gave' ? 'Shagun given' : 'Shagun received') : (x.dir === 'gave' ? 'शगुन दिया' : 'शगुन मिला'), x.person, rupeesStr(x.amt), [x.occasion, x.note].filter(Boolean).join(' · '), '', '', '']);
	return '\uFEFF' + rows.map(r => r.map(csvq).join(',')).join('\r\n') + '\r\n';
}
const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const icsDate = s => s.replace(/-/g, '');
function icsWrap(events, now) {
	const stamp = new Date(now).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
	return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ghar Kharch//GK3//HI', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
		...events.flatMap(e => ['BEGIN:VEVENT', 'UID:' + e.uid, 'DTSTAMP:' + stamp, ...e.lines, 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n') + '\r\n';
}
export function billRRule(b) {
	return {m: 'FREQ=MONTHLY' + (b.dueDay ? ';BYMONTHDAY=' + Math.min(b.dueDay, 28 < b.dueDay ? -1 : b.dueDay) : ''), '2m': 'FREQ=MONTHLY;INTERVAL=2', '3m': 'FREQ=MONTHLY;INTERVAL=3', y: 'FREQ=YEARLY', '28d': 'FREQ=DAILY;INTERVAL=28', '84d': 'FREQ=DAILY;INTERVAL=84'}[b.cycle] || '';
}
export function icsBills(st, today, lang, now = Date.now()) {
	const en = lang === 'en', ev = [];
	for (const b of st.bills) {
		if (b.active === false || b.cycle === 'need') continue;
		const next = billNext(st, b, today) || b.nextDue; if (!next) continue;
		const start = next < today ? billOcc(b, today, addDays(today, 800))[0] || next : next;
		const title = (en ? 'Pay: ' : 'भरना है: ') + b.name + (b.amt ? ' ' + fmt(b.amt) : '');
		ev.push({uid: 'gk3-bill-' + b.id + '@gharkharch', lines: ['DTSTART;VALUE=DATE:' + icsDate(start), 'DTEND;VALUE=DATE:' + icsDate(addDays(start, 1)), 'RRULE:' + billRRule(b), 'SUMMARY:' + icsEsc(title), 'DESCRIPTION:' + icsEsc(en ? 'Ghar Kharch reminder' : 'घर खर्च याद'), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(title), 'TRIGGER:-PT15H', 'END:VALARM']});
	}
	return icsWrap(ev, now);
}
export function icsDaily(lang, today, now = Date.now()) {
	const en = lang === 'en', t = en ? 'Write today\'s expenses — Ghar Kharch' : 'हिसाब लिखें — घर खर्च';
	return icsWrap([{uid: 'gk3-daily@gharkharch', lines: ['DTSTART;TZID=Asia/Kolkata:' + icsDate(today) + 'T210000', 'DURATION:PT10M', 'RRULE:FREQ=DAILY', 'SUMMARY:' + icsEsc(t), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(t), 'TRIGGER:PT0M', 'END:VALARM']}], now)
		.replace('METHOD:PUBLISH\r\n', 'METHOD:PUBLISH\r\nBEGIN:VTIMEZONE\r\nTZID:Asia/Kolkata\r\nBEGIN:STANDARD\r\nDTSTART:19700101T000000\r\nTZOFFSETFROM:+0530\r\nTZOFFSETTO:+0530\r\nTZNAME:IST\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\n');
}

/* phone reminders: the app writes this plan for the next 8 days; the service worker shows what is due */
// o: {lang, at(date, hour) → ms, trialLeft, target}
export function reminderPlan(st, today, o) {
	const en = o.lang === 'en', out = [], s = st.settings, until = addDays(today, 8);
	for (let d = today; d < until; d = addDays(d, 1)) {
		out.push({tag: 'daily-' + d, kind: 'daily', date: d, at: o.at(d, 21), title: en ? 'Today\'s accounts' : 'आज का हिसाब',
			body: en ? 'Write today\'s spends — it takes a minute. Milk, vegetables, auto…' : 'आज के खर्च लिख लें — एक मिनट लगेगा। दूध, सब्ज़ी, ऑटो…'});
		if (s.income > 0 && +d.slice(8) === Math.min(s.payday || 1, dim(+d.slice(0, 4), +d.slice(5, 7)))) {
			const t = o.target || 0;
			out.push({tag: 'payday-' + d, kind: 'payday', date: d, at: o.at(d, 9), title: en ? 'Payday — save first' : 'तनख़्वाह का दिन — पहले बचत',
				body: t ? (en ? `Put ${fmt(t)} into savings first, then spend without worry.` : `पहले ${fmt(t)} बचत में डालें, फिर बेफ़िक्र खर्च।`) : (en ? 'Write the salary and set savings aside first.' : 'तनख़्वाह लिखें और पहले बचत अलग करें।')});
		}
	}
	for (const x of dues(st, today, 1)) {
		if (x.kind === 'svc' && !x.prev) continue;
		const when = x.kind === 'bill' && x.due > today ? addDays(x.due, -1) : today;
		const who = x.kind === 'svc' ? svcCall(x.svc, o.lang) : x.bill.name;
		out.push({tag: 'due-' + x.key, kind: 'dues', date: when, at: o.at(when, x.kind === 'bill' && x.due > today ? 19 : 10),
			title: x.kind === 'svc' ? (en ? `${fmt(x.amt)} due to ${who}` : `${who} का ${fmt(x.amt)} बाक़ी`) : x.due > today ? (en ? `Tomorrow: ${who} ${fmt(x.amt)}` : `कल ${who} — ${fmt(x.amt)}`) : (en ? `${who} ${fmt(x.amt)} is due` : `${who} — ${fmt(x.amt)} भरना बाक़ी`),
			body: en ? 'Open Ghar Kharch to pay or mark it paid.' : 'घर खर्च खोलकर भुगतान करें या "चुकाया" दबाएँ।'});
	}
	if (o.trialLeft > 0) for (const n of [7, 3, 1]) {
		if (o.trialLeft < n) continue;
		const d = addDays(today, o.trialLeft - n);
		if (d >= until) continue;
		out.push({tag: 'trial-' + n, kind: 'trial', date: d, at: o.at(d, 11), title: n === 1 ? (en ? 'Last day of your Pro trial' : 'आज Pro ट्रायल का आख़िरी दिन') : (en ? `Pro trial ends in ${n} days` : `Pro ट्रायल ${n} दिन में ख़त्म`),
			body: en ? 'Keep family sync and all helpers for ₹399/year. Your data is never deleted.' : '₹399/साल में परिवार सिंक और सारी सेवाएँ चालू रखें। आपका हिसाब कभी नहीं मिटेगा।'});
	}
	return out.sort((a, b) => a.at - b.at);
}

/* merge (sync) */
// last-writer-wins by `updated`; returns true when remote replaces local
export function newer(remote, local) {
	if (!local) return true;
	const a = remote.updated || 0, b = local.updated || 0;
	return a > b || (a === b && String(remote.by || '') > String(local.by || ''));
}
