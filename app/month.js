// महीना / Month
import * as S from './store.js';
import * as C from './core.js';
import {h, dv, sp, bt, L, lang, fmt, sheet, toast, once, chips, field, icon, moneyInput, emptyState, ring, download, openUrl, confirmSheet, dateField} from './ui.js';
import {G, today, me, cat, catLabel, familyName, isPro, pro} from './ctx.js';
import {header, reconLine} from './today.js';
import {entriesSheet} from './ops.js';

let mKey = null;
export function setMonth(k) {mKey = k;}
const curCycle = () => C.cycleFor(today(), S.settings());
const viewCycle = () => (mKey ? C.cycleByKey(mKey, S.settings()) : curCycle());

export function renderMonth() {
	const st = S.state(), td = today(), c = viewCycle(), cur = curCycle(), isCur = c.key === cur.key;
	const T = C.monthTotals(st, c);
	const first = st.tx.length ? st.tx[0].date : td;
	const canPrev = C.shiftCycle(c, -1, st.settings).end >= C.addDays(first, -1) || c.start > first;
	const sw = h('div', {class: 'mswitch card', style: {padding: '6px'}},
		bt('iconbtn', {id: 'm-prev', 'aria-label': L('पिछला महीना|Previous month'), disabled: !canPrev, style: {opacity: canPrev ? 1 : .3}, onclick: () => {mKey = C.shiftMonthKey(c.key, -1); G.render();}}, icon('back')),
		dv('t', h('b', {id: 'm-label'}, C.cycleTitle(c, lang())), h('span', null, C.cycleLabel(c, lang()))),
		bt('iconbtn', {id: 'm-next', 'aria-label': L('अगला महीना|Next month'), disabled: isCur, style: {opacity: isCur ? .3 : 1}, onclick: () => {if (!isCur) {mKey = C.shiftMonthKey(c.key, 1); if (mKey === cur.key) mKey = null; G.render();}}}, icon('next')));
	const R = C.reconcile(st, c, td), neg = T.bacha < 0;
	const tile = (k, label, v, dot, extra, cls) => h('button', {class: 'tile' + (cls ? ' ' + cls : ''), 'data-tile': k, onclick: () => tileSheet(k, c)},
		sp('k', dot ? h('i', {style: {background: dot}}) : null, label), sp('v num', fmt(v)), extra ? sp('p', extra) : null);
	const tiles = h('div', {class: 'tiles', id: 'tiles'},
		tile('aaya', L('आया|Came in'), T.aaya, '#2E9E5B', !T.aaya && R.incomeLeft > 0 ? L('तनख़्वाह अभी नहीं लिखी|Salary not written yet') : null),
		tile('bachaya', L('बचाया|Saved'), T.bachaya, '#C9972F', T.aaya > 0 ? L(`आमदनी का ${Math.round(T.bachaya / T.aaya * 100)}%`, `${Math.round(T.bachaya / T.aaya * 100)}% of income`) : null),
		tile('gaya', L('गया|Spent'), T.gaya, '#C2554A'),
		tile('bacha', L('बचा|Left'), T.bacha, null, isCur ? L(`${C.fmtDate(td, 'hi', {short: true})} तक`, `as of ${C.fmtDate(td, 'en', {short: true})}`) : L('महीने के आख़िर में|at month end'), 'bacha' + (neg ? ' neg' : '')));
	const elder = !!S.devGet('elder');
	return h('frag', null,
		header(L('महीना|Month'), familyName()),
		sw, tiles,
		T.n || R.incomeLeft ? reconLine(R, 'recon-month') : null,
		barsSection(st, c, td, isCur),
		elder ? null : budgetsSection(st, c, td, isCur),
		elder ? null : goalsSection(st, td, c, isCur),
		elder ? null : reportSection(st, c, td));
}
function tileSheet(k, c) {
	const st = S.state(), T = C.monthTotals(st, c), lb = C.cycleTitle(c, lang());
	const type = {aaya: 'in', bachaya: 'save', gaya: 'out'}[k];
	if (type) {
		const list = C.txIn(st, c, t => t.type === type);
		const title = {aaya: L('आया|Came in'), bachaya: L('बचाया|Saved'), gaya: L('गया|Spent')}[k] + ' · ' + lb;
		const ex = k === 'bachaya' ? L('बचत (SIP, RD, PPF, सोना, गुल्लक) कभी खर्च में नहीं गिनी जाती।|Savings (SIP, RD, PPF, gold, piggy bank) are never counted as spending.')
			: k === 'gaya' ? L('रोज़ के खर्च + भरे गए बिल + सेवाओं का भुगतान। उधार इसमें नहीं।|Daily spends + bills paid + services paid. Loans are not included.') : L('तनख़्वाह, धंधा, किराया मिला, ब्याज… उधार इसमें नहीं।|Salary, business, rent received, interest… Loans are not included.');
		return entriesSheet(title, list, {explain: dv('note', ex)});
	}
	const R = C.reconcile(st, c, today());
	return sheet({
		id: 'bacha', title: L('बचा|Left') + ' · ' + lb,
		body: () => h('div', {class: 'pad'},
			h('div', {class: 'box xl'},
				xr('', L('आया|Came in'), T.aaya), xr('−', L('बचाया|Saved'), T.bachaya), xr('−', L('गया|Spent'), T.gaya), xr('=', L('बचा|Left'), T.bacha, true)),
			h('div', {class: 'box xl mt14'},
				h('div', {class: 'xl-l', style: {padding: '8px 2px 4px'}}, L('यह बचा कहाँ है|Where this "left" is')),
				C.reconParts(R, lang()).map(([l, v], i) => xr(i ? (v < 0 ? '−' : '+') : '', l, Math.abs(v))),
				xr('=', L('बचा|Left'), R.bacha, true)),
			h('p', {class: 'note mt12'}, L('"रोज़ के लिए" वही पैसा है जो आज टैब पर बँटता है। बाक़ी बिल/सेवाओं का पैसा पहले से अलग रखा है।|"For daily spends" is the money the Today tab splits over the days. Money for unpaid bills and help is kept aside.'))),
	});
}
function xr(op, label, amt, eq) {return h('div', {class: 'xl-r' + (eq ? ' eq' : '')}, sp('xl-op', op), dv('xl-m', dv('xl-l', label)), sp('xl-a', fmt(amt)));}

function barsSection(st, c, td, isCur) {
	const bars = C.catStats(st, c, td);
	if (!bars.length) return h('section', {class: 'sec'}, dv('sec-h', h('h3', null, L('कहाँ गया|Where it went'))), dv('list', emptyState('🌱', L('इस महीने अभी कोई खर्च नहीं|No spends this month yet'))));
	const max = bars[0].amt;
	return h('section', {class: 'sec'}, dv('sec-h', h('h3', null, L('कहाँ गया|Where it went')), h('span', {class: 'meta', id: 'bars-vs'}, compareLabel(st, c, td))),
		h('div', {class: 'card bars', id: 'bars'}, bars.map(b => {
			const cc = cat(b.cat);
			const d = b.delta == null || b.delta === 0 ? null : b.delta > 0 ? sp('up', '↑ ' + fmt(b.delta)) : sp('down', '↓ ' + fmt(-b.delta));
			return bt('bar', {'data-cat': b.cat, onclick: () => entriesSheet(`${cc.e} ${catLabel(b.cat)} · ${C.cycleTitle(c, lang())}`, C.txIn(st, c, t => t.type === 'out' && t.cat === b.cat))},
				dv('bar-t', sp('bar-n', `${cc.e} ${catLabel(b.cat)}`), sp('bar-a num', fmt(b.amt))),
				dv('bar-track', h('i', {style: {width: Math.max(2, b.amt / max * 100).toFixed(1) + '%'}})),
				dv('bar-s', h('span', null, L(`${b.n} एंट्री`, `${b.n} ${b.n === 1 ? 'entry' : 'entries'}`)), d));
		})));
}
// "vs 30 Aug–11 Sep": the real matching days of the previous cycle
function compareLabel(st, c, td) {
	const P = C.prevSameDays(c, td, st.settings), d = s => C.fmtDate(s, lang(), {short: true}), rng = `${d(P.start)}–${d(P.end)}`;
	if (!P.partial) return L(`पिछले महीने (${C.cycleMonth(P.prev, 'hi')}) से`, `vs ${C.cycleMonth(P.prev, 'en')}`);
	return c.start.slice(8) === '01' ? L(`पिछले महीने के पहले ${P.days} दिन से`, `vs ${rng}`) : L(`${rng} से`, `vs ${rng}`);
}
function budgetsSection(st, c, td, isCur) {
	const B = C.budgetStatus(st, c, td);
	if (!B.length) return null;
	return h('section', {class: 'sec'}, dv('sec-h', h('h3', null, L('डिब्बे|Budgets')), bt('linkbtn', {onclick: () => G.openPlan && G.openPlan('budgets')}, L('बदलें|Edit'))),
		h('div', {class: 'card bars', id: 'budgets'}, B.map(b => {
			const cc = cat(b.cat), over = b.left < 0;
			return bt('bar', {onclick: () => entriesSheet(`${cc.e} ${catLabel(b.cat)}`, C.txIn(st, c, t => t.type === 'out' && t.cat === b.cat))},
				dv('bar-t', sp('bar-n', `${cc.e} ${catLabel(b.cat)}`), h('span', {class: 'bar-a num' + (over ? ' up' : '')}, over ? L(`${fmt(-b.left)} ज़्यादा`, `${fmt(-b.left)} over`) : L(`${fmt(b.left)} बचे`, `${fmt(b.left)} left`))),
				dv('bar-track', h('i', {class: over ? 'over' : '', style: {width: (Math.min(1, b.pct) * 100).toFixed(1) + '%'}})),
				dv('bar-s', sp('num', `${fmt(b.spent)} / ${fmt(b.budget)}`), isCur && !over && b.daysLeft ? h('span', null, L(`${fmt(b.perDay)}/दिन · ${b.daysLeft} दिन`, `${fmt(b.perDay)}/day · ${b.daysLeft} days`)) : null));
		})));
}
function goalsSection(st, td, c, isCur) {
	const goals = st.goals.filter(g => g.active !== false);
	const addBtn = bt('linkbtn', {id: 'add-goal', onclick: () => pro('goals', () => goalForm(null))}, '+ ' + L('नया गुल्लक|New goal'));
	const presets = C.festivalPresets(st, td).filter(f => !goals.some(g => g.preset === f.id));
	const presetRow = presets.length ? h('div', {class: 'chips mt10', id: 'festivals'}, presets.map(f => bt('chip', {'data-preset': f.id, onclick: () => pro('goals', () => goalForm(null, f))},
		`${f.e} ${L(f.hi, f.en)} · ${C.fmtDate(f.by, lang(), {short: true})}`))) : null;
	if (!goals.length) return h('section', {class: 'sec'}, dv('sec-h', h('h3', null, L('त्योहार और गुल्लक|Festivals & goals'))),
		dv('card pad16', h('p', {class: 'lead', style: {margin: 0}}, L('त्योहार के महीने में तंगी न हो — पहले से थोड़ा-थोड़ा डालें।|Avoid a festival-month crunch — put a little aside every month.')),
			presetRow, bt('btn ghost sm mt12', {onclick: () => pro('goals', () => goalForm(null))}, L('अपना गुल्लक बनाएँ|Make your own goal'))));
	const need = isCur ? C.goalsNeedThisMonth(st, c, td) : 0;
	return h('section', {class: 'sec'}, dv('sec-h', h('h3', null, L('त्योहार और गुल्लक|Festivals & goals')), addBtn),
		need > 0 ? h('div', {class: 'needline', id: 'goals-need'}, L(`इस महीने गुल्लक के लिए ${fmt(need)} और चाहिए`, `Goals need ${fmt(need)} more this month`)) : null,
		h('div', {class: 'list', id: 'goals'}, goals.map(g => {
			const gs = C.goalStatus(st, g, td);
			return h('div', {class: 'goal', 'data-goal': g.id},
				h('div', {class: 'goal-top'},
					dv('ringwrap', ring(gs.pct, 58, 6), h('span', {class: 'e', 'aria-hidden': 1}, g.emoji || '🏺')),
					dv('row-main', dv('row-t', g.name),
						dv('row-s num', `${fmt(gs.saved)} / ${fmt(g.target)} · ${Math.round(gs.pct * 100)}%`),
						dv('row-s', gs.done ? L('पूरा हो गया 🎉|Done 🎉') : C.goalBy(g) ? L(`${fmt(gs.perMonth)}/महीना चाहिए · ${C.fmtDate(C.goalBy(g), 'hi', {short: true, year: true})} तक`, `${fmt(gs.perMonth)}/month needed · by ${C.fmtDate(C.goalBy(g), 'en', {short: true, year: true})}`) : ''))),
				h('div', {class: 'btnrow mt12'},
					bt('btn ghost sm', {onclick: () => pro('goals', () => goalForm(g))}, L('बदलें|Edit')),
					bt('btn pri sm', {style: {flex: 2}, 'data-deposit': g.id, onclick: () => pro('goals', () => depositSheet(g))}, L('पैसे डालें|Add money'))));
		})),
		presetRow);
}
function depositSheet(g) {
	let amt = 0, date = today(), btn;
	return sheet({
		id: 'deposit', title: `${g.emoji || '🏺'} ${g.name}`,
		body: () => dv('pad', h('p', {class: 'note'}, L('यह बचत में गिना जाएगा (बचाया), खर्च में नहीं।|This counts as saving, not spending.')),
			field(L('कितने डालें?|How much?'), moneyInput(0, p => {amt = p || 0; btn.textContent = amt ? L(`${fmt(amt)} गुल्लक में डालें`, `Add ${fmt(amt)}`) : L('डालें|Add');})),
			dateField(date, v => {date = v;})),
		foot: api => (btn = h('button', {
			class: 'btn pri block', id: 'deposit-go', onclick: once(async () => {
				if (!(amt > 0)) {toast(L('रकम लिखें|Enter amount')); return;}
				const t = S.put({id: C.newId('t'), kind: 'tx', type: 'save', amt, cat: 'gullak', note: g.name, date, who: me(), mode: 'upi', goalId: g.id, at: S.now()});
				await api.close(); toast(L(`${fmt(amt)} ${g.name} में डाले`, `${fmt(amt)} added to ${g.name}`), {undo: () => S.del(t.id)});
			}),
		}, L('डालें|Add'))),
	});
}
function goalForm(g, preset) {
	const v = g ? {...g} : preset ? {id: C.newId('o'), kind: 'goal', name: L(preset.hi, preset.en), emoji: preset.e, target: preset.amt, byDate: preset.by, preset: preset.id, active: true}
		: {id: C.newId('o'), kind: 'goal', name: '', emoji: '🪔', target: 0, byDate: C.addMonths(today(), 6), active: true};
	if (g && !v.byDate) v.byDate = C.goalBy(g) || C.addMonths(today(), 6);
	const EM = ['🪔', '🎒', '🏖️', '🛟', '🏍️', '💍', '🏠', '🎓', '🏺'];
	return sheet({
		id: 'goalform', title: g ? L('गुल्लक बदलें|Edit goal') : L('नया गुल्लक|New goal'),
		body: () => h('div', {class: 'pad'},
			!g && !preset ? field(L('जैसे|For example'), chips([[L('दिवाली|Diwali'), '🪔 ' + L('दिवाली|Diwali')], [L('स्कूल फ़ीस|School fees'), '🎒 ' + L('स्कूल फ़ीस|School fees')], [L('घूमने जाना|Trip'), '🏖️ ' + L('घूमने जाना|Trip')], [L('इमरजेंसी फ़ंड|Emergency fund'), '🛟 ' + L('इमरजेंसी फ़ंड|Emergency fund')]], null, n => {v.name = n; v.emoji = {[L('दिवाली|Diwali')]: '🪔', [L('स्कूल फ़ीस|School fees')]: '🎒', [L('घूमने जाना|Trip')]: '🏖️', [L('इमरजेंसी फ़ंड|Emergency fund')]: '🛟'}[n]; const i = document.getElementById('goal-name'); if (i) i.value = n;})) : null,
			field(L('नाम|Name'), h('input', {class: 'inp', id: 'goal-name', value: v.name, maxlength: 30, oninput: e => {v.name = e.target.value;}})),
			field(L('निशान|Icon'), chips(EM.map(e => [e, e]), v.emoji, e => {v.emoji = e;})),
			field(L('कितना चाहिए? (₹)|Target (₹)'), moneyInput(v.target, p => {v.target = p || 0;})),
			field(L('कब तक?|By when?'), h('input', {class: 'inp', type: 'date', value: v.byDate, min: today(), onchange: e => {v.byDate = e.target.value || v.byDate;}})),
			preset ? h('p', {class: 'note'}, L('रकम अपने हिसाब से बदल लें — हर महीने कितना डालना है, हम बता देंगे।|Change the amount to suit you — we will show how much to put aside each month.')) : null),
		foot: api => h('div', {class: 'btnrow'},
			g ? bt('btn ghost', {onclick: () => confirmSheet(L('गुल्लक हटाएँ?|Delete goal?'), L('इसमें डाली बचत, बचत में ही गिनी रहेगी।|Money saved stays counted as savings.'), L('हटाएँ|Delete'), async () => {await G.closeAll(); const p = S.get(g.id); S.del(g.id); toast(L('हटा दिया|Deleted'), {undo: () => S.restore(p)});}, {danger: true})}, L('हटाएँ|Delete')) : null,
			bt('btn pri', {id: 'goal-save', onclick: once(async () => {
				if (!v.name.trim() || !(v.target > 0)) {toast(L('नाम और रकम लिखें|Enter a name and target')); return;}
				S.put({...v, name: v.name.trim()}); await api.close(); toast(L('गुल्लक तैयार 🏺|Goal ready 🏺'));
			})}, L('सेव करें|Save'))),
	});
}
/* report card */
function reportSection(st, c, td) {
	const img = h('img', {class: 'report-prev', id: 'report-img', alt: L('महीने का रिपोर्ट कार्ड|Month report card')});
	setTimeout(() => {try {img.src = drawReport(st, c, td).toDataURL('image/png');} catch (e) {/* ignore */}}, 0);
	return h('section', {class: 'sec'}, dv('sec-h', h('h3', null, L('महीने का रिपोर्ट कार्ड|Month report card'))),
		img,
		h('div', {class: 'btnrow mt12'},
			bt('btn wa', {id: 'share-img', onclick: () => pro('report', () => shareImage(st, c, td))}, icon('share', 20), L('फ़ोटो भेजें|Share photo')),
			bt('btn ghost', {id: 'share-text', onclick: () => openUrl('https://wa.me/?text=' + encodeURIComponent(C.monthSummaryText(S.state(), c, lang(), today())))}, icon('wa', 20), L('लिखकर भेजें|Send text'))));
}
async function shareImage(st, c, td) {
	const cv = drawReport(st, c, td);
	const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
	const name = `ghar-kharch-${c.key}.png`;
	const text = C.monthSummaryText(st, c, lang(), td);
	try {
		const file = new File([blob], name, {type: 'image/png'});
		if (navigator.canShare && navigator.canShare({files: [file]})) {await navigator.share({files: [file], text}); return;}
	} catch (e) {if (e && e.name === 'AbortError') return;}
	download(name, 'image/png', blob);
	toast(L('फ़ोटो डाउनलोड हो गई — WhatsApp में भेजें|Image downloaded — send it on WhatsApp'), {action: () => openUrl('https://wa.me/?text=' + encodeURIComponent(text)), actLabel: 'WhatsApp'});
}
export function drawReport(st, c, td) {
	const R = C.reportData(st, c, td), T = R.totals, l = lang(), en = l === 'en';
	const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
	const x = cv.getContext('2d');
	const F = getComputedStyle(document.body).fontFamily || 'system-ui, "Noto Sans Devanagari", sans-serif';
	const font = (w, s) => {x.font = `${w} ${s}px ${F}`;};
	const g = x.createLinearGradient(0, 0, W, 520); g.addColorStop(0, '#14532D'); g.addColorStop(1, '#1F6E40');
	x.fillStyle = '#F4F2EA'; x.fillRect(0, 0, W, H);
	x.fillStyle = g; x.fillRect(0, 0, W, 560);
	x.fillStyle = 'rgba(232,190,100,.22)'; x.beginPath(); x.arc(W - 90, 60, 220, 0, Math.PI * 2); x.fill();
	x.fillStyle = '#F2CF7E'; font(700, 34); x.fillText(en ? 'GHAR KHARCH · MONTH REPORT' : 'घर खर्च · महीने का हिसाब', 80, 110);
	x.fillStyle = '#FFFFFF'; font(800, 68); x.fillText(fit(x, (R.family || (en ? 'Our home' : 'हमारा घर')), W - 160), 80, 200);
	font(500, 44); x.fillStyle = 'rgba(255,255,255,.9)'; x.fillText(C.cycleTitle(c, l) + (c.start.slice(8) !== '01' ? ` · ${C.cycleLabel(c, l)}` : ''), 80, 258);
	font(600, 32); x.fillStyle = '#F2CF7E'; x.fillText(en ? `as of ${C.fmtDate(R.asOf, l)}` : `${C.fmtDate(R.asOf, l)} तक`, 80, 306);
	// four numbers
	const cells = [[en ? 'Came in' : 'आया', T.aaya, '#146C35'], [en ? 'Saved' : 'बचाया', T.bachaya, '#7D5A0F'], [en ? 'Spent' : 'गया', T.gaya, '#A8261B'], [en ? 'Left' : 'बचा', T.bacha, '#14532D']];
	cells.forEach(([lab, v, col], i) => {
		const cx = 60 + (i % 2) * 490, cy = 330 + Math.floor(i / 2) * 210;
		x.fillStyle = '#FFFFFF'; rr(x, cx, cy, 470, 190, 28); x.fill();
		x.fillStyle = '#5E6D63'; font(600, 36); x.fillText(lab, cx + 34, cy + 62);
		x.fillStyle = col; font(800, 62); x.fillText(fit(x, fmt(v), 410), cx + 34, cy + 146);
	});
	// top categories
	let y = 810;
	x.fillStyle = '#17241C'; font(700, 40); x.fillText(en ? 'Top spends' : 'सबसे ज़्यादा खर्च', 80, y);
	const max = R.top.length ? R.top[0].amt : 1;
	R.top.forEach((t, i) => {
		const yy = y + 50 + i * 92;
		x.fillStyle = '#17241C'; font(600, 36); x.fillText(fit(x, `${t.cat.e} ${C.catName(t.cat, l)}`, 560), 80, yy + 36);
		font(700, 36); const a = fmt(t.amt); x.textAlign = 'right'; x.fillText(a, W - 80, yy + 36); x.textAlign = 'left';
		x.fillStyle = '#E3DFD3'; rr(x, 80, yy + 54, W - 160, 14, 7); x.fill();
		x.fillStyle = '#1C6B3D'; rr(x, 80, yy + 54, Math.max(14, (W - 160) * t.amt / max), 14, 7); x.fill();
	});
	if (!R.top.length) {x.fillStyle = '#5E6D63'; font(500, 34); x.fillText(en ? 'No spends yet' : 'अभी कोई खर्च नहीं', 80, y + 70);}
	// savings line
	y = 1170;
	x.fillStyle = '#FAF0D9'; rr(x, 60, y, W - 120, 104, 26); x.fill();
	x.fillStyle = '#7D5A0F'; font(700, 34);
	x.fillText(fit(x, (en ? `Saved ${R.rate}% · ${fmt(R.yearSaved)} this year` : `बचत ${R.rate}% · इस साल ${fmt(R.yearSaved)}`) + (R.streak >= 2 ? (en ? ` · ${R.streak} days in a row` : ` · लगातार ${R.streak} दिन`) : ''), W - 180), 90, y + 64);
	x.fillStyle = '#5E6D63'; font(500, 28); x.fillText(en ? 'Save first, then spend without worry.' : 'पहले बचत, फिर बेफ़िक्र खर्च।', 80, H - 30);
	return cv;
}
function rr(x, a, b, w, hh, r) {x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + hh, r); x.arcTo(a + w, b + hh, a, b + hh, r); x.arcTo(a, b + hh, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath();}
function fit(x, s, w) {let t = s; while (x.measureText(t).width > w && t.length > 3) t = t.slice(0, -2) + '…'; return t;}

/* month close: opens once on the first day of a new month; until the family decides, a card stays on Today */
function pendingClose() {
	const st = S.state(), td = today(), cur = curCycle();
	const prev = C.shiftCycle(cur, -1, st.settings);
	if (S.devGet('closedCycle') === prev.key || C.diffDays(cur.start, td) > 14) return null;
	const first = S.devGet('firstDay') || '';
	if (first && first > prev.end) return null; // this phone started after that month
	const T = C.monthTotals(st, prev);
	if (!T.n || T.bacha <= 0) return null;
	return {prev, cur, T};
}
export function maybeMonthClose() {
	const p = pendingClose(), cur = curCycle();
	if (!p || S.devGet('closeShown') === cur.key) return false;
	S.devSet({closeShown: cur.key});
	closeSheet();
	return true;
}
export function closeCard() {
	const p = pendingClose();
	if (!p) return null;
	const mon = C.cycleMonth(p.prev, lang());
	return h('div', {class: 'nudge gold', id: 'close-card'},
		dv('salary-t', L(`${mon} का हिसाब पूरा — ${fmt(p.T.bacha)} बचे`, `${mon} is done — ${fmt(p.T.bacha)} left`)),
		dv('salary-s', L('गुल्लक में डालें? बाक़ी बिल/सेवाओं का पैसा इस महीने के हिसाब में अलग रखा है।|Move it to savings? Money for unpaid bills and help is kept aside in this month.')),
		h('div', {class: 'btnrow mt12'},
			bt('btn gold sm', {id: 'close-open', style: {flex: 2}, onclick: () => closeSheet()}, L('देखें और डालें|See and save')),
			bt('btn ghost sm', {id: 'close-skip', onclick: () => {S.devSet({closedCycle: p.prev.key}); toast(L('ठीक है — पिछला महीना बंद|OK — last month closed'));}}, L('रहने दें|Not now'))));
}
export function closeSheet() {
	const p = pendingClose();
	if (!p) return null;
	const st = S.state(), {prev, cur, T} = p, td = today();
	// last month's bills/help that this month pays (already paid or still due) — reserved in this month's daily number
	const Lm = C.todayLimit(st, td);
	const carried = [...Lm.bills.lines.filter(x => x.status === 'paid' ? x.due < cur.start : x.prev).map(x => ({e: x.bill.emoji || '🧾', name: x.bill.name, amt: x.amt, paid: x.status === 'paid'})),
		...Lm.svcs.lines.filter(x => x.month && x.month < cur.key).map(x => ({e: x.svc.emoji || '🏠', name: `${x.svc.name} (${C.MON3[lang() === 'en' ? 'en' : 'hi'][+x.month.slice(5) - 1]})`, amt: x.amt, paid: x.status === 'paid'}))];
	const carriedSum = carried.reduce((a, x) => a + x.amt, 0);
	let amt = T.bacha, goalId = null;
	const mon = C.cycleMonth(prev, lang()), curMon = C.cycleMonth(cur, lang());
	return sheet({
		id: 'close', title: L(`${mon} का हिसाब पूरा`, `${mon} is done`),
		body: () => h('div', {class: 'pad'},
			dv('box xl', xr('', L('आया|Came in'), T.aaya), xr('−', L('बचाया|Saved'), T.bachaya), xr('−', L('गया|Spent'), T.gaya), xr('=', L('बचा|Left'), T.bacha, true)),
			carried.length ? h('div', {class: 'box mt14', id: 'close-carried'},
				dv('xl-l', L(`${mon} के बिल/सेवाएँ — ${curMon} के रोज़ के पैसे में पहले से अलग रखे हैं`, `${mon}'s bills and help — already set aside in ${curMon}'s daily money`)),
				carried.map(x => dv('xl-r', sp('xl-op', x.e), dv('xl-m', dv('xl-s', x.name + (x.paid ? L(' ✓ चुकाया| ✓ paid') : ''))), sp('xl-a', fmt(x.amt)))),
				dv('xl-r eq', sp('xl-op', ''), dv('xl-m', dv('xl-l', L('कुल|Total'))), sp('xl-a', fmt(carriedSum))),
				h('p', {class: 'note mt6'}, L(`इसलिए ${mon} के पूरे ${fmt(T.bacha)} खाली हैं — कोई रुपया दो बार नहीं गिना गया।`, `So all of ${mon}'s ${fmt(T.bacha)} is free — no rupee is counted twice.`))) : null,
			h('div', {class: 'mt14'},
				h('p', {class: 'lead'}, L(`${fmt(T.bacha)} गुल्लक में डालें?`, `Move ${fmt(T.bacha)} to savings?`)),
				field(L('कितने डालें?|How much?'), moneyInput(amt, v => {amt = v || 0;})),
				st.goals.filter(g => g.active !== false).length ? field(L('किस गुल्लक में?|Which goal?'), chips([[null, L('बस बचत|Just savings')], ...st.goals.filter(g => g.active !== false).map(g => [g.id, `${g.emoji || '🏺'} ${g.name}`])], null, v => {goalId = v;})) : null)),
		foot: api => h('div', {class: 'btnrow'},
			bt('btn ghost', {id: 'close-no', onclick: async () => {S.devSet({closedCycle: prev.key}); await api.close();}}, L('नहीं, रहने दें|No thanks')),
			bt('btn pri', {id: 'close-save', onclick: once(async () => {
				if (!(amt > 0)) {toast(L('रकम लिखें|Enter an amount')); return;}
				const t = S.put({id: C.newId('t'), kind: 'tx', type: 'save', amt, cat: 'gullak', note: L(`${mon} का बचा`, `${mon} leftover`), date: prev.end, who: me(), mode: 'upi', goalId: goalId || undefined, at: S.now()});
				S.devSet({closedCycle: prev.key});
				await api.close(); toast(L(`${fmt(amt)} गुल्लक में डाले`, `${fmt(amt)} moved to savings`), {undo: () => {S.del(t.id); S.devSet({closedCycle: ''});}});
			})}, L('गुल्लक में डालें|Save it'))),
	});
}
// "गुल्लक में डालें" on the last day of the month (and anywhere else a leftover can be saved)
export function saveLeftover(o) {
	let amt = o.amt || 0, goalId = null;
	const st = S.state(), goals = st.goals.filter(g => g.active !== false);
	return sheet({
		id: 'leftover', title: o.title || L('गुल्लक में डालें|Move to savings'),
		body: () => h('div', {class: 'pad'},
			o.explain ? h('p', {class: 'lead', id: 'leftover-why'}, o.explain) : null,
			h('p', {class: 'note'}, L('यह बचत में गिना जाएगा (बचाया), खर्च में नहीं। रोज़ का पैसा उतना घट जाएगा।|This counts as saving, not spending. The daily money goes down by the same amount.')),
			field(L('कितने डालें?|How much?'), moneyInput(amt, v => {amt = v || 0;})),
			goals.length ? field(L('किस गुल्लक में?|Which goal?'), chips([[null, L('बस बचत|Just savings')], ...goals.map(g => [g.id, `${g.emoji || '🏺'} ${g.name}`])], null, v => {goalId = v;})) : null),
		foot: api => bt('btn pri block', {id: 'leftover-go', onclick: once(async () => {
			if (!(amt > 0)) {toast(L('रकम लिखें|Enter an amount')); return;}
			const t = S.put({id: C.newId('t'), kind: 'tx', type: 'save', amt, cat: 'gullak', note: o.note || '', date: o.date || today(), who: me(), mode: 'upi', goalId: goalId || undefined, at: S.now()});
			if (o.key) S.devSet({[o.key]: o.cycle});
			await api.close(); toast(L(`${fmt(amt)} गुल्लक में डाले`, `${fmt(amt)} moved to savings`), {undo: () => {S.del(t.id); if (o.key) S.devSet({[o.key]: ''});}});
		})}, L('गुल्लक में डालें|Save it')),
	});
}
