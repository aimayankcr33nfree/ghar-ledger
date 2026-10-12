// + लिखें — the Add / Edit sheet, voice and SMS fill.
import * as S from './store.js';
import * as C from './core.js';
import {h, dv, sp, bt, L, lang, fmt, sheet, toast, hideToast, once, chips, toggle, field, icon, confirmSheet} from './ui.js';
import {G, today, me, cat, catLabel, MODE, modeLabel, memberName, typeName, isPro, pro, relDate} from './ctx.js';
import {setMark} from './ops.js';

const p2 = n => String(n).padStart(2, '0');
function toRaw(p) {if (!p) return ''; const r = Math.floor(p / 100), ps = p % 100; return ps ? `${r}.${p2(ps)}` : String(r);}
function sanitize(v) {
	let s = C.devToAsc(String(v || '')).replace(/₹|rs\.?|inr|[,\s ]/gi, '').replace(/[^\d.]/g, '');
	const i = s.indexOf('.');
	if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '');
	let [a, b] = s.split('.');
	a = (a || '').replace(/^0+(?=\d)/, '').slice(0, 9);
	if (b !== undefined) return (a || '0') + '.' + b.slice(0, 2);
	return a;
}
function display(raw) {if (!raw) return ''; const [a, b] = raw.split('.'); return C.groupIN(a || '0') + (b !== undefined ? '.' + b : '');}

export function openAdd(o = {}) {
	const st = S.state(), td = today(), s = st.settings, elder = !!S.devGet('elder');
	const edit = o.editId ? S.get(o.editId) : null;
	if (o.editId && !edit) return null;
	const f = {
		type: edit ? edit.type : (o.type || 'out'), raw: toRaw(edit ? edit.amt : o.amt || 0),
		cat: edit ? edit.cat : (o.cat || null), note: edit ? edit.note || '' : (o.note || ''), date: edit ? edit.date : (o.date || td),
		who: edit ? edit.who || me() : (o.who || me()), mode: edit ? edit.mode || 'upi' : (o.mode || (elder ? 'cash' : S.devGet('lastMode', 'upi'))), goalId: edit ? edit.goalId || null : (o.goalId || null),
		person: o.person || '', dir: o.dir || 'gave', occ: 'shaadi', shDir: 'gave', shSpend: s.giftSpend !== false, shIncome: false,
		catsOpen: false, optsOpen: !!o.note, confirmBig: false, saving: false,
	};
	if (elder && !edit) f.type = 'out';
	let saveBtn, amtIn, wordsEl, midEl, optsEl, msgEl, recentEl;
	const amt = () => C.parseAmount(f.raw) || 0;

	const sh = sheet({
		id: 'add', title: edit ? L('एंट्री बदलें|Edit entry') : L('लिखें|Add'), cls: 'tall add' + (elder ? ' eld' : ''), bare: true,
		body: () => {
			amtIn = h('input', {class: 'amtin', id: 'amt', inputmode: 'none', autocomplete: 'off', placeholder: '0', 'aria-label': L('रकम (₹)|Amount (₹)'), value: display(f.raw)});
			amtIn.addEventListener('input', () => {f.raw = sanitize(amtIn.value); amtIn.value = display(f.raw); f.confirmBig = false; upd();});
			amtIn.addEventListener('paste', e => {const t = (e.clipboardData || window.clipboardData)?.getData('text'); if (t && C.parseAmount(t) == null && /\d/.test(t) && t.length > 20) {e.preventDefault(); openSMS(t);}});
			wordsEl = h('div', {class: 'amt-words', 'aria-live': 'polite'});
			midEl = h('div'); optsEl = h('div'); msgEl = h('div'); recentEl = h('div');
			const types = edit ? ['out', 'in', 'save'] : ['out', 'in', 'save', 'lend', 'shagun'];
			const typesEl = h('div', {class: 'types', role: 'tablist'}, types.map(t => h('button', {
				role: 'tab', class: t === f.type ? 'on' : '', 'aria-selected': t === f.type ? 'true' : 'false', 'data-type': t,
				onclick: e => {
					if ((t === 'lend' || t === 'shagun') && !isPro()) {G.lockSheet('registers'); return;}
					if (f.type === t) return;
					f.type = t; if (!edit || t !== edit.type) f.cat = null; f.catsOpen = false; f.confirmBig = false;
					for (const b of e.currentTarget.parentNode.children) {const on = b === e.currentTarget; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');}
					renderMid(); renderOpts(); upd();
				},
			}, typeName(t))));
			const x = bt('iconbtn sh-x', {'aria-label': L('बंद करें|Close'), onclick: () => sh.close()}, icon('x', 22));
			return h('frag', null,
				dv('add-top', elder && !edit ? h('h2', {class: 'sh-title'}, L('खर्च लिखें|Write a spend')) : typesEl, x),
				dv('amtbox', sp('rs-big', '₹'), dv('amt-col', amtIn, wordsEl),
					bt('mic', {'aria-label': L('बोलकर लिखें|Speak'), onclick: () => openVoice(applyVoice)}, icon('mic', 26))),
				dv('add-mid', recentEl, midEl, msgEl, elder ? null : optsEl), keypad());
		},
		foot: () => {
			saveBtn = bt('btn pri go', {id: 'save', onclick: once(() => save(false))}, '');
			return h('div', {class: 'savebar'},
				edit ? bt('btn ghost more', {'aria-label': L('हटाएँ|Delete'), onclick: once(delEntry)}, icon('trash', 22), L('हटाएँ|Delete'))
					: elder ? null : bt('btn ghost more', {id: 'save-more', onclick: once(() => save(true))}, L('+ और|+ More')),
				saveBtn);
		},
	});
	if (!sh) return null;
	sh.el.addEventListener('focusin', e => {if (e.target.matches('input:not(#amt), textarea')) sh.el.classList.add('typing');});
	sh.el.addEventListener('focusout', () => sh.el.classList.remove('typing'));
	renderMid(); renderOpts(); upd();
	if (o.smsText) setTimeout(() => applySMS(o.smsText, true), 50);
	if (o.voiceText) setTimeout(() => applyVoice(C.parseVoice(o.voiceText, {today: td})), 50);
	return sh;

	function keypad() {
		const k = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
		const pad = h('div', {class: 'keypad noswipe', 'aria-label': L('अंक|Keypad')}, k.map(x => h('button', {
			type: 'button', 'aria-label': x === '⌫' ? L('मिटाएँ|Backspace') : x, 'data-k': x,
			onclick: () => {hideToast(); f.raw = x === '⌫' ? f.raw.slice(0, -1) : sanitize(f.raw + x); if (x === '.' && !f.raw.includes('.')) f.raw += '.'; amtIn.value = display(f.raw); f.confirmBig = false; upd();},
		}, x)));
		const bs = pad.lastChild; let t = null;
		bs.addEventListener('pointerdown', () => {t = setTimeout(() => {f.raw = ''; amtIn.value = ''; upd();}, 600);});
		['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => bs.addEventListener(ev, () => clearTimeout(t)));
		return pad;
	}
	function catButtons() {
		const list = C.sortedCats(S.state(), f.type, td);
		if (f.cat && !list.some(c => c.id === f.cat)) list.unshift(cat(f.cat));
		// elder: one clean row (3 most used + "सब"), so the big keypad fits without a half-cut row
		const cap = elder ? 3 : 7, many = list.length > cap + 1, shown = f.catsOpen || !many ? list : list.slice(0, cap);
		if (!f.catsOpen && many && f.cat && !shown.some(c => c.id === f.cat)) shown[cap - 1] = cat(f.cat);
		const grid = h('div', {class: 'catgrid' + (f.catsOpen ? ' open' : ''), role: 'radiogroup', 'aria-label': L('श्रेणी|Category')}, shown.map(c => h('button', {
			class: 'cat' + (c.id === f.cat ? ' on' : ''), role: 'radio', 'aria-checked': c.id === f.cat ? 'true' : 'false', 'data-cat': c.id,
			onclick: () => {if (f.cat === c.id) return; f.cat = c.id; f.confirmBig = false; f.catsOpen = false; renderMid(); upd();},
		}, h('span', {class: 'e', 'aria-hidden': 1}, c.e), h('span', null, C.catName(c, lang())))));
		if (many) grid.appendChild(bt('cat morecats', {'aria-expanded': f.catsOpen ? 'true' : 'false', onclick: () => {f.catsOpen = !f.catsOpen; renderMid();}},
			sp('e', f.catsOpen ? '▴' : '⋯'), sp('', f.catsOpen ? L('कम|Fewer') : L(`सब ${list.length}`, `All ${list.length}`))));
		return grid;
	}
	function renderRecent() {
		recentEl.textContent = '';
		if (edit || f.type !== 'out' || f.raw) return;
		const rec = C.recentSpends(S.state(), 4);
		if (!rec.length) return;
		recentEl.appendChild(h('div', {class: 'recent', id: 'recent', role: 'list', 'aria-label': L('हाल के|Recent')}, sp('rc-l', L('हाल के|Recent')),
			rec.map(r => bt('qchip', {role: 'listitem', onclick: () => {f.cat = r.cat; f.raw = toRaw(r.last); amtIn.value = display(f.raw); renderMid(); upd();}},
				sp('', cat(r.cat).e), catLabel(r.cat), sp('amt num', fmt(r.last))))));
	}
	function renderMid() {
		midEl.textContent = '';
		renderRecent();
		const st2 = S.state();
		if (f.type === 'out' || f.type === 'in' || f.type === 'save') {
			midEl.appendChild(catButtons());
			if (f.type === 'save' && st2.goals.some(g => g.active !== false)) {
				midEl.appendChild(field(L('किस गुल्लक में? (चाहें तो)|Into which goal? (optional)'), chips([[null, L('कोई नहीं|None')], ...st2.goals.filter(g => g.active !== false).map(g => [g.id, `${g.emoji || '🏺'} ${g.name}`])], f.goalId, v => {f.goalId = v;})));
			}
		} else if (f.type === 'lend') {
			const pin = h('input', {class: 'inp', id: 'person', placeholder: L('जैसे: राजू|e.g. Raju'), value: f.person, autocomplete: 'off', oninput: e => {f.person = e.target.value; upd();}});
			midEl.appendChild(h('div', {class: 'subform'},
				chips([['gave', L('मैंने दिया (लेना है)|I lent (to get back)')], ['took', L('मैंने लिया (देना है)|I borrowed (to return)')]], f.dir, v => {f.dir = v; renderMid(); upd();}),
				field(f.dir === 'gave' ? L('किसको दिया?|Lent to') : L('किससे लिया?|Borrowed from'), pin),
				h('p', {class: 'note mt8'}, f.dir === 'gave' ? L('आया/गया में नहीं गिना जाता, पर पैसा घर से गया — इसलिए रोज़ का पैसा घटेगा।|Not counted as spending, but the cash left home — so the daily money goes down.') : L('आया/गया में नहीं गिना जाता; लौटाते समय रोज़ का पैसा घटेगा।|Not counted as income; when you return it, the daily money goes down.'))));
		} else if (f.type === 'shagun') {
			const names = [...new Set(st2.shagun.map(x => x.person))];
			const dl = h('datalist', {id: 'shnames'}, names.map(n => h('option', {value: n})));
			const pin = h('input', {class: 'inp', id: 'person', list: 'shnames', placeholder: L('जैसे: शर्मा जी|e.g. Sharma ji'), value: f.person, autocomplete: 'off', oninput: e => {f.person = e.target.value; upd();}});
			midEl.appendChild(h('div', {class: 'subform'},
				chips([['gave', L('हमने दिया|We gave')], ['got', L('हमें मिला|We got')]], f.shDir, v => {f.shDir = v; renderMid(); upd();}),
				field(L('किसका/किसको|Person'), pin), dl,
				field(L('मौक़ा|Occasion'), chips(C.OCCASIONS.map(([k, hi, en]) => [k, L(hi, en)]), f.occ, v => {f.occ = v;})),
				h('div', {class: 'setrow', style: {padding: '8px 0'}}, h('div', {class: 'row-main'},
					dv('row-t', f.shDir === 'gave' ? L('खर्च में भी लिखें (शगुन-उपहार)|Also add as a spend (gifts)') : L('आमदनी में गिनें|Count as income')),
					dv('row-s', f.shDir === 'gave' ? L('महीने के "गया" में जुड़ेगा|Adds to the month\'s spending') : L('आम तौर पर शगुन आमदनी नहीं होता|Usually shagun is not income'))),
				toggle(f.shDir === 'gave' ? f.shSpend : f.shIncome, v => {if (f.shDir === 'gave') f.shSpend = v; else f.shIncome = v;}, L('खर्च/आमदनी में गिनें|Count in month')))));
		}
	}
	function renderOpts() {
		optsEl.textContent = '';
		const simple = f.type === 'lend' || f.type === 'shagun';
		const dateTxt = f.date === td ? L('आज|Today') : f.date === C.addDays(td, -1) ? L('कल|Yesterday') : C.fmtDate(f.date, lang(), {short: true});
		const ms = S.settings().members;
		const tog = () => {f.optsOpen = !f.optsOpen; renderOpts();};
		const row = h('div', {class: 'opts'},
			h('button', {class: 'opt' + (f.optsOpen ? ' on' : ''), 'aria-expanded': f.optsOpen ? 'true' : 'false', id: 'opt-date', onclick: tog}, '📅 ', dateTxt),
			ms.length > 1 && !simple ? h('button', {class: 'opt' + (f.optsOpen ? ' on' : ''), onclick: tog}, '👤 ', memberName(f.who) || L('मैं|Me')) : null,
			!simple && f.type === 'out' ? h('button', {class: 'opt' + (f.optsOpen ? ' on' : ''), onclick: tog}, modeLabel(f.mode)) : null,
			h('button', {class: 'opt' + (f.optsOpen ? ' on' : ''), id: 'opt-note', onclick: tog}, '📝 ', f.note ? (f.note.length > 14 ? f.note.slice(0, 13) + '…' : f.note) : L('नोट|Note')),
			!simple && !edit ? bt('opt', {id: 'opt-sms', onclick: () => openSMS('')}, '✉️ ', L('SMS से भरें|Fill from SMS')) : null);
		optsEl.appendChild(row);
		if (!f.optsOpen) return;
		const dIn = h('input', {class: 'inp', type: 'date', value: f.date, max: C.addDays(td, 0), 'aria-label': L('तारीख चुनें|Pick date'), onchange: e => {if (e.target.value) {f.date = e.target.value; renderOpts();}}});
		optsEl.appendChild(h('div', {class: 'box mt10'},
			dv('f-lab', L('कब|When')),
			dv('frow', chips([[td, L('आज|Today')], [C.addDays(td, -1), L('कल|Yesterday')]], f.date, v => {f.date = v; renderOpts();}, {keep: true}), dIn),
			ms.length > 1 && !simple ? h('div', null, h('div', {class: 'f-lab mt12'}, L('किसने|Who')), chips(ms.map(m => [m.id, `${m.emoji || '🙂'} ${m.name}`]), f.who, v => {f.who = v; renderOpts();}, {keep: true})) : null,
			!simple && f.type === 'out' ? h('div', null, h('div', {class: 'f-lab mt12'}, L('कैसे दिए|Paid by')), chips(MODE(), f.mode, v => {f.mode = v; renderOpts();}, {keep: true})) : null,
			h('div', {class: 'f-lab mt12'}, L('नोट|Note')),
			h('input', {class: 'inp', id: 'note', value: f.note, maxlength: 80, placeholder: L('जैसे: आलू, प्याज़|e.g. onions, potatoes'), oninput: e => {f.note = e.target.value;}, onchange: () => renderOptsKeepFocus()})));
	}
	function renderOptsKeepFocus() {/* note text shows in the chip once the user leaves the field */ const n = optsEl.querySelector('#opt-note'); if (n) n.textContent = '📝 ' + (f.note ? (f.note.length > 14 ? f.note.slice(0, 13) + '…' : f.note) : L('नोट|Note'));}
	function label() {
		const a = amt();
		if (edit) return L('सेव करें|Save');
		if (!a) return L('रकम लिखें|Enter amount');
		const A = fmt(a), cn = f.cat ? catLabel(f.cat) : '';
		if (f.confirmBig) return L(`हाँ, पक्का ${A}`, `Yes, ${A} is right`);
		switch (f.type) {
			case 'out': return cn ? L(`${A} ${cn} में लिखें`, `Add ${A} to ${cn}`) : L(`${A} — श्रेणी चुनें`, `${A} — pick a category`);
			case 'in': return cn ? L(`${A} ${cn} में लिखें`, `Add ${A} to ${cn}`) : L(`${A} आमदनी लिखें`, `Add ${A} income`);
			case 'save': return cn ? L(`${A} ${cn} में डालें`, `Save ${A} in ${cn}`) : L(`${A} बचत में डालें`, `Save ${A}`);
			case 'lend': return f.dir === 'gave' ? L(`${A} उधार दिया — लिखें`, `Add ${A} lent`) : L(`${A} उधार लिया — लिखें`, `Add ${A} borrowed`);
			default: return L(`${A} शगुन लिखें`, `Add ${A} shagun`);
		}
	}
	function upd() {
		const a = amt();
		wordsEl.textContent = a ? C.amountWords(a, lang()) : '';
		saveBtn.textContent = label();
		saveBtn.classList.toggle('gold', f.confirmBig);
		msgEl.textContent = '';
		const big = a && (f.type === 'out' || f.type === 'in' || f.type === 'save') && C.bigAmountCheck(S.state(), f.type, f.cat || 'other', a, td) && !(edit && edit.amt === a);
		wordsEl.classList.toggle('warn', !!big && !f.confirmBig);
		if (big && !f.confirmBig) wordsEl.textContent = L(`बड़ी रकम: ${C.amountWords(a, 'hi')} — पक्का?`, `Big amount: ${C.amountWords(a, 'en')} — sure?`);
		if (f.type === 'out' && !f.cat && a) saveBtn.classList.add('need');
		else saveBtn.classList.remove('need');
		if (f.confirmBig) msgEl.appendChild(h('div', {class: 'warnbox', role: 'alert'}, L(`पक्का ${fmt(a)}? यह रकम आम तौर से बहुत बड़ी है — सही हो तो नीचे दबाएँ।`, `Sure about ${fmt(a)}? It is much bigger than usual — tap below if it is right.`)));
	}
	async function save(more) {
		const a = amt();
		if (!a) {toast(L('पहले रकम लिखें|Enter an amount first')); amtIn.focus(); return;}
		if (f.type === 'out' && !f.cat && !edit) {toast(L('श्रेणी चुनें — जैसे सब्ज़ी, राशन|Pick a category — e.g. groceries')); const g = midEl.querySelector('.catgrid'); if (g) {g.classList.remove('pulse'); void g.offsetWidth; g.classList.add('pulse'); g.scrollIntoView({block: 'nearest'});} return;}
		if ((f.type === 'lend' || f.type === 'shagun') && !f.person.trim()) {toast(L('नाम लिखें|Enter a name')); const p = midEl.querySelector('#person'); p && p.focus(); return;}
		if (!f.confirmBig && (f.type === 'out' || f.type === 'in' || f.type === 'save') && C.bigAmountCheck(S.state(), f.type, f.cat || 'other', a, td) && !(edit && edit.amt === a)) {f.confirmBig = true; upd(); return;}
		const created = [];
		if (edit) {
			const prev = {...edit};
			S.put({...edit, type: f.type, amt: a, cat: f.cat || edit.cat || defCat(f.type), note: f.note.trim(), date: f.date, who: f.who, mode: f.mode, goalId: f.type === 'save' ? f.goalId || undefined : undefined});
			await sh.close();
			toast(L('बदल दिया ✓|Saved ✓'), {undo: () => S.restore(prev)});
			return;
		}
		if (f.type === 'lend') {
			if (!isPro()) {G.lockSheet('registers'); return;}
			created.push(S.put({id: C.newId('l'), kind: 'lend', person: f.person.trim(), dir: f.dir, amt: a, date: f.date, note: f.note.trim(), payments: [], settled: false}));
		} else if (f.type === 'shagun') {
			if (!isPro()) {G.lockSheet('registers'); return;}
			const sid = C.newId('g');
			let txId;
			if ((f.shDir === 'gave' && f.shSpend) || (f.shDir === 'got' && f.shIncome)) {
				const occ = C.OCCASIONS.find(x => x[0] === f.occ);
				const t = S.put({id: C.newId('t'), kind: 'tx', type: f.shDir === 'gave' ? 'out' : 'in', amt: a, cat: f.shDir === 'gave' ? 'gift' : 'giftin', note: `${f.person.trim()} · ${occ ? L(occ[1], occ[2]) : ''}`, date: f.date, who: me(), mode: 'cash', shagunId: sid, at: S.now()});
				created.push(t); txId = t.id;
			}
			created.push(S.put({id: sid, kind: 'shagun', person: f.person.trim(), dir: f.shDir, occasion: f.occ, amt: a, date: f.date, note: f.note.trim(), txId}));
		} else {
			created.push(S.put({id: C.newId('t'), kind: 'tx', type: f.type, amt: a, cat: f.cat || defCat(f.type), note: f.note.trim(), date: f.date, who: f.who, mode: f.mode, goalId: f.type === 'save' && f.goalId ? f.goalId : undefined, at: S.now()}));
			if (!elder && f.type === 'out') S.devSet({lastMode: f.mode});
		}
		const msg = f.type === 'lend' ? L(`${fmt(a)} उधार लिखा`, `${fmt(a)} loan added`) : f.type === 'shagun' ? L(`${fmt(a)} शगुन लिखा`, `${fmt(a)} shagun added`)
			: L(`${fmt(a)} ${catLabel(f.cat || defCat(f.type))} में लिखा`, `${fmt(a)} added to ${catLabel(f.cat || defCat(f.type))}`) + (f.date !== td ? ` · ${relDate(f.date)}` : '');
		const undo = () => S.delMany(created.map(r => r.id));
		if (more) {
			f.raw = ''; f.note = ''; f.cat = null; f.confirmBig = false; f.catsOpen = false; amtIn.value = '';
			renderMid(); renderOpts(); upd();
			sh.body.scrollTop = 0;
			toast(msg + L(' · अगला लिखें| · write the next'), {undo});
		} else {
			await sh.close();
			toast(msg, {undo});
		}
	}
	function defCat(t) {return t === 'in' ? 'otherin' : t === 'save' ? 'gullak' : 'other';}
	async function delEntry() {
		const prev = {...edit};
		await sh.close();
		S.del(edit.id);
		toast(L(`${fmt(prev.amt)} की एंट्री हटा दी`, `Deleted the ${fmt(prev.amt)} entry`), {undo: () => S.restore(prev)});
	}
	function applyVoice(r) {
		if (!r || !sh.open) return;
		if (r.kind === 'absent') return;
		if (r.type && r.type !== f.type) {
			if ((r.type === 'lend' || r.type === 'shagun') && !isPro()) {/* stay on spend */}
			else {f.type = r.type; sh.refresh();}
		}
		if (r.amt) f.raw = toRaw(r.amt);
		if (r.cat) f.cat = r.cat;
		if (r.note) {f.note = r.note;}
		if (r.date) f.date = r.date;
		if (r.person) f.person = r.person;
		if (r.dir) f.dir = r.dir;
		amtIn.value = display(f.raw); f.confirmBig = false; f.optsOpen = !!f.note;
		renderMid(); renderOpts(); upd();
		toast(L('बोला हुआ भर दिया — देखकर सेव करें|Filled from voice — check and save'), {ms: 2500});
	}
	function applySMS(text, auto) {
		const r = C.parseSMS(text, td);
		if (!r.ok) {if (auto) openSMS(text, r); return r;}
		f.type = r.type === 'in' ? 'in' : 'out';
		let c = r.cat;
		const inc = S.settings().income;
		if (f.type === 'in' && (!c || c === 'otherin') && inc && Math.abs(r.amt - inc) <= inc * 0.2) c = 'salary';
		f.raw = toRaw(r.amt); f.cat = c || null; f.date = r.date; f.note = r.merchant || ''; f.mode = r.mode || 'upi'; f.confirmBig = false; f.optsOpen = true;
		sh.refresh(); renderMid(); renderOpts(); upd();
		toast((f.type === 'in' ? L('आमदनी|Income') : L('खर्च|Spend')) + ` ${fmt(r.amt)} · ${relDate(r.date)} — ` + L('देखकर सेव करें|check and save'), {ms: 3000});
		return r;
	}
	function openSMS(text, preErr) {
		let val = text || '', err = preErr || null;
		const reason = e => ({otp: L('यह OTP वाला मैसेज है — इसमें कोई लेन-देन नहीं होता। बैंक का "debited/credited" वाला मैसेज चिपकाएँ।|This is an OTP message — it has no transaction. Paste the bank\'s "debited/credited" message.'),
			balance: L('इसमें सिर्फ़ बैलेंस है, कोई लेन-देन नहीं। खर्च/जमा वाला मैसेज चिपकाएँ।|This only shows a balance, not a transaction. Paste a debit/credit message.')}[e.reason] || L('इसमें रकम या debit/credit नहीं मिला। बैंक का पूरा मैसेज चिपकाएँ।|Could not find an amount with debit/credit. Paste the full bank message.'));
		return sheet({
			id: 'sms', title: L('SMS से भरें|Fill from SMS'),
			body: api => h('div', {class: 'pad'},
				h('p', {class: 'note'}, L('बैंक/UPI का SMS चिपकाएँ — रकम, तारीख, दुकान अपने-आप भरेंगे।|Paste a bank/UPI SMS — amount, date and shop fill in.')),
				h('textarea', {class: 'inp', id: 'smsbox', rows: 5, placeholder: 'Rs.120.00 debited from A/c XX1234 on 12-10-26…', oninput: e => {val = e.target.value;}, value: val}),
				err ? h('div', {class: 'errbox', role: 'alert', id: 'sms-err'}, reason(err)) : null),
			foot: api => h('button', {
				class: 'btn pri block', id: 'sms-go', onclick: once(async () => {
					const r = C.parseSMS(val, td);
					if (!r.ok) {err = r; api.refresh(); const tb = api.body.querySelector('#smsbox'); if (tb) tb.value = val; return;}
					await api.close(); applySMS(val);
				}),
			}, L('भरें|Fill')),
			focus: text ? null : '#smsbox',
		});
	}
}

/* voice */
export function openVoice(cb) {
	const td = today();
	const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
	let rec = null, text = '', result = null, listening = false;
	const sh = sheet({
		id: 'voice', title: L('बोलकर लिखें|Speak to write'),
		body: api => {
			const orb = h('div', {class: 'voice-orb' + (listening ? ' on' : ''), 'aria-hidden': 1}, icon('mic', 40));
			const inp = h('input', {class: 'inp', id: 'voice-text', value: text, placeholder: L('जैसे: सब्ज़ी 120|e.g. vegetables 120'), oninput: e => {text = e.target.value;}});
			let res = null;
			if (result && result.kind === 'absent') {
				const svc = findSvc(result.svc);
				res = svc ? h('div', {class: 'box mt14'}, dv('xl-l', `${svc.emoji || ''} ${svc.name} — ${relDate(result.date)}: ${svc.tpl === 'maid' || svc.tpl === 'cook' ? L('नहीं आई|absent') : L('नहीं आया|absent')}`),
					bt('btn pri block mt10', {id: 'voice-absent', onclick: once(async () => {setMark(svc, result.date, 0); await api.close(); toast(`${svc.name}: ${L('छुट्टी लिख दी|marked absent')}`, {undo: () => setMark(svc, result.date, null)});})}, L('हाँ, लिखें|Yes, mark it')))
					: dv('errbox', L('यह सेवा अभी जोड़ी नहीं गई — खाता में "+ नई सेवा" से जोड़ें।|This helper is not added yet — add it in Khata → "+ New service".'));
			} else if (result && !result.amt) res = dv('errbox', L('रकम समझ नहीं आई — फिर से बोलें, जैसे "सब्ज़ी 120"।|Could not catch the amount — try again, like "vegetables 120".'));
			return h('div', {class: 'pad', style: {textAlign: 'center'}},
				orb,
				h('p', {class: 'lead', style: {textAlign: 'center'}}, listening ? L('सुन रहे हैं… बोलिए|Listening… speak now') : SR ? L('माइक दबाकर बोलिए|Tap the mic and speak') : L('यहाँ बोलकर लिखना नहीं चलता — नीचे लिखें|Voice is not available — type below')),
				h('p', {class: 'ex'}, L('"सब्ज़ी 120" · "पेट्रोल पाँच सौ" · "डेढ़ सौ का दूध" · "दूधवाला आज नहीं आया"|"vegetables 120" · "petrol five hundred" · "milkman did not come today"')),
				h('div', {style: {textAlign: 'left', marginTop: '10px'}}, inp), res);
		},
		foot: api => h('div', {class: 'btnrow'},
			SR ? bt('btn ghost', {onclick: () => start()}, '🎤 ', L('फिर से बोलें|Speak again')) : null,
			bt('btn pri', {id: 'voice-go', onclick: once(() => finish())}, L('भरें|Fill'))),
		onClose: () => {try {rec && rec.abort();} catch (e) {/* ignore */}},
	});
	if (!sh) return null;
	if (SR) setTimeout(start, 250);
	return sh;
	function start() {
		try {rec && rec.abort();} catch (e) {/* ignore */}
		try {
			rec = new SR(); rec.lang = lang() === 'en' ? 'en-IN' : 'hi-IN'; rec.interimResults = true; rec.maxAlternatives = 1;
			rec.onresult = e => {text = [...e.results].map(r => r[0].transcript).join(' '); const i = sh.body.querySelector('#voice-text'); if (i) i.value = text; if (e.results[e.results.length - 1].isFinal) {listening = false; finish();}};
			rec.onerror = () => {listening = false; if (sh.open) sh.refresh();};
			rec.onend = () => {listening = false; if (sh.open) sh.refresh();};
			rec.start(); listening = true; result = null; sh.refresh();
		} catch (e) {listening = false; if (sh.open) sh.refresh();}
	}
	async function finish() {
		const i = sh.body.querySelector('#voice-text'); if (i) text = i.value;
		if (!text.trim()) {toast(L('कुछ बोलें या लिखें|Say or type something')); return;}
		result = C.parseVoice(text, {today: td});
		if (!result || result.kind === 'absent' || !result.amt) {sh.refresh(); return;}
		await sh.close();
		if (cb) cb(result); else G.openAdd({type: result.type === 'lend' || result.type === 'shagun' ? (isPro() ? result.type : 'out') : result.type, amt: result.amt, cat: result.cat, note: result.note, date: result.date, person: result.person, dir: result.dir});
	}
}
function findSvc(key) {
	const st = S.state();
	return st.svcs.find(s => s.active !== false && s.tpl === key) || st.svcs.find(s => s.active !== false && C.normText(s.name).includes(C.normText({milk: 'दूध', maid: 'काम', press: 'प्रेस', paper: 'अखबार', water: 'पानी', driver: 'ड्राइवर', cook: 'खाना'}[key] || key)));
}
