// घर खर्च service worker — cache-first app shell, versioned caches, update on reload,
// and phone reminders (Periodic Background Sync + a message hook) from a plan the app writes.
const VERSION = 'gk3-v3';
const STATE = 'gkstate-v1'; // reminder plan + what was already shown (kept across app updates)
const SHELL = ['./', 'index.html', 'app.css', 'main.js', 'core.js', 'store.js', 'ui.js', 'ctx.js', 'ops.js', 'today.js', 'add.js', 'khata.js', 'month.js', 'home.js', 'onboard.js', 'sync.js', 'vault.js', 'qr.js', 'remind.js', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
	e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))));
});
self.addEventListener('activate', e => {
	e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('gk3-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function readJSON(c, name) {try {const r = await c.match(name); return r ? await r.json() : null;} catch (e) {return null;}}
// shows every planned reminder that is due (and not older than 12 h) exactly once
async function remindCheck(now) {
	now = now || Date.now();
	const c = await caches.open(STATE), s = await readJSON(c, 'state.json');
	if (!s || !s.on) return [];
	const sent = (await readJSON(c, 'sent.json')) || {}, shown = [];
	for (const it of s.items || []) {
		if (it.at > now || now - it.at > 12 * 3600e3 || sent[it.tag]) continue;
		if (it.kind === 'daily' && (s.written || []).includes(it.date)) continue;
		await self.registration.showNotification(it.title, {body: it.body, tag: it.tag, icon: 'icon-192.png', badge: 'icon-192.png', lang: s.lang || 'hi', data: {url: './'}});
		sent[it.tag] = now; shown.push(it.tag);
	}
	for (const k in sent) if (now - sent[k] > 40 * 864e5) delete sent[k];
	await c.put('sent.json', new Response(JSON.stringify(sent), {headers: {'Content-Type': 'application/json'}}));
	return shown;
}
self.addEventListener('periodicsync', e => {if (e.tag === 'gk-remind') e.waitUntil(remindCheck());});
self.addEventListener('message', e => {
	if (e.data === 'skip') {self.skipWaiting(); return;}
	if (e.data && e.data.type === 'remind-check') e.waitUntil(remindCheck(e.data.now).then(shown => {if (e.ports && e.ports[0]) e.ports[0].postMessage(shown);}));
});
self.addEventListener('notificationclick', e => {
	e.notification.close();
	const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
	e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(list => {
		for (const w of list) if ('focus' in w) return w.focus();
		return self.clients.openWindow(url);
	}));
});
self.addEventListener('fetch', e => {
	const req = e.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== self.location.origin) return; // never touch sync traffic
	if (req.mode === 'navigate') {
		// app shell for every navigation (share target, shortcuts, #join links)
		e.respondWith(caches.match('index.html').then(r => r || fetch(req)).catch(() => fetch(req)));
		return;
	}
	e.respondWith(caches.match(req, {ignoreSearch: true}).then(r => r || fetch(req).then(res => {
		if (res.ok && res.type === 'basic') {const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy));}
		return res;
	})));
});
