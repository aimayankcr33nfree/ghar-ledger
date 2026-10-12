// First run (≤60 s), joining a family, coach marks.
import * as S from './store.js';
import * as C from './core.js';
import {h, dv, sp, bt, L, lang, fmt, toast, once, chips, toggle, field, icon, moneyInput, overlayLayer} from './ui.js';
import {G, today} from './ctx.js';
import * as Sync from './sync.js';
import {makeBill, makeSvc, anchorFor} from './khata.js';

const STEPS = 6; // language + 5 (+ mid-month when relevant)
let ob = null, step = 0, depth = 0, onPop = null, finishCb = null;

export function startOnboarding(done) {
	finishCb = done;
	const td = today();
	ob = {
		name: '', family: '', members: [], income: 0, payday: 1, cycleStart: '1', income2: 0, payday2: 1, more: false, pct: 20, amt: 0, saveMode: 'pct', opening: 0, bills: {}, svcs: {},
		salaryIn: null,
	};
	step = S.devGet('lang') && S.devGet('obStep') ? 0 : 0; depth = 0;
	onPop = () => {if (step > 0) {step--; depth = Math.max(0, depth - 1); render();}};
	window.addEventListener('popstate', onPop);
	history.replaceState({ob: 0}, '');
	render();
}
function go(n) {step = n; depth++; history.pushState({ob: depth}, ''); render(); window.scrollTo(0, 0);}
function main() {return document.getElementById('main');}
function dots(n) {return h('div', {class: 'ob-dots', 'aria-label': L(`कदम ${n} / ${STEPS - 1}`, `Step ${n} of ${STEPS - 1}`)}, Array.from({length: STEPS - 1}, (_, i) => h('i', {class: i < n ? 'on' : ''})));}
function shell(n, title, lead, body, foot, skip) {
	return h('div', {class: 'ob', 'data-step': n},
		dv('ob-top', n > 0 ? bt('iconbtn', {'aria-label': L('पीछे|Back'), onclick: () => history.back()}, icon('back')) : h('span'), dots(n),
			skip ? bt('linkbtn', {id: 'ob-skip', onclick: skip}, L('छोड़ें|Skip')) : h('span', {style: {width: '44px'}})),
		dv('ob-body', h('h1', null, title), lead ? h('p', {class: 'lead'}, lead) : null, body),
		foot ? dv('ob-foot', foot) : null);
}
function render() {
	const m = main(); m.textContent = '';
	document.getElementById('tabbar').classList.add('hide');
	const td = today();
	if (step === 0) {
		m.appendChild(h('div', {class: 'ob', 'data-step': 0},
			dv('brand', h('img', {src: 'icon-192.png', alt: ''}), h('h1', null, 'घर खर्च'), h('p', null, 'पहले बचत, फिर बेफ़िक्र खर्च — पूरा घर, एक हिसाब।'), h('p', {style: {fontSize: '15px', marginTop: '4px', color: 'var(--ink3)'}}, 'Save first, then spend without worry.')),
			h('div', {class: 'ob-body'},
				bt('langbtn', {id: 'lang-hi', onclick: () => pickLang('hi')}, 'हिन्दी', h('small', null, 'हिन्दी में चलाएँ')),
				bt('langbtn', {id: 'lang-en', onclick: () => pickLang('en')}, 'English', h('small', null, 'Use in English')))));
		return;
	}
	if (step === 1) {
		const nameIn = h('input', {class: 'inp', id: 'ob-name', value: ob.name, placeholder: L('जैसे: राहुल|e.g. Rahul'), autocomplete: 'given-name', maxlength: 20, oninput: e => {ob.name = e.target.value;}});
		let custom = '';
		const memWrap = h('div');
		const drawMem = () => {
			memWrap.textContent = '';
			memWrap.appendChild(dv('chips', C.MEMBER_CHIPS.map(([hi, en, e]) => {
				const nm = L(hi, en), on = ob.members.some(x => x.name === nm);
				return h('button', {class: 'chip' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', 'data-mem': hi, onclick: () => {if (on) ob.members = ob.members.filter(x => x.name !== nm); else ob.members.push({name: nm, emoji: e}); drawMem();}}, `${e} ${nm}`);
			}), ob.members.filter(x => !C.MEMBER_CHIPS.some(c => L(c[0], c[1]) === x.name)).map(x => bt('chip on', {'aria-pressed': 'true', onclick: () => {ob.members = ob.members.filter(y => y !== x); drawMem();}}, `🙂 ${x.name} ✕`))));
		};
		drawMem();
		const cIn = h('input', {class: 'inp', id: 'ob-custom', placeholder: L('कोई और — नाम लिखें|Someone else — type a name'), maxlength: 20, oninput: e => {custom = e.target.value;}});
		const addC = () => {if (custom.trim()) {ob.members.push({name: custom.trim(), emoji: '🙂'}); custom = ''; cIn.value = ''; drawMem();}};
		cIn.addEventListener('keydown', e => {if (e.key === 'Enter') addC();});
		m.appendChild(shell(1, L('घर में कौन-कौन?|Who is in the family?'), L('यह फ़ोन आपका है। बाक़ी सदस्य बाद में अपने फ़ोन से जुड़ सकते हैं।|This phone is yours. Others can join from their own phones later.'),
			h('div', null,
				field(L('आपका नाम|Your name'), nameIn),
				field(L('परिवार का नाम (चाहें तो)|Family name (optional)'), h('input', {class: 'inp', id: 'ob-family', value: ob.family, placeholder: L('जैसे: शर्मा परिवार|e.g. The Sharmas'), maxlength: 30, oninput: e => {ob.family = e.target.value;}})),
				h('div', {class: 'f-lab mt16'}, L('और कौन-कौन?|Who else?')), memWrap,
				h('div', {class: 'frow mt10'}, cIn, bt('btn line sm', {style: {flex: 'none'}, onclick: addC}, L('जोड़ें|Add'))),
				joinBox()),
			bt('btn pri', {id: 'ob-next', onclick: () => go(2)}, L('आगे|Next')), () => go(2)));
		return;
	}
	if (step === 2) {
		const dayPick = (id, val, set) => h('select', {class: 'inp', id, onchange: e => {set(+e.target.value); render();}}, Array.from({length: 31}, (_, i) => h('option', {value: i + 1, selected: val === i + 1}, String(i + 1))));
		const pdOpts = [1, 5, 7, 10];
		m.appendChild(shell(2, L('महीने की आमदनी|Monthly income'), L('लगभग काफ़ी है — इसी से रोज़ का नंबर बनता है।|A rough figure is fine — it makes the daily number.'),
			h('div', null,
				field(L('हर महीने लगभग (₹)|About every month (₹)'), moneyInput(ob.income, p => {ob.income = p || 0;}, {placeholder: L('जैसे 45,000|e.g. 45,000')})),
				field(L('तनख़्वाह किस तारीख को आती है?|Which day does income come?'), chips([...pdOpts.map(n => [n, String(n)]), [0, L('और|Other')]], pdOpts.includes(ob.payday) && !ob.otherDay ? ob.payday : 0, v => {if (v) {ob.payday = v; ob.otherDay = false;} else {ob.otherDay = true; ob.payday = ob.payday > 10 ? ob.payday : 15;} ob.cycleStart = ob.payday >= 15 ? 'payday' : '1'; render();})),
				ob.otherDay ? field(L('तारीख|Day'), dayPick('ob-payday', ob.payday, v => {ob.payday = v; ob.cycleStart = v >= 15 ? 'payday' : '1';})) : null,
				ob.payday > 1 ? field(L('महीना कब से गिनें?|When does your month start?'), chips([['1', L('1 तारीख से|On the 1st')], ['payday', L(`तनख़्वाह के दिन (${ob.payday} तारीख) से`, `On payday (the ${ob.payday}th)`)]], ob.cycleStart, v => {ob.cycleStart = v; render();}, {id: 'ob-cycle'}),
					ob.cycleStart === 'payday' ? L(`${ob.payday} तारीख की तनख़्वाह से अगली ${ob.payday} तारीख तक का खर्च चलेगा।`, `Salary on the ${ob.payday}th pays for spends until the next ${ob.payday}th.`) : L('तनख़्वाह जिस महीने में आती है, उसी महीने में गिनी जाएगी।|Salary counts in the calendar month it arrives.')) : null,
				ob.more ? h('div', {class: 'box mt12', id: 'ob-more'},
					field(L('दूसरी आमदनी — हर महीने (₹)|Second income — every month (₹)'), moneyInput(ob.income2, p => {ob.income2 = p || 0;}, {placeholder: L('जैसे पत्नी की तनख़्वाह, किराया|e.g. spouse\'s salary, rent')})),
					field(L('किस तारीख को?|Which day?'), dayPick('ob-payday2', ob.payday2, v => {ob.payday2 = v;})))
					: bt('linkbtn mt8', {id: 'ob-more-btn', onclick: () => {ob.more = true; render();}}, L('+ घर में कोई और भी कमाता है?|+ Someone else earns too?'))),
			bt('btn pri', {id: 'ob-next', onclick: () => go(3)}, L('आगे|Next')), () => {ob.income = 0; go(3);}));
		return;
	}
	if (step === 3) {
		const prev = h('p', {class: 'lead', id: 'ob-save-preview', style: {fontWeight: 700, color: 'var(--pri-text)'}});
		const upd = () => {const v = ob.saveMode === 'amt' ? ob.amt : Math.round(ob.income * ob.pct / 100 / 100) * 100; prev.textContent = v ? L(`हर महीने पहले ${fmt(v)} बचत`, `Save ${fmt(v)} first every month`) : ob.saveMode === 'pct' && !ob.income ? L(`आमदनी का ${ob.pct}% पहले बचत`, `${ob.pct}% of income saved first`) : '';};
		const amtWrap = h('div');
		const draw = () => {amtWrap.textContent = ''; if (ob.saveMode === 'amt') amtWrap.appendChild(field(L('हर महीने (₹)|Every month (₹)'), moneyInput(ob.amt, p => {ob.amt = p || 0; upd();}))); upd();};
		m.appendChild(shell(3, L('पहले बचत|Save first'), L('तनख़्वाह आते ही यह हिस्सा अलग — फिर बाक़ी बेफ़िक्र खर्च।|This part goes aside as soon as income arrives — then spend the rest without worry.'),
			h('div', null, chips([[10, '10%'], [15, '15%'], [20, '20%'], [25, '25%'], ['amt', L('₹ रकम|₹ amount')]], ob.saveMode === 'amt' ? 'amt' : ob.pct, v => {if (v === 'amt') ob.saveMode = 'amt'; else {ob.saveMode = 'pct'; ob.pct = v;} draw();}), amtWrap, prev),
			bt('btn pri', {id: 'ob-next', onclick: () => go(4)}, L('आगे|Next')), () => {ob.saveMode = 'pct'; ob.pct = 0; go(4);}));
		draw();
		return;
	}
	if (step === 4) {
		m.appendChild(shell(4, L('हर महीने के पक्के खर्च|Regular payments'), L('जो लागू हों, उन्हें चालू करें। बाक़ी बाद में भी जोड़ सकते हैं।|Switch on the ones that apply. You can add more later.'),
			dv('regs', dv('reg-grp', L('बिल|Bills')), C.BILL_TPL.map(t => billReg(t)), dv('reg-grp', L('घरेलू सेवाएँ|Home help')), C.SVC_TPL.map(t => svcReg(t))),
			bt('btn pri', {id: 'ob-next', onclick: () => {if (zeroCheck()) return; needStep5() ? go(5) : finish();}}, L('आगे|Next')), () => {ob.bills = {}; ob.svcs = {}; needStep5() ? go(5) : finish();}));
		return;
	}
	if (step === 5) {
		const c = C.cycleFor(td, obSettings()), mid = c.start !== td, sal = salaryDue();
		if (sal.length && ob.salaryIn == null) ob.salaryIn = true;
		m.appendChild(shell(5, L('इस महीने अब तक|This month so far'), mid ? L(`महीना ${C.fmtDate(c.start, 'hi', {short: true})} से गिना जा रहा है।`, `Your month is counted from ${C.fmtDate(c.start, 'en', {short: true})}.`) : null,
			h('div', null,
				sal.length ? field(L(`इस महीने की तनख़्वाह आ गई? (${fmt(sal.reduce((a, x) => a + x.amt, 0))})`, `Has this month's salary come in? (${fmt(sal.reduce((a, x) => a + x.amt, 0))})`),
					chips([[true, L('हाँ, आ गई|Yes, it came')], [false, L('अभी नहीं|Not yet')]], ob.salaryIn, v => {ob.salaryIn = v; render();}, {id: 'ob-salary'}),
					ob.salaryIn ? L('आमदनी में लिख देंगे — बाद में बदल सकते हैं|We will write it as income — you can change it later') : L('जब आए, आज टैब पर एक टैप में लिखें|When it comes, write it in one tap on Today')) : null,
				mid ? field(L('इस महीने अब तक लगभग कितना खर्च हो चुका? (ऊपर के बिल-सेवाएँ छोड़कर)|Roughly how much has been spent this month so far? (leave out the bills and help above)'), moneyInput(ob.opening, p => {ob.opening = p || 0;}, {placeholder: L('जैसे 8,000|e.g. 8,000')})) : null),
			bt('btn pri', {id: 'ob-done', onclick: once(() => finish())}, L('हो गया — शुरू करें|Done — start')), () => {ob.opening = 0; ob.salaryIn = false; finish();}));
	}
}
function obSettings() {return {cycleStart: ob.payday > 1 ? ob.cycleStart : '1', payday: ob.payday};}
// income sources whose pay day has already come in the current month
function salaryDue() {
	const td = today(), c = C.cycleFor(td, obSettings()), out = [];
	const srcs = [[ob.income, ob.payday, 'salary'], ...(ob.more && ob.income2 > 0 ? [[ob.income2, ob.payday2, 'otherin']] : [])];
	for (const [amt, day, cat] of srcs) {
		if (!(amt > 0)) continue;
		const y = +c.start.slice(0, 4), mo = +c.start.slice(5, 7);
		let d = C.ymd(y, mo, Math.min(day, C.dim(y, mo)));
		if (d < c.start) d = C.addMonths(d, 1, day);
		if (d <= td) out.push({amt, date: d, cat});
	}
	return out;
}
function needStep5() {return C.cycleFor(today(), obSettings()).start !== today() || salaryDue().length > 0;}
// a bill or helper switched on without an amount is never dropped silently
function zeroCheck() {
	const miss = [];
	for (const t of C.BILL_TPL) {const v = ob.bills[t.tpl]; if (v && v.on && t.cycle !== 'need' && !(v.amt > 0)) miss.push(['b-' + t.tpl, L(t.hi, t.en)]);}
	for (const t of C.SVC_TPL) {const v = ob.svcs[t.tpl]; if (v && v.on && !(v.rate > 0)) miss.push(['s-' + t.tpl, L(t.hi, t.en)]);}
	if (!miss.length) return false;
	toast(L(`${miss[0][1]} की रकम लिखें — या उसे बंद कर दें`, `Enter the amount for ${miss[0][1]} — or switch it off`), {ms: 4000});
	const el = document.querySelector(`[data-reg="${miss[0][0]}"]`);
	if (el) {el.classList.add('need'); el.scrollIntoView({block: 'center'}); const i = el.querySelector('input'); if (i) setTimeout(() => i.focus(), 300);}
	return true;
}
// a phone joining an existing family can type the family code instead of opening the invite link
function joinBox() {
	const box = dv('mt18');
	let k = '';
	const draw = open => {
		box.textContent = '';
		box.appendChild(bt('linkbtn', {id: 'ob-join', 'aria-expanded': open ? 'true' : 'false', onclick: () => draw(!open)}, L('पहले से परिवार है? कोड से जुड़ें|Family already set up? Join with code')));
		if (open) box.appendChild(h('div', null, h('div', {class: 'frow mt8'}, h('input', {class: 'inp code-inp', id: 'ob-join-code', placeholder: 'XXXX-XXXX-XXXX', maxlength: 16, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', value: k, oninput: e => {k = e.target.value;}}),
			bt('btn pri sm', {style: {flex: 'none'}, id: 'ob-join-go', onclick: async () => {
				const s = C.normSecret(k);
				if (!s) {toast(L('कोड 12 अक्षरों का होता है — जैसे 7KQ4-M2XD-9RTB|The code has 12 characters — e.g. 7KQ4-M2XD-9RTB')); return;}
				cleanup(); await rewind(); startJoin(s, finishCb);
			}}, L('जुड़ें|Join'))), h('p', {class: 'note mt6'}, L('कोड परिवार के दूसरे फ़ोन में "घर" टैब पर दिखता है|The code is on another family phone, Home tab'))));
	};
	draw(false);
	return box;
}
function pickLang(l) {
	S.devSet({lang: l}); document.documentElement.lang = l;
	if (G.pendingJoin) {const k = G.pendingJoin; G.pendingJoin = null; cleanup(); startJoin(k, finishCb); return;}
	go(1);
}
function regRow(id, e, name, on, onTog, body) {
	return h('div', {class: 'reg' + (on ? ' on' : ''), 'data-reg': id},
		dv('reg-h', bt('reg-lab', {'aria-hidden': 'true', tabindex: '-1', onclick: () => onTog(!on)}, h('span', {class: 'row-ic', 'aria-hidden': 1}, e), sp('row-main row-t', name)), toggle(on, onTog, name)),
		on ? dv('reg-b', body) : null);
}
function billReg(t) {
	const v = ob.bills[t.tpl];
	const td = today(), y = +td.slice(0, 4), mo = +td.slice(5, 7);
	return regRow('b-' + t.tpl, t.e, L(t.hi, t.en), !!(v && v.on), on => {
		if (on) ob.bills[t.tpl] = v || {on: true, amt: 0, cycle: t.cycle, dueDay: t.dueDay || 5, next: C.addDays(td, t.cycle === '3m' ? 30 : t.cycle === 'y' ? 120 : 14), paid: null};
		else if (v) v.on = false;
		if (on && ob.bills[t.tpl]) ob.bills[t.tpl].on = true;
		render();
	}, v && v.on ? h('div', null,
		field(t.cycle === 'need' ? L('लगभग कितने का? (₹)|About how much? (₹)') : L('कितना? (₹)|Amount (₹)'), moneyInput(v.amt, p => {v.amt = p || 0;})),
		t.tpl === 'power' ? field(L('बिल कितने दिन में आता है?|How often?'), chips([['m', L('हर महीने|Monthly')], ['2m', L('2 महीने में|Every 2 months')]], v.cycle, c => {v.cycle = c; render();})) : null,
		v.cycle === 'm' ? h('div', null,
			field(L('हर महीने किस तारीख को?|Due on which day?'), h('select', {class: 'inp', onchange: e => {v.dueDay = +e.target.value; render();}}, Array.from({length: 31}, (_, i) => h('option', {value: i + 1, selected: v.dueDay === i + 1}, String(i + 1))))),
			h('div', {class: 'setrow', style: {padding: '8px 0'}}, dv('row-main', dv('row-t', L('इस महीने भर दिया?|Paid this month already?'))),
				toggle(v.paid == null ? Math.min(v.dueDay, C.dim(y, mo)) < +td.slice(8) : v.paid, x => {v.paid = x;}, L('इस महीने भर दिया?|Paid this month?'))))
			: v.cycle !== 'need' ? field(L('अगली बार कब?|Next due date'), h('input', {class: 'inp', type: 'date', value: v.next, min: td, onchange: e => {v.next = e.target.value || v.next;}})) : h('p', {class: 'note mt8'}, L('बस याद के लिए — बुक करने पर "भर दिया" दबाएँ।|Just a reminder — tap "paid" when you book one.'))) : null);
}
function svcReg(t) {
	const v = ob.svcs[t.tpl];
	return regRow('s-' + t.tpl, t.e, L(t.hi, t.en), !!(v && v.on), on => {
		if (on) ob.svcs[t.tpl] = v ? {...v, on: true} : {on: true, rate: 0, qty: t.qty != null ? t.qty : 1, free: t.freeLeaves || 0, phone: ''};
		else if (v) v.on = false;
		render();
	}, v && v.on ? h('div', null,
		t.type === 'fixed' ? h('div', null, field(L('महीने के कितने? (₹)|Per month (₹)'), moneyInput(v.rate, p => {v.rate = p || 0;})), field(L('कितनी छुट्टी माफ़?|Free leaves'), chips([0, 1, 2, 3, 4].map(n => [n, String(n)]), v.free, n => {v.free = n;})))
			: t.type === 'piece' ? field(t.unit === 'can' ? L('हर कैन का रेट (₹)|Rate per can (₹)') : L('हर कपड़े का रेट (₹)|Rate per piece (₹)'), moneyInput(v.rate, p => {v.rate = p || 0;}), t.unit === 'can' ? L('जिस दिन कैन आए, उस दिन गिनती लिखें — रोज़ नहीं|Write the count on days cans come — not every day') : null)
				: h('div', null, field(t.unit === 'L' ? L('रेट (₹ प्रति लीटर)|Rate (₹ per litre)') : L('रेट (₹ हर एक का)|Rate (₹ each)'), moneyInput(v.rate, p => {v.rate = p || 0;})), field(L('रोज़ कितना?|Daily'), chips((t.unit === 'L' ? [0.5, 1, 1.5, 2] : [1, 2]).map(n => [n, `${n === 0.5 ? '½' : n === 1.5 ? '1½' : n} ${C.unitLabel(t.unit, lang(), n)}`]), v.qty, n => {v.qty = n;}))),
		field(L('WhatsApp नंबर (चाहें तो)|WhatsApp number (optional)'), h('input', {class: 'inp', type: 'tel', inputmode: 'tel', value: v.phone, placeholder: '98XXXXXXXX', maxlength: 14, oninput: e => {v.phone = e.target.value.replace(/[^\d+]/g, '');}}))) : null);
}
function cleanup() {if (onPop) window.removeEventListener('popstate', onPop); onPop = null;}
async function rewind() {
	if (depth > 0) {await new Promise(res => {const f = () => {window.removeEventListener('popstate', f); res();}; window.addEventListener('popstate', f); history.go(-depth); setTimeout(res, 600);}); depth = 0;}
}
async function finish() {
	cleanup();
	await rewind();
	const td = today(), now = S.now(), secret = C.newSecret();
	const meId = C.newId('m');
	const members = [{id: meId, name: (ob.name || '').trim() || L('मैं|Me'), emoji: '🙂', color: C.MEMBER_COLORS[0]}, ...ob.members.map((x, i) => ({id: C.newId('m'), name: x.name, emoji: x.emoji, color: C.MEMBER_COLORS[(i + 1) % C.MEMBER_COLORS.length]}))];
	const os = obSettings(), incomes = ob.more && ob.income2 > 0 ? [{id: 'i1', name: '', amt: ob.income, day: ob.payday}, {id: 'i2', name: L('दूसरी आमदनी|Second income'), amt: ob.income2, day: ob.payday2}] : [];
	const set = {...C.defaultSettings(), familyName: (ob.family || '').trim(), members, income: ob.income + (incomes.length ? ob.income2 : 0), incomes, payday: ob.payday, cycleStart: os.cycleStart,
		savePct: ob.saveMode === 'pct' ? ob.pct : 0, saveAmt: ob.saveMode === 'amt' ? ob.amt : 0, plan: {created: now, paidUntil: '', code: '', type: ''}};
	const c = C.cycleFor(td, set);
	S.devSet({secret, me: meId, onboarded: true, coach: 'pending', firstDay: td, openDays: 1, lastOpen: td, closeShown: c.key, closedCycle: C.shiftCycle(c, -1, set).key});
	const recs = [{...set}];
	for (const t of C.BILL_TPL) {
		const v = ob.bills[t.tpl]; if (!v || !v.on) continue;
		if (t.cycle !== 'need' && !(v.amt > 0)) continue;
		const b = makeBill(t.tpl, {name: L(t.hi, t.en), amt: v.amt, cycle: v.cycle, dueDay: v.dueDay, nextDue: anchorFor(v.cycle, v.dueDay, v.next, td)});
		recs.push(b);
		const paid = v.cycle === 'm' && (v.paid == null ? b.nextDue < td : v.paid);
		if (paid) recs.push({id: C.newId('t'), kind: 'tx', type: 'out', amt: b.amt, cat: b.cat, note: b.name, date: b.nextDue <= td ? b.nextDue : (td > c.start ? C.addDays(td, -1) : td), who: meId, mode: 'upi', billId: b.id, billDue: b.nextDue, at: now, auto: true});
	}
	for (const t of C.SVC_TPL) {
		const v = ob.svcs[t.tpl]; if (!v || !v.on || !(v.rate > 0)) continue;
		recs.push(makeSvc(t.tpl, {name: L(t.hi, t.en), rate: v.rate, qty: v.qty, freeLeaves: v.free, leaveCut: t.type === 'fixed' ? Math.round(v.rate / 30 / 1000) * 1000 : 0, phone: v.phone, start: C.mkey(td) + '-01'}));
	}
	if (ob.salaryIn) for (const x of salaryDue()) recs.push({id: C.newId('t'), kind: 'tx', type: 'in', amt: x.amt, cat: x.cat, note: '', date: x.date, who: meId, mode: 'upi', at: now, auto: true});
	if (c.start !== td && ob.opening > 0) recs.push({id: C.newId('t'), kind: 'tx', type: 'out', amt: ob.opening, cat: 'opening', note: L('इस महीने पहले का खर्च|Spent earlier this month'), date: C.addDays(td, -1), who: meId, mode: 'cash', at: now, auto: true});
	S.putMany(recs.map(r => ({...r, by: meId})));
	ob = null;
	finishCb && finishCb({coach: true});
}

/* joining a family: the code is checked by fetching and opening the family's settings — never a ghost family */
export async function startJoin(key, done) {
	finishCb = done || finishCb;
	const secret = C.normSecret(key);
	const m = main(); document.getElementById('tabbar').classList.add('hide');
	if (!S.devGet('lang')) {G.pendingJoin = secret || key; startOnboarding(finishCb); return;}
	const box = dv('ob-body');
	m.textContent = '';
	m.appendChild(dv('ob', dv('brand', h('img', {src: 'icon-192.png', alt: ''}), h('h1', null, L('परिवार से जुड़ें|Join the family'))), box));
	const retry = (msg, o = {}) => {
		box.textContent = '';
		let v = o.code != null ? o.code : C.fmtSecret(secret || '');
		box.appendChild(h('div', null,
			h('div', {class: 'errbox', role: 'alert', id: 'join-err'}, msg),
			field(L('परिवार कोड|Family code'), h('input', {class: 'inp code-inp', id: 'join-code', value: v, maxlength: 16, placeholder: 'XXXX-XXXX-XXXX', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', oninput: e => {v = e.target.value;}}),
				L('परिवार के दूसरे फ़ोन में "घर" टैब पर दिखता है — बड़े-छोटे अक्षर से फ़र्क नहीं पड़ता|Shown on another family phone, Home tab — capitals do not matter')),
			h('div', {class: 'btnrow mt14'},
				bt('btn ghost', {id: 'join-back', onclick: () => {if (S.devGet('onboarded')) {location.hash = ''; done && done();} else {G.pendingJoin = null; startOnboarding(finishCb);}}}, L('पीछे|Back')),
				bt('btn pri', {id: 'join-retry', onclick: () => {const s2 = C.normSecret(v); if (!s2) {toast(L('कोड 12 अक्षरों का होता है|The code has 12 characters')); return;} startJoin(s2, done);}}, L('फिर से देखें|Try again')))));
	};
	if (!secret) return retry(L('यह कोड पूरा नहीं है — 12 अक्षर होने चाहिए, जैसे 7KQ4-M2XD-9RTB|This code is incomplete — it should have 12 characters, like 7KQ4-M2XD-9RTB'), {code: key || ''});
	box.appendChild(h('p', {class: 'lead', id: 'join-status'}, L('परिवार का हिसाब ला रहे हैं…|Fetching the family\'s accounts…')));
	const res = await Sync.readFamily(secret);
	if (!res.ok) {
		const msg = res.reason === 'notfound' ? L('परिवार नहीं मिला — कोड दोबारा देखें|Family not found — check the code again')
			: res.reason === 'rotated' ? L('यह कोड बदल दिया गया है — परिवार से नया कोड या लिंक माँगें|This code has been changed — ask the family for the new code or link')
				: L('जुड़ नहीं पाए — इंटरनेट देखें और फिर कोशिश करें|Could not connect — check the internet and try again');
		return retry(msg);
	}
	const hadData = S.all().some(r => r.kind === 'tx' && !r.deleted) && S.devGet('secret') !== secret;
	if (hadData || S.devGet('secret') !== secret) S.wipeRecords();
	Sync.adoptJoin(secret, res);
	S.mergeRemote(res.recs);
	const s = S.settings();
	let pick = null, name = '';
	const draw = () => {
		box.textContent = '';
		box.appendChild(h('div', null,
			h('h1', null, L('कौन हैं आप?|Who are you?')),
			h('p', {class: 'lead'}, s.familyName ? L(`${s.familyName} में आपका स्वागत है 🙏`, `Welcome to ${s.familyName} 🙏`) : L('इस फ़ोन पर कौन लिखेगा?|Who writes on this phone?')),
			h('div', {class: 'list mt12', role: 'radiogroup'}, S.settings().members.map(mm => bt('row' + (pick === mm.id ? ' on' : ''), {'data-member': mm.name, role: 'radio', 'aria-checked': pick === mm.id ? 'true' : 'false', onclick: () => {pick = mm.id; name = mm.name; draw();}},
				dv('row-ic', mm.emoji || '🙂'), dv('row-main row-t', mm.name), pick === mm.id ? sp('pill ok', '✓') : null)),
				bt('row' + (pick === 'new' ? ' on' : ''), {id: 'join-newrow', role: 'radio', 'aria-checked': pick === 'new' ? 'true' : 'false', onclick: () => {pick = 'new'; name = ''; draw(); const i = document.getElementById('join-name'); if (i) i.focus();}}, dv('row-ic', '+'), dv('row-main row-t', L('इनमें से कोई नहीं — नया नाम|None of these — a new name')))),
			field(pick && pick !== 'new' ? L('आपका नाम (बदल सकते हैं — जैसे "पत्नी" की जगह "मीरा")|Your name (you can change it — e.g. "Meera" instead of "Wife")') : L('आपका नाम|Your name'),
				h('input', {class: 'inp', id: 'join-name', maxlength: 20, value: name, placeholder: L('जैसे: मीरा|e.g. Meera'), oninput: e => {name = e.target.value; if (!pick) pick = 'new';}})),
			bt('btn pri block mt14', {id: 'join-go', onclick: once(() => go())}, L('शुरू करें|Start'))));
	};
	const go = () => {
		const nm = name.trim();
		if (!nm) {toast(L('अपना नाम चुनें या लिखें|Pick or type your name')); return;}
		const st = S.settings();
		let id = pick && pick !== 'new' ? pick : null;
		if (id) {const mm = st.members.find(x => x.id === id); if (mm && mm.name !== nm) S.saveSettings({members: st.members.map(x => (x.id === id ? {...x, name: nm} : x))});}
		else {id = C.newId('m'); S.saveSettings({members: [...st.members, {id, name: nm, emoji: '🙂', color: C.MEMBER_COLORS[st.members.length % 8]}]});}
		const td = today(), c = C.cycleFor(td, S.settings());
		S.devSet({me: id, onboarded: true, firstDay: td, openDays: 1, lastOpen: td, closeShown: c.key, closedCycle: C.shiftCycle(c, -1, S.settings()).key, coach: 'done'});
		location.hash = '';
		history.replaceState(null, '', location.pathname + location.search);
		toast(L('परिवार से जुड़ गए ✓|Joined the family ✓'));
		finishCb && finishCb({joined: true});
	};
	draw();
}

/* coach marks */
export function coach() {
	const steps = [
		['#fab', L('यहाँ से लिखें|Write here'), L('खर्च, आमदनी, बचत, उधार — सब इसी + से। बोलकर भी।|Spends, income, savings, loans — all from this +. You can speak too.')],
		['#hero', L('आज का नंबर|Today\'s number'), L('आज कितना और खर्च कर सकते हैं। टैप करें तो पूरा हिसाब दिखेगा।|How much more you can spend today. Tap it to see the full math.')],
		['#tab-khata', L('खाता|Khata'), L('दूधवाला, कामवाली, बिल, उधार, शगुन — सबका हिसाब यहाँ।|Milkman, maid, bills, loans, shagun — all accounts live here.')],
	];
	let i = 0;
	const hole = dv('coach-hole');
	const tip = h('div', {class: 'coach-tip', role: 'dialog', 'aria-live': 'polite'});
	const el = h('div', {class: 'coach', id: 'coach', onclick: e => {if (!e.target.closest('button')) next();}}, hole, tip);
	const api = overlayLayer(el, () => S.devSet({coach: 'done'}));
	const draw = () => {
		const [sel, t, d] = steps[i], target = document.querySelector(sel);
		const r = target ? target.getBoundingClientRect() : {left: 20, top: 100, width: 100, height: 60};
		Object.assign(hole.style, {left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px'});
		hole.classList.toggle('round', sel === '#fab');
		tip.textContent = '';
		tip.appendChild(h('b', null, t)); tip.appendChild(h('div', {class: 'note', style: {color: 'var(--ink2)', fontSize: '15px'}}, d));
		tip.appendChild(h('div', {class: 'btnrow mt12'}, h('span', {class: 'note', style: {alignSelf: 'center', flex: 1}}, `${i + 1}/3`), bt('btn pri sm', {id: 'coach-next', style: {flex: 'none'}, onclick: next}, i < 2 ? L('आगे|Next') : L('समझ गया|Got it'))));
		const below = r.top < window.innerHeight / 2;
		Object.assign(tip.style, below ? {top: r.top + r.height + 18 + 'px', bottom: 'auto'} : {bottom: window.innerHeight - r.top + 18 + 'px', top: 'auto'});
	};
	const next = () => {i++; if (i >= steps.length) api.close(); else draw();};
	requestAnimationFrame(draw);
	return api;
}
