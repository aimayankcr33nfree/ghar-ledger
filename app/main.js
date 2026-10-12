// Boot, tabs, rendering, PIN lock, service worker, deep links.
import * as S from './store.js';
import * as C from './core.js';
import * as UI from './ui.js';
import {h, dv, sp, bt, L, lang, fmt, sheet, toast, icon, initNav, goTab, currentTab, closeAll, refreshLive, setLockGuard} from './ui.js';
import {G, today, isPro, plan} from './ctx.js';
import * as Sync from './sync.js';
import {renderToday, openExplain} from './today.js';
import {openAdd, openVoice} from './add.js';
import {renderKhata, runAutopay, serviceSheet} from './khata.js';
import {renderMonth, maybeMonthClose, setMonth, closeCard, saveLeftover} from './month.js';
import {renderHome, lockSheet, openPlan, pinPad, pinOk, paySheet, joinOther} from './home.js';
import * as R from './remind.js';
import {startOnboarding, startJoin, coach} from './onboard.js';

S.load();
try {history.scrollRestoration = 'manual';} catch (e) {/* ignore */}
const TABS = [['today', 'today', () => L('आज|Today')], ['khata', 'khata', () => L('खाता|Khata')], ['month', 'month', () => L('महीना|Month')], ['home', 'home', () => L('घर|Home')]];
const scrolls = {};
let ready = false, raf = 0, lastDay = '';

Object.assign(G, {
	render: () => scheduleRender(), openAdd, openVoice, openExplain, lockSheet, openPlan, closeAll,
	applyTheme, syncState: () => ({ok: 'ok', pending: 'pending', err: 'err', off: 'off', locked: 'off', rotated: 'err'}[Sync.info().state] || 'off'), syncSheet, syncInfo: Sync.info,
	startJoin: k => {ready = false; startJoin(k, onReady);}, joinOther, paySheet, reminders: R.info, closeCard, saveLeftover, serviceSheet,
});
window.GK = {S, C, G, Sync, UI, R}; // test & support hook

function applyTheme() {
	const t = S.devGet('theme', 'auto'), r = document.documentElement;
	const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
	r.setAttribute('data-theme', dark ? 'dark' : 'light');
	r.classList.toggle('elder', !!S.devGet('elder'));
	r.lang = lang();
	const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = dark ? '#0C1310' : '#14532D';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

function tabbar() {
	const nav = document.getElementById('tabbar');
	nav.textContent = '';
	nav.setAttribute('aria-label', L('मुख्य|Main'));
	const btn = ([id, ic, lb]) => h('button', {class: 'tab' + (currentTab() === id ? ' on' : ''), id: 'tab-' + id, 'aria-current': currentTab() === id ? 'page' : null, onclick: () => {if (currentTab() === id) {window.scrollTo({top: 0, behavior: 'smooth'}); return;} goTab(id);}}, icon(ic), h('span', null, lb()));
	nav.appendChild(dv('tabbar-in', btn(TABS[0]), btn(TABS[1]),
		bt('fab', {id: 'fab', 'aria-label': L('लिखें|Add'), onclick: () => openAdd({type: 'out'})}, sp('fab-c', icon('plus')), h('span', null, L('लिखें|Add'))),
		btn(TABS[2]), btn(TABS[3])));
	nav.classList.remove('hide');
}
function scheduleRender() {if (!ready) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(render);}
function render() {
	if (!ready) return;
	const m = document.getElementById('main'), tab = currentTab();
	const y = window.scrollY;
	let node;
	try {
		node = tab === 'khata' ? renderKhata() : tab === 'month' ? renderMonth() : tab === 'home' ? renderHome() : renderToday();
	} catch (e) {console.warn(e); node = dv('empty', L('कुछ गड़बड़ हुई — ऐप दोबारा खोलें|Something went wrong — reopen the app'));}
	m.textContent = ''; m.appendChild(node);
	m.dataset.tab = tab;
	tabbar();
	window.scrollTo(0, y);
	refreshLive();
	R.schedule();
}
function onTab(tab, fromPop) {
	scrolls[m_prev] = window.scrollY;
	m_prev = tab;
	if (tab === 'month') setMonth(null);
	render();
	window.scrollTo(0, 0);
}
let m_prev = 'today';

function syncSheet() {
	const I = Sync.info(), P = plan();
	const txt = {rotated: L('इस परिवार का कोड बदल दिया गया है — नया कोड डालकर दोबारा जुड़ें|This family\'s code was changed — join again with the new code'), ok: L('सब सिंक है ✓|All synced ✓'), pending: L(`${I.pending} बदलाव भेजने बाक़ी`, `${I.pending} change(s) waiting to send`), off: I.online ? L('सिंक बंद|Sync off') : L('इंटरनेट नहीं — बदलाव फ़ोन में सुरक्षित हैं|Offline — changes are safe on this phone'), err: L('सिंक में दिक़्क़त|Sync problem'), locked: L('परिवार सिंक Pro में है — इस फ़ोन का हिसाब सुरक्षित है|Family sync is part of Pro — this phone\'s data is safe')}[I.state] || '';
	return sheet({
		id: 'sync', title: L('सिंक|Sync'), cls: 'small',
		body: () => h('div', {class: 'pad'},
			h('p', {class: 'lead'}, txt),
			I.lastOk ? h('p', {class: 'note'}, L('पिछली बार: |Last synced: ') + new Date(I.lastOk).toLocaleTimeString(lang() === 'en' ? 'en-IN' : 'hi-IN', {hour: 'numeric', minute: '2-digit'})) : null,
			I.state === 'err' ? h('div', {class: 'errbox', id: 'sync-err'}, I.lastErr) : null,
			h('p', {class: 'note'}, L('हरा = सिंक · पीला = भेजना बाक़ी · स्लेटी = ऑफ़लाइन · लाल = दिक़्क़त|Green = synced · amber = pending · grey = offline · red = problem'))),
		foot: api => I.state === 'locked' ? bt('btn pri block', {onclick: () => lockSheet('sync')}, L('Pro के बारे में|About Pro'))
			: bt('btn pri block', {id: 'sync-now', onclick: async () => {await Sync.syncNow(); api.refresh(); scheduleRender(); toast(Sync.info().state === 'ok' ? L('सिंक हो गया ✓|Synced ✓') : L('अभी नहीं हो पाया — बाद में अपने-आप होगा|Could not sync now — will retry automatically'));}}, L('अभी सिंक करें|Sync now')),
	});
}

/* PIN lock */
let locked = false, hiddenAt = 0;
function showLock() {
	if (locked || !S.devGet('pinHash')) return;
	locked = true;
	setLockGuard(true);
	const box = h('div', {class: 'lock', id: 'lock', role: 'dialog', 'aria-modal': 'true'});
	const draw = (forgot) => {
		box.textContent = '';
		box.appendChild(h('img', {src: 'icon-192.png', alt: '', style: {width: '64px', height: '64px', borderRadius: '18px', marginBottom: '10px'}}));
		if (!forgot) {
			box.appendChild(pinPad(p => {
				if (pinOk(p)) {unlock(); return true;}
				return false;
			}, L('घर खर्च खोलने के लिए PIN|Enter PIN to open')));
			box.appendChild(bt('linkbtn', {id: 'pin-forgot', style: {marginTop: '18px'}, onclick: () => draw(true)}, L('PIN भूल गए?|Forgot PIN?')));
		} else {
			let v = '';
			box.appendChild(h('div', {style: {width: '100%', maxWidth: '360px'}},
				h('p', {class: 'lead', style: {textAlign: 'center'}}, L('परिवार कोड डालें — PIN हट जाएगा|Enter the family code — the PIN will be removed')),
				h('p', {class: 'note', style: {textAlign: 'center'}}, L('कोड परिवार के दूसरे फ़ोन के "घर" टैब में दिखता है।|The code is shown on another family phone\'s Home tab.')),
				h('input', {class: 'inp', id: 'forgot-code', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', style: {marginTop: '10px'}, oninput: e => {v = e.target.value;}}),
				h('div', {class: 'btnrow mt12'}, bt('btn ghost', {onclick: () => draw(false)}, L('पीछे|Back')),
bt('btn pri', {id: 'forgot-go', onclick: () => {if (C.normSecret(v) && C.normSecret(v) === S.devGet('secret')) {S.devSet({pinHash: ''}); unlock(); toast(L('PIN हटा दिया — नया लगा लें|PIN removed — set a new one'));} else toast(L('कोड सही नहीं है|Wrong code'));}}, L('खोलें|Unlock')))));
		}
	};
	draw(false);
	document.getElementById('overlay').appendChild(box);
}
function unlock() {const b = document.getElementById('lock'); if (b) b.remove(); locked = false; setLockGuard(false);}
document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'hidden') hiddenAt = Date.now();
	else {
		if (hiddenAt && Date.now() - hiddenAt >= 60000 && ready) showLock();
		hiddenAt = 0;
		if (ready && today() !== lastDay) {lastDay = today(); scheduleRender();}
	}
});

/* boot */
function onReady(o = {}) {
	ready = true;
	initNav(onTab);
	applyTheme();
	lastDay = today();
	countDay();
	runAutopay();
	render();
	S.on(info => {if (info && info.warn) toast(info.warn === 'full' ? L('फ़ोन में जगह भर गई — बैकअप लेकर पुराना डेटा हटाएँ|Storage full — take a backup') : L('डेटा बहुत हो गया — एक बैकअप ले लें|Lots of data — please take a backup'), {ms: 6000}); if (info && info.dev && info.dev.includes('elder')) applyTheme(); scheduleRender();});
	Sync.onState(() => scheduleRender());
	Sync.start();
	setInterval(() => {if (today() !== lastDay) {lastDay = today(); countDay(); runAutopay(); scheduleRender();}}, 30000);
	window.addEventListener('online', scheduleRender); window.addEventListener('offline', scheduleRender);
	if (S.devGet('pinHash') && !o.coach && !o.joined) showLock();
	const q = new URLSearchParams(location.search);
	const shared = q.get('text') || q.get('share') || '';
	history.replaceState(history.state, '', location.pathname);
	let shown = false;
	if (shared) {openAdd({smsText: shared}); shown = true;}
	else if (q.get('add')) {openAdd({type: 'out'}); shown = true;}
	else if (q.get('go') === 'attendance') {setTimeout(() => {const a = document.getElementById('attendance'); if (a) a.scrollIntoView({block: 'center'});}, 200);}
	if (!shown) shown = maybeMonthClose();
	const P = plan();
	if (!shown && !P.pro && S.settings().plan.created && S.devGet('lockDay') !== today()) {S.devSet({lockDay: today()}); lockSheet(null); shown = true;}
	if (!shown && (o.coach || S.devGet('coach') === 'pending')) setTimeout(() => coach(), 350);
}
// days on which the app was opened (reminders are offered only after the 3rd)
function countDay() {const td = today(); if (S.devGet('onboarded') && S.devGet('lastOpen') !== td) S.devSet({lastOpen: td, openDays: S.devGet('openDays', 0) + 1});}
function boot() {
	applyTheme();
	const hm = location.hash.match(/join=([0-9A-Za-z-]{12,20})/);
	if (hm) {
		const key = C.normSecret(hm[1]) || hm[1];
		history.replaceState(null, '', location.pathname + location.search);
		if (S.devGet('onboarded') && S.devGet('secret') === key) return onReady();
		if (S.devGet('onboarded') && S.all().some(r => r.kind === 'tx' && !r.deleted)) {
			// this phone already has its own book: confirm before switching
			onReady();
			// the same family after a code change rejoins quietly (home.js rejoinIfSame); anything else asks first
			Promise.resolve(G.rejoinIfSame ? G.rejoinIfSame(key) : null).catch(() => null).then(r => {if (r && r.same) return;
				UI.confirmSheet(L('इस परिवार से जुड़ें?|Join this family?'), L('इस फ़ोन का अभी का हिसाब हट जाएगा और परिवार का हिसाब आएगा। पहले "घर → बैकअप" से बैकअप ले लें।|This phone\'s current data will be replaced by the family\'s. Take a backup first from Home → Backup.'), L('जुड़ें|Join'), () => {ready = false; startJoin(key, onReady);}, {danger: true});});
			return;
		}
		return startJoin(key, onReady);
	}
	if (!S.devGet('onboarded')) return startOnboarding(onReady);
	onReady();
}
boot();
// an invite link (#join=…) opened while the app is already open in this tab: handle it like a fresh open
window.addEventListener('hashchange', () => {if (/join=/.test(location.hash)) location.reload();});

/* service worker */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('sw.js').then(reg => {
			const offer = w => toast(L('नया वर्ज़न — खोलें|New version — open'), {action: () => {window.__swUpdating = true; w.postMessage('skip');}, actLabel: L('खोलें|Open'), ms: 15000});
			if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
			reg.addEventListener('updatefound', () => {const w = reg.installing; w && w.addEventListener('statechange', () => {if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);});});
		}).catch(() => {});
		let reloaded = false;
		navigator.serviceWorker.addEventListener('controllerchange', () => {if (window.__swUpdating && !reloaded) {reloaded = true; location.reload();}});
	});
}
