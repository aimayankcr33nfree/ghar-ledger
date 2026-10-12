// DOM helpers, bilingual text, sheets with Back-button history, toasts.
import * as S from './store.js';
import * as C from './core.js';

export const lang = () => S.devGet('lang', 'hi');
// L('हिन्दी|English') or L(hindi, english)
export const L = (hi, en) => {if (en === undefined) {const i = hi.indexOf('|'); en = hi.slice(i + 1); hi = hi.slice(0, i);} return lang() === 'en' ? en : hi;};
export const fmt = C.fmt;

export function h(tag, props, ...kids) {
	const el = tag === 'frag' ? document.createDocumentFragment() : document.createElement(tag);
	if (props) for (const k in props) {
		const v = props[k];
		if (v == null || v === false) continue;
		if (k === 'class') el.className = v;
		else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
		else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
		else if (k === 'text') el.textContent = v;
		else if (k === 'html') el.innerHTML = v;
		else if (k in el && typeof v !== 'string' && k !== 'list') el[k] = v;
		else el.setAttribute(k, v === true ? '' : v);
	}
	add(el, kids);
	return el;
}
export const dv = (c, ...k) => h('div', {class: c}, ...k);
export const sp = (c, ...k) => h('span', {class: c}, ...k);
export const bt = (c, p, ...k) => h('button', {class: c, ...p}, ...k);
function add(el, kids) {
	for (const k of kids) {
		if (k == null || k === false || k === true) continue;
		if (Array.isArray(k)) add(el, k);
		else el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
	}
}
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export function svg(path, size = 24, extra = '') {
	const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size);
	s.setAttribute('aria-hidden', 'true'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
	s.setAttribute('stroke-width', '1.9'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
	s.innerHTML = path + extra;
	return s;
}
export const IC = {
	today: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
	khata: '<path d="M5 4.5h11.5a2.5 2.5 0 0 1 2.5 2.5v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5z"/><path d="M5 17a2.5 2.5 0 0 1 2.5-2.5H19"/><path d="M9 8.5h6M9 11.5h4"/>',
	month: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
	home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
	plus: '<path d="M12 5v14M5 12h14"/>',
	mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
	back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
	wa: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-1.9-1-1 .9c-.9-.4-1.9-1.4-2.3-2.3l.9-1-1-1.9z" fill="currentColor" stroke="none"/>',
	share: '<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/>',
	cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
	edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>', trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
	chev: '<path d="M9 6l6 6-6 6"/>',
	search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
	};
export const icon = (name, size) => svg(IC[name] || '', size);

/* history-backed layers (sheets & sub-screens) */
const layers = [];
let curTab = 'today', onTab = null, popWaiters = [], ignorePops = 0, lockGuard = null;
export function initNav(tabHandler) {
	onTab = tabHandler;
	history.replaceState({d: 0, tab: 'today'}, '');
	window.addEventListener('popstate', e => {
		const w = popWaiters; popWaiters = [];
		if (ignorePops > 0) {ignorePops--; w.forEach(f => f()); return;}
		if (lockGuard) {history.pushState({d: layers.length, tab: curTab, lock: 1}, ''); w.forEach(f => f()); return;}
		const d = (e.state && e.state.d) || 0;
		while (layers.length > d) {const l = layers.pop(); l._remove();}
		const tab = (e.state && e.state.tab) || 'today';
		if (tab !== curTab) {curTab = tab; onTab && onTab(tab, true);}
		w.forEach(f => f());
	});
}
export function setLockGuard(on) {
	if (on && !lockGuard) {lockGuard = true; history.pushState({d: layers.length, tab: curTab, lock: 1}, '');}
	else if (!on && lockGuard) {lockGuard = null; ignorePops++; history.back();}
}
function waitPop(ms = 700) {return new Promise(res => {let done = false; const f = () => {if (!done) {done = true; res();}}; popWaiters.push(f); setTimeout(f, ms);});}
let navChain = Promise.resolve();
const queueNav = fn => (navChain = navChain.then(fn, fn));
export function goTab(tab) {
	if (tab === curTab) return;
	queueNav(async () => {
		const from = curTab; curTab = tab;
		if (tab === 'today') {if (from !== 'today' && history.state && history.state.tab && history.state.tab !== 'today') {history.back(); await waitPop();}}
		else if (from === 'today') history.pushState({d: 0, tab}, '');
		else history.replaceState({d: 0, tab}, '');
		onTab && onTab(tab, false);
	});
}
export const currentTab = () => curTab;
export function back() {if (!layers.length) return Promise.resolve(); return queueNav(async () => {history.back(); await waitPop();});}
export function backN(n) {n = Math.min(n, layers.length); if (n <= 0) return Promise.resolve(); return queueNav(async () => {history.go(-n); await waitPop();});}
export function closeAll() {return backN(layers.length);}
function pushLayer(l) {
	queueNav(async () => {if (!l.api.open) return; layers.push(l); history.pushState({d: layers.length, tab: curTab}, ''); l._shown();});
}

// generic full-screen overlay that participates in Back-button history
export function overlayLayer(el, onRemove) {
	let closed = false;
	const api = {get open() {return !closed;}, close() {if (closed) return Promise.resolve(); if (layers[layers.length - 1] === layer) return back(); layer._remove(); return Promise.resolve();}};
	const layer = {api, _shown() {}, _remove() {if (closed) return; closed = true; el.remove(); onRemove && onRemove(); const i = layers.indexOf(layer); if (i >= 0) layers.splice(i, 1);}};
	document.getElementById('overlay').appendChild(el);
	pushLayer(layer);
	return api;
}

/* sheet */
const openIds = new Set(), liveSheets = new Set();
export function refreshLive() {for (const a of liveSheets) {try {a.refresh();} catch (e) {console.warn(e);}}}
export function sheet(o) {
	if (o.id && openIds.has(o.id)) return null; // ignore double-taps
	if (o.id) openIds.add(o.id);
	const root = document.getElementById('sheets');
	const bd = dv('backdrop');
	const body = dv('sh-body');
	const foot = dv('sh-foot');
	const titleEl = h('h2', {class: 'sh-title', id: 'sh-t-' + Math.random().toString(36).slice(2)});
	const head = o.bare ? dv('sh-head bare', h('div', {class: 'grab', 'aria-hidden': 1}, h('span')), h('span', {class: 'sr'}, titleEl))
		: dv('sh-head', h('div', {class: 'grab', 'aria-hidden': 1}, h('span')),
			dv('sh-hrow', titleEl, bt('iconbtn sh-x', {'aria-label': L('बंद करें|Close'), onclick: () => api.close()}, icon('x', 22))));
	const panel = h('div', {class: 'sheet' + (o.cls ? ' ' + o.cls : ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleEl.id}, head, body, foot);
	const wrap = h('div', {class: 'sheet-wrap', 'data-sheet': o.id || ''}, bd, panel);
	let openedAt = 0, closed = false;
	const api = {
		el: panel, body, foot, data: o.data || {},
		setTitle(t) {titleEl.textContent = t || ''; if (!o.bare) titleEl.style.display = t ? '' : 'none';},
		refresh() {
			const sc = body.scrollTop; body.textContent = ''; foot.textContent = '';
			const b = o.body ? o.body(api) : null; if (b) add(body, [b]);
			const f = o.foot ? o.foot(api) : null; if (f) add(foot, [f]); foot.style.display = f ? '' : 'none';
			body.scrollTop = sc;
		},
		close() {if (closed) return Promise.resolve(); if (layers[layers.length - 1] === layer) return back(); layer._remove(); const i = layers.indexOf(layer); if (i >= 0) layers.splice(i, 1); return Promise.resolve();},
		get open() {return !closed;},
	};
	const layer = {
		api, id: o.id,
		_shown() {openedAt = performance.now();},
		_remove() {
			if (closed) return; closed = true; if (o.id) openIds.delete(o.id); liveSheets.delete(api);
			wrap.classList.remove('open'); wrap.classList.add('closing');
			setTimeout(() => {wrap.remove(); if (!document.querySelector('.sheet-wrap.open')) document.documentElement.classList.remove('sheet-open'); placeToast();}, 260);
			o.onClose && o.onClose(api);
		},
	};
	api.setTitle(o.title);
	api.refresh();
	if (o.live) liveSheets.add(api);
	root.appendChild(wrap);
	document.documentElement.classList.add('sheet-open');
	hideToast(); // an older message belongs to the screen behind; it must not sit over the new sheet
	requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
	openedAt = performance.now();
	bd.addEventListener('click', () => {if (performance.now() - openedAt > 400) api.close();});
	swipeDown(panel, head, body, () => api.close());
	pushLayer(layer);
	if (o.focus) setTimeout(() => {const f = panel.querySelector(o.focus); f && f.focus();}, 320);
	return api;
}
function swipeDown(panel, head, body, close) {
	let y0 = 0, dy = 0, t0 = 0, on = false;
	const start = y => {y0 = y; dy = 0; t0 = performance.now(); on = true; panel.style.transition = 'none';};
	const move = y => {if (!on) return; dy = Math.max(0, y - y0); panel.style.transform = dy ? `translateY(${dy}px)` : '';};
	const end = () => {
		if (!on) return; on = false; panel.style.transition = '';
		const v = dy / Math.max(1, performance.now() - t0);
		if (dy > 90 || (dy > 30 && v > 0.6)) {panel.style.transform = `translateY(${Math.max(dy, 200)}px)`; close();}
		else panel.style.transform = '';
	};
	head.addEventListener('pointerdown', e => {if (e.target.closest('button')) return; head.setPointerCapture(e.pointerId); start(e.clientY);});
	head.addEventListener('pointermove', e => move(e.clientY));
	head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
	let cand = false;
	body.addEventListener('touchstart', e => {cand = body.scrollTop <= 0 && !e.target.closest('input,textarea,.noswipe'); if (cand) {y0 = e.touches[0].clientY; dy = 0;}}, {passive: true});
	body.addEventListener('touchmove', e => {
		if (!cand) return;
		const d = e.touches[0].clientY - y0;
		if (!on && d > 8 && body.scrollTop <= 0) {start(y0);}
		if (on) {e.preventDefault(); move(e.touches[0].clientY);}
		else if (d < 0) cand = false;
	}, {passive: false});
	body.addEventListener('touchend', () => {cand = false; end();});
}

/* toast */
let toastTimer = null, toastGone = null;
// the toast is removed from the page once hidden, so an old "Undo" can never catch a tap
export function toast(msg, o = {}) {
	const box = document.getElementById('toast');
	clearTimeout(toastTimer); clearTimeout(toastGone);
	box.textContent = '';
	const row = h('div', {class: 'toast' + (o.kind ? ' ' + o.kind : ''), role: 'status'}, sp('toast-msg', msg));
	const acts = [];
	if (o.undo) acts.push([L('वापस लें|Undo'), o.undo]);
	if (o.action) acts.push([o.actLabel, o.action]);
	const hide = () => {box.classList.remove('show'); clearTimeout(toastGone); toastGone = setTimeout(() => {if (!box.classList.contains('show')) box.textContent = '';}, 260);};
	for (const [lb, fn] of acts) row.appendChild(bt('toast-act', {onclick: () => {hide(); fn();}}, lb));
	box.appendChild(row);
	placeToast();
	box.classList.add('show');
	toastTimer = setTimeout(hide, o.ms || (acts.length ? 6000 : 3200));
}
// above the tab bar normally; with a sheet open, just below that sheet's handle/title row, so it never covers the drag handle or ✕
export function placeToast() {
	const box = document.getElementById('toast'); if (!box) return;
	const wraps = document.querySelectorAll('.sheet-wrap:not(.closing)'), top = wraps[wraps.length - 1];
	const panel = top && top.querySelector('.sheet'), head = panel && (panel.querySelector('.amtbox') || panel.querySelector('.add-top') || panel.querySelector('.sh-head')); // never over the amount box
	if (!panel || !head) {box.style.top = ''; box.style.bottom = ''; return;}
	// final position: the sheet sits at the bottom; rect differences cancel the slide-in transform
	const sheetTop = Math.max(0, window.innerHeight - panel.offsetHeight), below = head.getBoundingClientRect().bottom - panel.getBoundingClientRect().top;
	box.style.top = Math.round(sheetTop + below + 4) + 'px'; box.style.bottom = 'auto';
}
export function hideToast() {const box = document.getElementById('toast'); clearTimeout(toastTimer); box.classList.remove('show'); box.textContent = '';}

/* small widgets */
export function once(fn) {let busy = false; return async (...a) => {if (busy) return; busy = true; try {await fn(...a);} finally {setTimeout(() => {busy = false;}, 320);}};}
export function chips(opts, val, onPick, o = {}) {
	return h('div', {class: 'chips' + (o.cls ? ' ' + o.cls : ''), role: 'radiogroup', id: o.id}, opts.map(([v, label]) => h('button', {
		class: 'chip' + (v === val ? ' on' : ''), role: 'radio', 'aria-checked': v === val ? 'true' : 'false', type: 'button',
		onclick: e => {onPick(v); if (o.keep) return; for (const b of e.currentTarget.parentNode.children) {b.classList.toggle('on', b === e.currentTarget); b.setAttribute('aria-checked', b === e.currentTarget ? 'true' : 'false');}},
	}, label)));
}
export function toggle(on, onChange, label) {
	const b = h('button', {class: 'tgl' + (on ? ' on' : ''), role: 'switch', 'aria-checked': on ? 'true' : 'false', type: 'button', 'aria-label': label || ''}, h('span'));
	b.addEventListener('click', () => {on = !on; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); onChange(on);});
	return b;
}
export const trow = (t, s, ctl) => h('div', {class: 'setrow tr'}, dv('row-main', dv('row-t', t), s ? dv('row-s', s) : null), ctl);
export function field(label, input, hint) {
	const box = input && (/^(INPUT|SELECT|TEXTAREA)$/.test(input.tagName) || (input.classList && input.classList.contains('money-wrap')));
	return h(box ? 'label' : 'div', box ? {class: 'field'} : {class: 'field', role: 'group', 'aria-label': typeof label === 'string' ? label : null}, sp('f-lab', label), input, hint ? sp('f-hint', hint) : null);
}
// rupee input that accepts "₹1,200.50"
export function moneyInput(paise, onChange, o = {}) {
	const inp = h('input', {class: 'inp money', inputmode: 'decimal', autocomplete: 'off', placeholder: o.placeholder || '0', value: paise ? C.fmt(paise).replace('₹', '') : '', 'aria-label': o.label || L('रकम|Amount')});
	const wrap = dv('money-wrap', sp('rs', '₹'), inp);
	inp.addEventListener('input', () => {const p = C.parseAmount(inp.value); wrap.classList.toggle('bad', inp.value.trim() !== '' && p == null); onChange(p);});
	inp.addEventListener('blur', () => {const p = C.parseAmount(inp.value); if (p != null && inp.value.trim()) inp.value = C.fmt(p).replace('₹', '');});
	wrap.input = inp;
	return wrap;
}
// आज / कल chips + a date picker (dates never in the future)
export function dateField(value, onChange, label) {
	const td = C.todayStr(Date.now()), yd = C.addDays(td, -1);
	const wrap = h('div', {class: 'frow', style: {alignItems: 'center'}});
	const draw = () => {
		wrap.textContent = '';
		wrap.appendChild(chips([[td, L('आज|Today')], [yd, L('कल|Yesterday')]], value, v => {value = v; onChange(v); draw();}, {keep: true}));
		wrap.appendChild(h('input', {class: 'inp', type: 'date', value, max: td, 'aria-label': L('तारीख चुनें|Pick a date'), onchange: e => {if (e.target.value) {value = e.target.value; onChange(value); draw();}}}));
	};
	draw();
	return field(label || L('कब|When'), wrap);
}
export function confirmSheet(title, msg, okLabel, onOk, o = {}) {
	return sheet({
		id: 'confirm', title, cls: 'small',
		body: () => dv('pad', h('p', {class: 'lead'}, msg), o.extra || null),
		foot: api => dv('btnrow', bt('btn ghost', {onclick: () => api.close()}, o.cancel || L('रहने दें|Cancel')),
			h('button', {class: 'btn ' + (o.danger ? 'danger' : 'pri'), onclick: once(async () => {await api.close(); onOk();})}, okLabel)),
	});
}
export function download(name, mime, data) {
	const blob = data instanceof Blob ? data : new Blob([data], {type: mime});
	const a = h('a', {href: URL.createObjectURL(blob), download: name});
	document.body.appendChild(a); a.click();
	setTimeout(() => {URL.revokeObjectURL(a.href); a.remove();}, 1500);
}
export function openUrl(url) {
	window.__lastOpen = url;
	// UPI intents open the phone's UPI app in place (automated test browsers only record the link)
	if (/^upi:/i.test(url)) {if (!navigator.webdriver) location.href = url; return;}
	const a = h('a', {href: url, target: '_blank', rel: 'noopener'});
	document.body.appendChild(a); a.click(); a.remove();
}
export function emptyState(emoji, title, sub, btn) {
	return dv('empty', h('div', {class: 'empty-e', 'aria-hidden': 1}, emoji), dv('empty-t', title), sub ? dv('empty-s', sub) : null, btn || null);
}
export function ring(pct, size = 56, stroke = 6) {
	const r = (size - stroke) / 2, c = 2 * Math.PI * r, d = Math.max(0, Math.min(1, pct)) * c;
	const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	s.setAttribute('viewBox', `0 0 ${size} ${size}`); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('class', 'ring'); s.setAttribute('aria-hidden', 'true');
	s.innerHTML = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" class="ring-bg"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" class="ring-fg" stroke-linecap="round" stroke-dasharray="${d} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
	return s;
}
export function longPress(el, fn, ms = 520) {
	let t = null, fired = false;
	el.addEventListener('pointerdown', () => {fired = false; t = setTimeout(() => {fired = true; fn();}, ms);});
	const clear = () => clearTimeout(t);
	el.addEventListener('pointerup', clear); el.addEventListener('pointerleave', clear); el.addEventListener('pointercancel', clear);
	el.addEventListener('contextmenu', e => e.preventDefault());
	el.addEventListener('click', e => {if (fired) {e.stopImmediatePropagation(); e.preventDefault();}}, true);
}
