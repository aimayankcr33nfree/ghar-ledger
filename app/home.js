// घर / Home — family & settings, plan, look, privacy, reminders, backup, subscription, help.
import * as S from './store.js';
import * as C from './core.js';
import * as V from './vault.js';
import * as Sync from './sync.js';
import * as R from './remind.js';
import {UPI_ID, PAYEE, FEEDBACK_WA} from './config.js';
import {qrSvg} from './qr.js';
import {h, dv, sp, bt, trow, L, lang, fmt, sheet, toast, once, chips, toggle, field, icon, moneyInput, confirmSheet, download, openUrl} from './ui.js';
import {G, today, me, familyName, plan, isPro, pro, myName} from './ctx.js';
import {header} from './today.js';

const grp = (title, ...rows) => h('section', {class: 'sec'}, dv('sec-h', h('h3', null, title)), dv('list', rows));
const srow = (emoji, title, val, onclick, o = {}) => h(onclick ? 'button' : 'div', {class: 'setrow' + (o.stack ? ' stack' : ''), onclick, id: o.id},
	h('span', {class: 'row-ic', style: {width: '36px', height: '36px', fontSize: '19px', borderRadius: '11px'}, 'aria-hidden': 1}, emoji),
	dv('row-main', dv('row-t', title), o.sub ? dv('row-s', o.sub) : null, o.stack ? o.right : null),
	o.stack ? null : o.right || (val != null ? sp('val num', val) : null), onclick && !o.right ? sp('chev', icon('chev', 18)) : null);
const secret = () => S.devGet('secret', '');
const inviteLink = () => new URL('./', location.href).href.split('#')[0] + '#join=' + secret();

export function renderHome() {
	const s = S.settings(), P = plan(), td = today();
	const target = C.saveTarget(S.state(), C.cycleFor(td, s));
	const E = C.emergencyMonths(S.state(), td), Rm = R.info();
	return h('frag', null,
		header(L('घर|Home'), familyName()),
		// family
		h('section', {class: 'card fam', id: 'family'},
			h('div', {style: {display: 'flex', alignItems: 'center', gap: '10px'}}, dv('row-main', h('div', {class: 'row-t', style: {fontSize: '19px'}}, familyName()), dv('row-s', L(`${s.members.length} सदस्य · यह फ़ोन: ${myName()}`, `${s.members.length} member${s.members.length === 1 ? '' : 's'} · this phone: ${myName()}`))),
				bt('iconbtn', {'aria-label': L('नाम बदलें|Rename'), onclick: () => familyNameSheet()}, icon('edit', 20))),
			dv('members', s.members.map(m => bt('mem', {onclick: () => memberSheet(m.id)}, h('span', {class: 'dot', style: {background: (m.color || '#1F7A4D') + '22'}}, m.emoji || '🙂'), m.name + (m.id === me() ? L(' (मैं)| (me)') : ''))),
				bt('mem', {id: 'add-member', onclick: () => memberSheet(null)}, sp('dot', '+'), L('सदस्य|Member'))),
			h('div', {class: 'btnrow mt14'},
				bt('btn wa', {id: 'invite', onclick: () => pro('sync', () => invite())}, icon('wa', 20), L('WhatsApp पर बुलाएँ|Invite on WhatsApp'))),
			h('div', {class: 'f-lab mt14'}, L('परिवार कोड — दूसरे फ़ोन पर "कोड से जुड़ें" में डालें|Family code — enter it on another phone under "Join with code"')),
			h('div', {class: 'codebox', id: 'family-code', 'aria-label': C.fmtSecret(secret()).split('').join(' ')}, C.fmtSecret(secret())),
			h('div', {class: 'btnrow mt8'},
				bt('btn ghost sm', {id: 'copy-code', onclick: () => {try {navigator.clipboard.writeText(C.fmtSecret(secret())); toast(L('कोड कॉपी हो गया|Code copied'));} catch (e) {toast(C.fmtSecret(secret()));}}}, L('कॉपी करें|Copy')),
				bt('btn ghost sm', {id: 'open-privacy', onclick: () => privacySheet()}, '🔐 ', L('प्राइवेसी|Privacy')))),
		subscriptionCard(P),
		grp(L('योजना|Plan'),
			srow('💼', L('महीने की आमदनी|Monthly income'), s.income ? fmt(s.income) : L('नहीं लिखी|Not set'), () => openPlan('income'), {id: 'set-income', sub: (s.incomes || []).length > 1 ? L(`${s.incomes.length} आमदनी मिलाकर|${s.incomes.length} incomes together`) : null}),
			srow('📆', L('तनख़्वाह की तारीख|Payday'), String(s.payday || 1), () => openPlan('income')),
			srow('🗓️', L('महीना कब से गिनें|Month starts on'), s.cycleStart === 'payday' ? L('तनख़्वाह के दिन से|Payday') : L('1 तारीख से|The 1st'), () => openPlan('income')),
			srow('🌱', L('पहले बचत|Save first'), s.saveAmt ? fmt(s.saveAmt) : s.savePct ? `${s.savePct}% · ${fmt(target)}` : L('नहीं|None'), () => openPlan('save'), {id: 'set-save'}),
			srow('🛟', L('घर कितने महीने चल सकता है|Months the home can run'), E.months == null ? '—' : String(E.months), () => emergencySheet(), {id: 'emergency', sub: s.savingsBalance ? L(`कुल बचत ${fmt(E.total)}`, `Savings ${fmt(E.total)}`) : L('अपनी कुल बचत एक बार लिखें|Enter your total savings once')}),
			srow('🗂️', L('श्रेणियाँ|Categories'), null, () => catsSheet(), {id: 'set-cats', sub: (n => L(`खर्च ${n('out')} · आमदनी ${n('in')} · बचत ${n('save')}`, `Spend ${n('out')} · income ${n('in')} · saving ${n('save')}`))(t => s.cats.filter(c => c.t === t && !c.hidden && !c.sys).length)}),
			srow('🧺', L('डिब्बे (बजट)|Budgets'), Object.values(s.budgets || {}).filter(v => v > 0).length ? String(Object.values(s.budgets).filter(v => v > 0).length) : L('कोई नहीं|None'), () => openPlan('budgets'), {id: 'set-budgets'})),
		grp(L('दिखावट|Look'),
			srow('🔤', L('भाषा|Language'), null, null, {stack: true, right: chips([['hi', 'हिन्दी'], ['en', 'English']], lang(), v => {S.devSet({lang: v}); document.documentElement.lang = v; G.render();})}),
			srow('👓', L('बड़े अक्षर (बुज़ुर्गों के लिए)|Elder mode (large text)'), null, null, {sub: L('बड़ा नंबर, बड़े बटन, बोलकर लिखें — मुफ़्त|Big number, big buttons, voice add — free'), right: h('span', {id: 'elder-toggle'}, toggle(!!S.devGet('elder'), v => {
				S.devSet({elder: v}); document.documentElement.classList.toggle('elder', v); G.render();
			}, L('बड़े अक्षर|Elder mode')))}),
			srow('🌗', L('थीम|Theme'), null, null, {stack: true, right: chips([['auto', L('अपने-आप|Auto')], ['light', L('हल्की|Light')], ['dark', L('गहरी|Dark')]], S.devGet('theme', 'auto'), v => {S.devSet({theme: v}); G.applyTheme();})})),
		grp(L('प्राइवेसी और सुरक्षा|Privacy & security'),
			srow('🔐', L('आपका डेटा कहाँ है|Where your data is'), null, () => privacySheet(), {id: 'privacy', sub: L('फ़ोन पर ताला लगकर ही सर्वर तक जाता है|Locked on your phone before it reaches the server')}),
			srow('🔒', L('4 अंकों का PIN|4-digit PIN'), null, null, {sub: L('खोलते समय और 1 मिनट बाद लॉक|Locks on open and after 1 minute away'), right: h('span', {id: 'pin-toggle'}, toggle(!!S.devGet('pinHash'), v => {G.render(); if (v) pinSetup(); else pinRemove();}, 'PIN'))}),
			srow('🔁', L('सबको हटाकर नया कोड|New code — remove everyone'), null, () => rotateSheet(), {id: 'rotate', sub: L('किसी को परिवार से हटाना हो तो|When someone should no longer have access')})),
		grp(L('याद दिलाना|Reminders'),
			Rm.supported ? srow('🔔', L('फ़ोन पर याद दिलाएँ|Phone reminders'), null, null, {id: 'remind-row', sub: Rm.perm === 'denied' ? L('फ़ोन की सेटिंग में सूचनाएँ बंद हैं — वहाँ से चालू करें|Notifications are blocked in phone settings — allow them there') : L('रात 9 बजे हिसाब, तनख़्वाह पर बचत, बाक़ी भुगतान|9 pm accounts, payday saving, dues'),
				right: h('span', {id: 'remind-toggle'}, toggle(Rm.on, async v => {if (v) {const ok = await R.enable(); toast(ok ? L('याद दिलाना चालू ✓|Reminders on ✓') : L('सूचनाओं की इजाज़त नहीं मिली|Notification permission was not given'));} else {await R.disable(); toast(L('याद दिलाना बंद|Reminders off'));} G.render();}, L('फ़ोन पर याद|Phone reminders')))}) : null,
			srow('💡', L('याद कब और कैसे आएगी?|When will reminders come?'), null, () => remindHelp(), {id: 'remind-help', sub: L('सीधी बात — क्या उम्मीद रखें|Plainly — what to expect')}),
			srow('⏰', L('रोज़ रात 9 बजे "हिसाब लिखें"|Daily 9 pm "write expenses"'), null, () => {download('ghar-kharch-daily.ics', 'text/calendar', C.icsDaily(lang(), today(), S.now())); toast(L('फ़ाइल खोलकर कैलेंडर में जोड़ें|Open the file to add it to your calendar'));}, {id: 'ics-daily', sub: L('कैलेंडर फ़ाइल (.ics) — जिन फ़ोन में सूचना न आए|Calendar file (.ics) — for phones without notifications')}),
			srow('🧾', L('बिलों की याद (एक दिन पहले)|Bill reminders (a day before)'), null, () => pro('ics', () => {download('ghar-kharch-bills.ics', 'text/calendar', C.icsBills(S.state(), today(), lang(), S.now())); toast(L('फ़ाइल खोलकर कैलेंडर में जोड़ें|Open the file to add it to your calendar'));}), {id: 'ics-bills', sub: L('सभी चालू बिल, एक फ़ाइल|All active bills, one file')})),
		grp(L('बैकअप|Backup'),
			srow('📊', L('Excel (CSV) में निकालें|Export to Excel (CSV)'), null, () => {download(`ghar-kharch-${today()}.csv`, 'text/csv;charset=utf-8', C.toCSV(S.state(), lang())); toast(L('CSV फ़ाइल बन गई|CSV ready'));}, {id: 'export-csv'}),
			srow('💾', L('पूरा बैकअप (JSON)|Full backup (JSON)'), null, () => exportJSON(), {id: 'export-json'}),
			srow('📥', L('बैकअप वापस लाएँ|Restore a backup'), null, () => importJSON(), {id: 'import-json'}),
			srow('🗑️', L('सारा डेटा मिटाएँ|Delete all data'), null, () => wipeSheet(), {id: 'wipe'})),
		grp(L('मदद|Help'),
			srow('❓', L('नंबर कैसे बनता है|How the number is made'), null, () => G.openExplain(), {id: 'help-number'}),
			FEEDBACK_WA ? srow('💬', L('सुझाव / शिकायत WhatsApp पर|Feedback on WhatsApp'), null, () => openUrl(C.waLink(FEEDBACK_WA, L('घर खर्च ऐप के बारे में: |About the Ghar Kharch app: '))), {id: 'feedback'}) : null,
			srow('🔀', L('किसी दूसरे परिवार से जुड़ें|Join a different family'), null, () => joinOther(), {id: 'join-other', sub: L('इस फ़ोन का हिसाब उस परिवार से बदल जाएगा|This phone switches to that family')}),
			srow('ℹ️', L('वर्ज़न|Version'), C.VERSION, null)),
		h('p', {class: 'proof'}, L('पहले बचत, फिर बेफ़िक्र खर्च — पूरा घर, एक हिसाब।|Save first, then spend without worry — the whole home, one account.')));
}
// reminders are shown by the phone itself (no server push yet) — say plainly what that means
function remindHelp() {
	return sheet({
		id: 'remind-help', title: L('याद कब और कैसे आएगी?|When will reminders come?'),
		body: () => h('div', {class: 'pad'},
			h('ul', {class: 'helplist', style: {marginTop: 0}},
				h('li', null, L('याद आपका फ़ोन खुद दिखाता है। Android पर Chrome में "होम स्क्रीन पर जोड़ा" ऐप हो, तो फ़ोन बीच-बीच में (लगभग हर घंटे) जाँचता है और रात 9 बजे के बाद "आज का हिसाब लिखें" दिखाता है।|Your phone shows the reminders itself. With the app added to the home screen from Chrome on Android, the phone checks now and then (about hourly) and shows "write today\'s accounts" after 9 pm.')),
				h('li', null, L('बैटरी बचाने के लिए फ़ोन यह जाँच टाल सकता है, इसलिए याद कभी-कभी देर से आती है या उस दिन नहीं आती। ऐप खोलते ही बाक़ी याद तुरंत दिखती है।|To save battery the phone may delay the check, so a reminder can come late or be skipped that day. Anything due shows at once when you open the app.')),
				h('li', null, L('जिस दिन हिसाब लिख दिया, उस रात की याद नहीं आती। तनख़्वाह के दिन "पहले बचत" और दूधवाले-कामवाली का बाक़ी भी याद आता है।|No 9 pm reminder on a day you already wrote. Payday "save first" and helpers\' dues are reminded too.')),
				h('li', null, L('iPhone पर, या अगर सूचना न आए: "रोज़ रात 9 बजे" कैलेंडर फ़ाइल जोड़ लें — कैलेंडर ठीक समय पर याद दिलाता है।|On iPhone, or if nothing comes: add the "Daily 9 pm" calendar file — the calendar rings on time.')))),
	});
}
function exportJSON() {download(`ghar-kharch-backup-${today()}.json`, 'application/json', JSON.stringify(S.exportJSON())); toast(L('बैकअप फ़ाइल बन गई|Backup ready'));}

// header chip next to the avatar: says in words what is wrong with sync; nothing at all when everything is synced
export function syncChip() {
	if (!secret() || !S.devGet('onboarded')) return null;
	const I = Sync.info(), n = I.pending, tap = L('टैप करें|tap');
	let t = null; // [what, detail] — two short lines so the title keeps its room at 360 px
	if (!I.online) t = [L('ऑफ़लाइन|Offline'), n ? L(`${n} बाक़ी`, `${n} waiting`) : L('फ़ोन में सुरक्षित|safe on phone')];
	else if (I.state === 'rotated') t = [L('कोड बदला|Code changed'), tap];
	else if (I.state === 'err') t = [L('सिंक नहीं हुआ|Not synced'), tap];
	else if (I.state === 'pending' && n && I.pendingFor > 15000) t = [L(`${n} बाक़ी`, `${n} waiting`), tap];
	else if (I.state === 'locked' && S.settings().members.length > 1) t = [L('सिंक बंद|Sync off'), 'Pro'];
	if (!t) return null;
	return bt('pill warn offpill', {id: I.online ? 'sync-chip' : 'offline-pill', 'aria-label': t.join(' · '), onclick: () => G.syncSheet && G.syncSheet(),
		style: {fontSize: '13px', lineHeight: '1.2', padding: '4px 11px', flexDirection: 'column', gap: 0, textAlign: 'center'}},
	h('span', {style: {fontWeight: 700}}, t[0]), h('span', null, t[1]));
}
G.syncChip = syncChip;

/* subscription: entitlement lives on the server (gk_license); the phone only shows it */
function subscriptionCard(P) {
	const until = d => C.fmtDate(d, lang(), {year: true});
	let ic = '🌱', title, sub;
	if (P.status === 'active') {ic = '👑'; title = L(`Pro पक्का ✓ — ${until(P.until)} तक`, `Pro confirmed ✓ — until ${until(P.until)}`); sub = P.plan === 'M' ? L('महीने का प्लान — ख़त्म होने से पहले याद दिलाएँगे, कोई ऑटो-कटौती नहीं|Monthly plan — we remind you before it ends, nothing is auto-debited') : L('परिवार सिंक, सेवाएँ, उधार-शगुन, रिपोर्ट, गुल्लक — सब चालू|Family sync, helpers, loans & shagun, reports, goals — all on');}
	else if (P.status === 'pending') {ic = '⏳'; title = L('Pro चालू — पेमेंट की पुष्टि हो रही है|Pro is on — confirming your payment'); sub = L(`आपका UTR मिलाकर पक्का करेंगे (आम तौर पर 24 घंटे में)। तब तक सब चालू — ${until(P.until)} तक।`, `We match your UTR and confirm (usually within 24 hours). Everything stays on meanwhile — until ${until(P.until)}.`);}
	else if (P.trial) {title = L(`पूरा ट्रायल — ${P.left} दिन बाक़ी`, `Full trial — ${P.left} ${P.left === 1 ? 'day' : 'days'} left`); sub = L('सब कुछ चालू। ट्रायल के बाद भी खर्च लिखना-देखना मुफ़्त रहेगा।|Everything is on. After the trial, writing and viewing stay free.');}
	else if (P.status === 'rejected') {ic = '⚠️'; title = L('पेमेंट नहीं मिला|Payment not found'); sub = L('जो UTR डाला था, वह हमारे खाते में नहीं आया। UTR दोबारा देखकर डालें या फिर से भुगतान करें।|The UTR you entered did not reach us. Check the UTR and enter it again, or pay again.');}
	else {title = L('ट्रायल पूरा — मुफ़्त प्लान|Trial over — free plan'); sub = L('खर्च लिखना, देखना और एक्सपोर्ट — हमेशा मुफ़्त|Writing, viewing and export — always free');}
	return h('section', {class: 'sec'}, dv('sec-h', h('h3', null, L('सदस्यता|Subscription'))),
		h('div', {class: 'card', style: {padding: '16px'}, id: 'subscription', 'data-status': P.status},
			h('div', {style: {display: 'flex', alignItems: 'center', gap: '10px'}}, h('span', {style: {fontSize: '28px'}, 'aria-hidden': 1}, ic), dv('row-main', dv('row-t', title), dv('row-s', sub))),
			P.status === 'pending' ? bt('linkbtn', {id: 'utr-again', style: {marginTop: '8px', display: 'block'}, onclick: () => paySheet(P.plan === 'M' ? 'M' : 'Y')}, L('UTR ग़लत डाला? सही UTR डालें|Entered a wrong UTR? Enter the right one'))
				: P.status !== 'active' ? h('div', {class: 'mt12'}, plansBlock()) : P.plan === 'M' ? bt('btn line block mt12', {id: 'renew', onclick: () => paySheet('M')}, L('एक महीना और जोड़ें — ₹49|Add one more month — ₹49')) : null,
			bt('linkbtn', {id: 'enter-code', style: {marginTop: '8px'}, onclick: () => codeSheet()}, L('एक्टिवेशन कोड है?|Have an activation code?'))));
}
function plansBlock() {
	return h('div', null,
		bt('plan-card rec', {id: 'plan-y', onclick: () => paySheet('Y', {launch: true})}, h('div', {class: 'plan-row'}, sp('plan-price num', L('₹399/साल|₹399/year')), sp('pill gold', L('सबसे अच्छा|Recommended'))),
			dv('row-s', L('₹1/दिन से कम · पूरे घर के लिए, सारे फ़ोन|Less than ₹1 a day · the whole home, every phone'))),
		bt('plan-card', {id: 'plan-m', onclick: () => paySheet('M', {launch: true})}, h('div', {class: 'plan-row'}, sp('plan-price num', L('₹49/महीना|₹49/month'))),
			dv('row-s', L('एक महीने के लिए · ऑटो-कटौती नहीं|For one month · no auto-debit'))),
		h('p', {class: 'note mt8'}, L('किसी भी UPI ऐप से भुगतान · UTR डालते ही Pro चालू|Pay from any UPI app · Pro turns on as soon as you enter the UTR')));
}
// tap a plan → the UPI app opens at once (or QR on another phone/computer) → "पेमेंट हो गया? UTR डालें" → Pro at once, confirmed later
export async function paySheet(planK, o = {}) {
	if (!secret()) return null;
	const fam = await V.familyId(secret());
	let k = planK || 'Y', utr = '', err = '', help = false, busy = false, opened = false;
	const link = () => C.upiPayLink({pa: UPI_ID, pn: PAYEE, am: C.PRICE[k], tn: 'GK-' + fam.slice(0, 6).toUpperCase()});
	const launch = () => {opened = true; S.devSet({payOpened: Date.now()}); openUrl(link());};
	if (o.launch && UPI_ID) launch();
	return sheet({
		id: 'pay', title: L('Pro लें|Get Pro'), cls: 'tall',
		body: api => {
			if (!UPI_ID) return h('div', {class: 'pad', id: 'pay-soon'}, h('div', {style: {fontSize: '40px', textAlign: 'center'}, 'aria-hidden': 1}, '🙏'), h('p', {class: 'lead', style: {textAlign: 'center'}}, L('UPI से भुगतान जल्द आ रहा है|UPI payment is coming soon')), h('p', {class: 'note', style: {textAlign: 'center'}}, L('तब तक सब कुछ वैसे ही चलता रहेगा। अगर आपके पास घर खर्च की ओर से मिला एक्टिवेशन कोड है, तो उससे Pro चालू करें।|Everything keeps working meanwhile. If you have an activation code from Ghar Kharch, use it to turn on Pro.')),
				bt('btn pri block mt14', {onclick: async () => {await api.close(); codeSheet();}}, L('कोड डालें|Enter code')));
			const price = fmt(C.PRICE[k]);
			return h('div', {class: 'pad'},
				h('div', {class: 'seg', role: 'tablist', id: 'pay-plan'}, [['Y', L('₹399 / साल|₹399 / year')], ['M', L('₹49 / महीना|₹49 / month')]].map(([v, lb]) => h('button', {role: 'tab', class: v === k ? 'on' : '', 'aria-selected': v === k ? 'true' : 'false', 'data-plan': v, onclick: () => {k = v; opened = false; api.refresh();}}, lb))),
				h('p', {class: 'note mt8'}, k === 'Y' ? L('12 महीने · पूरे घर के लिए|12 months · for the whole home') : L('1 महीना · ख़त्म होने से पहले याद दिलाएँगे · कोई ऑटो-कटौती नहीं|1 month · we remind you before it ends · no auto-debit')),
				h('div', {class: 'paystep'}, sp('n', '1'), dv('row-main', dv('row-t', L(`UPI से ${price} भेजें`, `Send ${price} by UPI`)), dv('row-s', L(`पाने वाला: ${PAYEE} · ${UPI_ID}`, `To: ${PAYEE} · ${UPI_ID}`)))),
				bt(opened ? 'btn line block mt10' : 'btn pri block mt10', {id: 'pay-upi', onclick: () => {launch(); api.refresh();}}, opened ? L('UPI ऐप फिर से खोलें|Open the UPI app again') : L(`UPI ऐप में ${price} भरें`, `Pay ${price} in a UPI app`)),
				h('details', {class: 'qrbox mt10', id: 'pay-qr'}, h('summary', null, L('दूसरे फ़ोन या कंप्यूटर पर? QR स्कैन करें|On another phone or computer? Scan the QR')),
					h('div', {class: 'qr', 'aria-label': L('UPI भुगतान का QR कोड|UPI payment QR code'), html: qrSvg(link(), 216)}),
					h('p', {class: 'note', style: {textAlign: 'center'}}, L(`किसी भी UPI ऐप से स्कैन करें — रकम ${price} पहले से भरी है`, `Scan with any UPI app — ${price} is already filled in`))),
				h('div', {class: 'paystep mt16'}, sp('n', '2'), dv('row-main', dv('row-t', L('पेमेंट हो गया? UPI ref / UTR (12 अंक) डालें|Paid? Enter the UPI ref / UTR (12 digits)')),
					dv('row-s', L('GPay: "UPI transaction ID" · PhonePe: "UTR" · Paytm: "UPI Ref No."|GPay: "UPI transaction ID" · PhonePe: "UTR" · Paytm: "UPI Ref No."')))),
				h('input', {class: 'inp mt8 utr', id: 'utr-in', inputmode: 'numeric', autocomplete: 'off', maxlength: 16, placeholder: '1234 5678 9012', value: utr, oninput: e => {utr = C.devToAsc(e.target.value).replace(/[^\d ]/g, ''); e.target.value = utr; const ok = C.isUtr(utr); const b = api.foot.querySelector('#utr-go'); if (b) b.classList.toggle('need', !ok);}}),
				err ? h('div', {class: 'errbox', role: 'alert', id: 'utr-err'}, err) : null,
				bt('linkbtn', {id: 'utr-help', 'aria-expanded': help ? 'true' : 'false', onclick: () => {help = !help; api.refresh();}}, L('कहाँ मिलेगा?|Where do I find it?')),
				help ? h('div', {class: 'box', id: 'utr-help-box'},
					h('p', {class: 'note', style: {margin: 0}}, L('भुगतान के बाद UPI ऐप में उस पेमेंट को खोलें:|After paying, open that payment in your UPI app:')),
					h('ul', {class: 'helplist'},
						h('li', null, h('b', null, 'Google Pay: '), L('हिस्ट्री → पेमेंट पर टैप → "UPI transaction ID" (12 अंक)|History → tap the payment → "UPI transaction ID" (12 digits)')),
						h('li', null, h('b', null, 'PhonePe: '), L('History → पेमेंट → "UTR" या "Transaction ID" के नीचे 12 अंक|History → the payment → the 12 digits under "UTR"')),
						h('li', null, h('b', null, 'Paytm: '), L('Balance & History → पेमेंट → "UPI Ref No." (12 अंक)|Balance & History → the payment → "UPI Ref No." (12 digits)')),
						h('li', null, h('b', null, 'BHIM / बैंक ऐप: '), L('Transactions → "UPI Ref" या "RRN"|Transactions → "UPI Ref" or "RRN"'))),
					h('p', {class: 'note', style: {margin: 0}}, L('बैंक का SMS भी देखें: "UPI Ref no 6123…" वाला नंबर।|Or check the bank SMS: the number after "UPI Ref no".'))) : null,
				h('p', {class: 'note mt10'}, L('UTR डालते ही Pro चालू हो जाता है। हम अपने खाते से मिलाकर पक्का करते हैं — ग़लत UTR पर Pro 7 दिन बाद बंद हो जाता है।|Pro turns on as soon as you enter the UTR. We confirm it against our account — with a wrong UTR, Pro stops after 7 days.')));
		},
		foot: api => !UPI_ID ? null : bt('btn pri block need', {id: 'utr-go', onclick: once(async () => {
			if (busy) return;
			if (!C.isUtr(utr)) {err = L('UTR 12 अंकों का होता है — दोबारा देखें|A UTR has 12 digits — please check'); api.refresh(); return;}
			busy = true;
			try {
				const r = await Sync.claim(k, utr.replace(/\s/g, ''));
				await G.closeAll();
				if (r && r.queued && !isPro()) toast(L('UTR मिल गया 🙏 — पुष्टि होते ही Pro चालू होगा|UTR received 🙏 — Pro turns on once it is confirmed'), {ms: 5000});
				else toast(r && r.queued ? L('UTR मिल गया 🙏 — पुष्टि हो रही है|UTR received 🙏 — confirming your payment') : L('Pro चालू 👑 — पुष्टि हो रही है|Pro is on 👑 — confirming your payment'), {ms: 5000});
				G.render(); Sync.syncNow();
			} catch (e) {
				const t = String(e && (e.body || e.message) || '');
				err = /already used/.test(t) ? L('यह UTR पहले ही इस्तेमाल हो चुका है|This UTR has already been used') : /12 digits/.test(t) ? L('UTR 12 अंकों का होता है — दोबारा देखें|A UTR has 12 digits — please check')
					: e && (e.http || e.user) ? L('अभी चालू नहीं हो पाया — थोड़ी देर बाद फिर कोशिश करें|Could not turn it on right now — try again in a while') : L('इंटरनेट नहीं — जुड़ने पर फिर दबाएँ|No internet — tap again when connected');
				api.refresh();
			} finally {busy = false;}
		})}, L('Pro चालू करें|Turn on Pro')),
	});
}
export function codeSheet() {
	let val = '', err = '';
	return sheet({
		id: 'code', title: L('एक्टिवेशन कोड|Activation code'),
		body: () => dv('pad', h('p', {class: 'note'}, L('घर खर्च की ओर से मिला कोड लिखें, जैसे GK-ABCD-EFGH (बड़े-छोटे अक्षर से फ़र्क नहीं पड़ता)|Type the code you got from Ghar Kharch, e.g. GK-ABCD-EFGH (case does not matter)')),
			h('input', {class: 'inp', id: 'code-in', value: val, placeholder: 'GK-XXXX-XXXX', autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false', style: {letterSpacing: '.08em', fontWeight: 700, textTransform: 'uppercase'}, oninput: e => {val = e.target.value;}}),
			err ? h('div', {class: 'errbox', role: 'alert', id: 'code-err'}, err) : null),
		foot: api => h('button', {
			class: 'btn pri block', id: 'code-go', onclick: once(async () => {
				const c = String(val).toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
				if (!/^GK[0-9A-Z]{8}$/.test(c)) {err = L('कोड ऐसा दिखना चाहिए: GK-XXXX-XXXX|The code should look like GK-XXXX-XXXX'); api.refresh(); return;}
				try {
					const r = await Sync.redeem(c);
					await G.closeAll();
					toast(L(`Pro चालू 👑 — ${C.fmtDate(r.paid_until, 'hi', {year: true})} तक`, `Pro is on 👑 — until ${C.fmtDate(r.paid_until, 'en', {year: true})}`));
					G.render(); Sync.syncNow();
				} catch (e) {
					const t = String(e && (e.body || e.message) || '');
					err = /already used/.test(t) ? L('यह कोड पहले ही इस्तेमाल हो चुका है|This code has already been used') : /not found/.test(t) ? L('यह कोड नहीं मिला — अक्षर दोबारा देखें|Code not found — check the letters')
						: e && (e.http || e.user) ? L('अभी चालू नहीं हो पाया — थोड़ी देर बाद फिर कोशिश करें|Could not turn it on right now — try again in a while') : L('इंटरनेट नहीं — जुड़ने पर फिर दबाएँ|No internet — tap again when connected');
					api.refresh(); const i = api.body.querySelector('#code-in'); if (i) i.value = val;
				}
			}),
		}, L('चालू करें|Activate')),
		focus: '#code-in',
	});
}
const FEATURE = () => ({
	sync: L('परिवार सिंक (2+ फ़ोन)|Family sync (2+ phones)'), svc: L('एक से ज़्यादा सेवाएँ|More than one helper'), bill: L('3 से ज़्यादा बिल|More than 3 bills'),
	wa: L('WhatsApp पर सेवा का हिसाब|WhatsApp helper bills'), registers: L('उधार और शगुन की डायरी|Loan & shagun registers'), report: L('महीने की रिपोर्ट फ़ोटो|Month report image'),
	goals: L('गुल्लक और त्योहार|Goals & festivals'), budgets: L('डिब्बे (बजट)|Budgets'), ics: L('कैलेंडर में बिलों की याद|Calendar bill reminders'),
});
export function lockSheet(feature) {
	const P = plan(), f = FEATURE()[feature];
	return sheet({
		id: 'lock', title: '', cls: 'tall',
		body: () => h('div', {class: 'pad', style: {textAlign: 'center'}},
			h('div', {style: {fontSize: '46px', marginTop: '4px'}, 'aria-hidden': 1}, '🏡'),
			h('h2', {style: {margin: '6px 0 4px', fontSize: '23px'}}, f ? L(`${f} — Pro में`, `${f} — in Pro`) : L('घर खर्च Pro|Ghar Kharch Pro')),
			h('p', {class: 'lead', style: {color: 'var(--ink2)'}}, P.trial ? L('यह सुविधा Pro में है।|This feature is part of Pro.') : L('आपका 30 दिन का पूरा ट्रायल ख़त्म हुआ। आपका सारा हिसाब सुरक्षित है — कुछ भी नहीं मिटा।|Your 30-day full trial has ended. All your data is safe — nothing is deleted.')),
			h('div', {class: 'box', style: {textAlign: 'left', marginTop: '10px'}},
				[L('👨‍👩‍👧 पूरा परिवार अपने-अपने फ़ोन से|👨‍👩‍👧 Whole family, each on their own phone'), L('🥛 दूधवाला-कामवाली का हिसाब WhatsApp पर|🥛 Milkman & maid bills on WhatsApp'), L('🤝 उधार और 🎁 शगुन की डायरी|🤝 Loans and 🎁 shagun register'), L('🪔 त्योहार-गुल्लक, डिब्बे, रिपोर्ट फ़ोटो|🪔 Festival goals, budgets, report image')]
					.map(t => h('div', {style: {padding: '6px 0'}}, t)),
				h('div', {class: 'note mt6'}, L('खर्च लिखना, देखना, आज का नंबर, बड़े अक्षर और एक्सपोर्ट — हमेशा मुफ़्त।|Writing spends, viewing, today\'s number, elder mode and export — always free.'))),
			h('div', {style: {marginTop: '14px', textAlign: 'left'}}, plansBlock())),
		foot: api => dv('btnrow', bt('btn ghost', {id: 'lock-later', onclick: () => api.close()}, L('अभी नहीं|Not now')), bt('btn pri', {id: 'lock-pay', onclick: () => paySheet('Y')}, L('Pro लें|Get Pro'))),
	});
}

/* Today's gentle subscription card: trial ending (from 7 days left), monthly/yearly renewal.
   Shown at most once a day — "बाद में" hides it until tomorrow. Today renders it via G.trialNudge(). */
export function trialNudge() {
	const P = plan(), td = today(), none = {show: false};
	if (!secret() || S.devGet('nudgeDay') === td) return none;
	const dismiss = () => S.devSet({nudgeDay: td});
	const base = {show: true, cls: 'gold', dismiss, dismissId: 'trial-later', dismissLabel: L('बाद में|Later')};
	if (P.trial && P.left <= 7) {
		// only entries written during the trial (not older history typed in or imported)
		const start = C.addDays(P.until, -(C.TRIAL_DAYS - 1)), from = Date.parse(start + 'T00:00:00+05:30');
		const last = P.left <= 1, n = S.state().tx.filter(t => !t.auto && !t.opening && t.cat !== 'opening' && t.date >= start && !(t.created < from)).length;
		const well = n >= 10 ? L(`इन दिनों आपने ${n} एंट्री लिखीं — शाबाश! `, `You have written ${n} entries so far — well done! `) : '';
		return {...base, id: 'trial-card', final: last,
			title: last ? L('आज Pro ट्रायल का आख़िरी दिन है 🙏|Today is the last day of your Pro trial 🙏') : L(`🌱 Pro ट्रायल ${P.left} दिन में ख़त्म होगा`, `🌱 Your Pro trial ends in ${P.left} days`),
			text: last ? L('कल से भी खर्च लिखना-देखना मुफ़्त रहेगा और कुछ नहीं मिटेगा। परिवार सिंक, सारी सेवाएँ-बिल और उधार-शगुन चालू रखने हों तो ₹399/साल (₹1/दिन से कम) या ₹49/महीना।|From tomorrow writing and viewing stay free and nothing is deleted. To keep family sync, all helpers and bills, loans and shagun: ₹399/year (less than ₹1 a day) or ₹49/month.')
				: well + L('पूरा घर साथ मिलकर हिसाब रखता रहे — परिवार सिंक, सारी सेवाएँ-बिल, उधार-शगुन — इसके लिए ₹399/साल, यानी ₹1/दिन से भी कम। आपका हिसाब हमेशा आपका रहेगा।|Keep the whole home together — family sync, all helpers and bills, loans and shagun — for ₹399/year, less than ₹1 a day. Your accounts always stay yours.'),
			action: () => G.paySheet && G.paySheet('Y'), actionId: 'trial-pay', actionLabel: L('प्लान चुनें|Choose a plan')};
	}
	if (P.status === 'active' && P.plan === 'M' && P.left <= 5) return {...base, id: 'renew-card', final: P.left <= 1,
		title: P.left <= 1 ? L('आज आपके महीने के प्लान का आख़िरी दिन है|Today is the last day of your monthly plan') : L(`महीने का प्लान ${P.left} दिन में ख़त्म होगा`, `Your monthly plan ends in ${P.left} days`),
		text: L('₹49 देकर एक महीना और जोड़ें — कोई ऑटो-कटौती नहीं होती। या ₹399 में पूरा साल (₹1/दिन से कम)।|Add one more month for ₹49 — nothing is auto-debited. Or a whole year for ₹399 (less than ₹1 a day).'),
		action: () => G.paySheet && G.paySheet('M'), actionId: 'renew-pay', actionLabel: L('₹49 भरें|Pay ₹49')};
	if (P.status === 'active' && P.plan === 'Y' && P.left <= 7) return {...base, id: 'renew-card', final: P.left <= 1,
		title: L(`साल का प्लान ${P.left} दिन में पूरा होगा`, `Your yearly plan ends in ${P.left} ${P.left === 1 ? 'day' : 'days'}`),
		text: L('साथ निभाने के लिए धन्यवाद 🙏 ₹399 में एक साल और जोड़ें — कोई ऑटो-कटौती नहीं होती।|Thank you for staying with us 🙏 Add another year for ₹399 — nothing is auto-debited.'),
		action: () => G.paySheet && G.paySheet('Y'), actionId: 'renew-pay', actionLabel: L('₹399 भरें|Pay ₹399')};
	return none;
}
G.trialNudge = trialNudge;
// the first sync on a new code stretches it into keys (≈0.1–1.5 s); say so if it is slow
try {window.addEventListener('gk-securing', () => toast(L('सुरक्षित किया जा रहा है…|Securing your data…'), {ms: 1600}));} catch (e) { /* not a browser */ }

/* family */
function familyNameSheet() {
	let v = S.settings().familyName || '';
	return sheet({
		id: 'famname', title: L('परिवार का नाम|Family name'), cls: 'small',
		body: () => dv('pad', h('input', {class: 'inp', value: v, maxlength: 30, placeholder: L('जैसे: शर्मा परिवार|e.g. The Sharmas'), oninput: e => {v = e.target.value;}})),
		foot: api => bt('btn pri block', {onclick: once(async () => {S.saveSettings({familyName: v.trim()}); await api.close();})}, L('सेव करें|Save')),
		focus: 'input',
	});
}
const EMOJIS = ['🙂', '👨', '👩', '👵', '👴', '👦', '👧', '🧑', '👶', '🧔', '👱‍♀️', '🧕'];
function memberSheet(id) {
	const s = S.settings(), m0 = id ? s.members.find(m => m.id === id) : null;
	const v = m0 ? {...m0} : {id: C.newId('m'), name: '', emoji: '🙂', color: C.MEMBER_COLORS[s.members.length % C.MEMBER_COLORS.length]};
	return sheet({
		id: 'member', title: m0 ? L('सदस्य बदलें|Edit member') : L('नया सदस्य|New member'),
		body: api0 => h('div', {class: 'pad'},
			!m0 ? field(L('जल्दी चुनें|Quick pick'), chips(C.MEMBER_CHIPS.map(([hi, en, e]) => [hi, `${e} ${L(hi, en)}`]), null, k => {const c = C.MEMBER_CHIPS.find(x => x[0] === k); v.name = L(c[0], c[1]); v.emoji = c[2]; const i = document.getElementById('mem-name'); if (i) i.value = v.name;})) : null,
			field(L('नाम|Name'), h('input', {class: 'inp', id: 'mem-name', value: v.name, maxlength: 20, oninput: e => {v.name = e.target.value;}})),
			field(L('निशान|Icon'), chips(EMOJIS.map(e => [e, e]), v.emoji, e => {v.emoji = e;})),
			field(L('रंग|Colour'), dv('chips', C.MEMBER_COLORS.map(c => h('button', {class: 'chip' + (c === v.color ? ' on' : ''), 'aria-label': c, style: {width: '44px', padding: 0, justifyContent: 'center'}, onclick: e => {v.color = c; for (const b of e.currentTarget.parentNode.children) b.classList.toggle('on', b === e.currentTarget);}}, h('span', {style: {width: '22px', height: '22px', borderRadius: '50%', background: c, display: 'block'}}))))),
			m0 && m0.id !== me() ? h('div', {class: 'box mt16'},
				h('p', {class: 'note', style: {margin: 0}}, L('हटाने से उनका नाम सूची से हटेगा, पर परिवार कोड उनके फ़ोन में रहेगा। पहुँच पूरी तरह बंद करनी हो तो "सबको हटाकर नया कोड" चलाएँ।|Removing takes them off the list, but their phone still has the family code. To cut access completely, use "New code — remove everyone".')),
				h('div', {class: 'btnrow mt10'},
					bt('btn ghost sm', {style: {color: 'var(--red)'}, onclick: once(async () => {const s2 = S.settings(); await api0.close(); S.saveSettings({members: s2.members.filter(x => x.id !== m0.id)}); toast(L('सदस्य हटाया — उनकी एंट्री बनी रहेंगी|Member removed — their entries stay'));})}, L('सूची से हटाएँ|Remove from list')),
					bt('btn ghost sm', {onclick: async () => {await api0.close(); rotateSheet();}}, L('नया कोड|New code')))) : null),
		foot: api => h('button', {
			class: 'btn pri block', id: 'mem-save', onclick: once(async () => {
				if (!v.name.trim()) {toast(L('नाम लिखें|Enter a name')); return;}
				const s2 = S.settings(), list = s2.members.slice(), i = list.findIndex(x => x.id === v.id);
				if (i >= 0) list[i] = {...v, name: v.name.trim()}; else list.push({...v, name: v.name.trim()});
				S.saveSettings({members: list}); await api.close();
			}),
		}, L('सेव करें|Save')),
	});
}
function invite() {
	const link = inviteLink(), code = C.fmtSecret(secret());
	const text = L(`हमारे घर का हिसाब "घर खर्च" ऐप में है। अपने फ़ोन से जुड़ने के लिए यह लिंक खोलें:\n${link}\n\nया ऐप में "कोड से जुड़ें" में यह कोड डालें: ${code}\n(यह कोड सिर्फ़ परिवार के लिए है — आगे न भेजें)`,
		`Our home's accounts are on the Ghar Kharch app. Open this link to join from your phone:\n${link}\n\nOr enter this code under "Join with code": ${code}\n(This code is only for the family — please don't forward it)`);
	openUrl('https://wa.me/?text=' + encodeURIComponent(text));
}
// same family = the decrypted settings were created at the same moment as ours (a code change keeps that record)
function sameFamily(res) {
	const rs = (res.recs || []).find(r => r.kind === 'settings' && !r.deleted), ls = S.settings();
	return !!(rs && rs.plan && rs.plan.created && ls.plan && rs.plan.created === ls.plan.created);
}
// rejoin in place after a code change: nothing on this phone is replaced, unsent edits still go up
export async function rejoinIfSame(k) {
	const res = await Sync.readFamily(k);
	if (!res.ok || !sameFamily(res)) return res;
	Sync.adoptJoin(k, res); S.mergeRemote(res.recs);
	toast(L('परिवार से फिर जुड़ गए ✓ — हिसाब वही है|Back with your family ✓ — same accounts'));
	G.render(); Sync.syncNow();
	return {...res, same: true};
}
G.rejoinIfSame = rejoinIfSame;
// Help → "join a different family" (backup-first warning), or — after the family's code was changed —
// a friendly "enter the new code" that keeps this phone's book when it is the same family
export function joinOther() {
	const moved = !!S.devGet('rotated');
	let v = '', err = '', other = false;
	return sheet({
		id: 'join', title: moved ? L('परिवार का नया कोड डालें|Enter the family\'s new code') : L('दूसरे परिवार से जुड़ें|Join a different family'),
		body: () => dv('pad',
			moved && !other ? h('p', {class: 'lead', style: {marginTop: 0}}, L('परिवार में किसी ने कोड बदला है। उनसे नया कोड लेकर यहाँ डालें — इस फ़ोन का हिसाब वैसे ही रहेगा।|Someone in the family changed the code. Get the new code from them and enter it here — this phone keeps its accounts.'))
				: h('div', {class: 'warnbox', style: {marginTop: 0}}, other ? L('यह कोड किसी दूसरे परिवार का है। जुड़ने पर इस फ़ोन का हिसाब उस परिवार के हिसाब से बदल जाएगा। पहले बैकअप ले लें।|This code belongs to a different family. Joining replaces this phone\'s book with theirs. Take a backup first.') : L('इस फ़ोन का अभी का हिसाब उस परिवार के हिसाब से बदल जाएगा। पहले बैकअप ले लें।|This phone\'s current book will be replaced by that family\'s. Take a backup first.')),
			h('p', {class: 'note mt10'}, L('दूसरे फ़ोन के "घर" टैब में दिखा 12 अक्षरों का कोड लिखें — जैसे 7KQ4-M2XD-9RTB|Type the 12-character code from the other phone\'s Home tab — e.g. 7KQ4-M2XD-9RTB')),
			h('input', {class: 'inp code-inp', id: 'join-code', placeholder: 'XXXX-XXXX-XXXX', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', maxlength: 16, value: v, oninput: e => {v = e.target.value; other = false;}}),
			err ? h('div', {class: 'errbox', role: 'alert', id: 'join-err'}, err) : null,
			!moved || other ? bt('linkbtn mt8', {onclick: () => exportJSON()}, L('पहले बैकअप लें|Take a backup first')) : null),
		foot: api => h('button', {
			class: (moved && !other ? 'btn pri' : 'btn danger') + ' block', id: 'join-go', onclick: once(async () => {
				const k = C.normSecret(v);
				if (!k) {err = L('कोड 12 अक्षरों का होता है — जैसे 7KQ4-M2XD-9RTB|The code has 12 characters — e.g. 7KQ4-M2XD-9RTB'); api.refresh(); return;}
				if (k === secret() && !moved) {err = L('यह तो यही परिवार है|That is this family already'); api.refresh(); return;}
				if (other) {await G.closeAll(); G.startJoin(k); return;}
				const b = api.foot.querySelector('#join-go'); if (b) {b.disabled = true; b.textContent = L('परिवार ढूँढ रहे हैं…|Looking for the family…');}
				const res = await rejoinIfSame(k);
				if (res.same) {await G.closeAll(); return;}
				if (!res.ok) err = res.reason === 'notfound' ? L('परिवार नहीं मिला — कोड दोबारा देखें|Family not found — check the code again') : res.reason === 'rotated' ? L('यह कोड भी बदल चुका है — परिवार से नया कोड माँगें|This code has also been changed — ask the family for the new one') : L('इंटरनेट नहीं — जुड़ने पर फिर कोशिश करें|No internet — try again when connected');
				else if (moved) {other = true; err = '';}
				else {await G.closeAll(); G.startJoin(k); return;}
				api.refresh(); const i = api.body.querySelector('#join-code'); if (i) i.value = v;
			}),
		}, moved && !other ? L('जुड़ें|Join') : L('हाँ, उस परिवार से जुड़ें|Yes, join that family')),
		focus: '#join-code',
	});
}

/* privacy */
export function privacySheet() {
	const q = (t, ...b) => h('div', {class: 'pv'}, h('h3', null, t), ...b);
	const p = t => h('p', null, t);
	return sheet({
		id: 'privacy', title: L('आपका डेटा और प्राइवेसी|Your data & privacy'), cls: 'tall',
		body: () => h('div', {class: 'pad privacy'},
			q(L('क्या रखा जाता है?|What is stored?'), p(L('आपकी एंट्री (रकम, श्रेणी, नोट), बिल, सेवाएँ (दूधवाला-कामवाली के नाम, फ़ोन नंबर, UPI ID), उधार-शगुन और परिवार के सदस्यों के नाम। बस इतना — न आपके SMS, न संपर्क, न जगह।|Your entries (amount, category, note), bills, helpers (names, phone numbers, UPI IDs), loans, shagun and family members\' names. Nothing else — not your SMS, contacts or location.'))),
			q(L('कहाँ रखा जाता है?|Where is it kept?'), p(L('हमेशा इसी फ़ोन में। परिवार सिंक चालू हो तो एक कॉपी हमारे सर्वर पर भी, ताकि सबके फ़ोन मिलते रहें।|Always on this phone. With family sync, a copy is also kept on our server so every phone stays the same.'))),
			q(L('फ़ोन पर ही ताला|Locked on your phone'), p(L('हर एंट्री फ़ोन से निकलने से पहले आपके 12 अक्षर के परिवार कोड से ताला लगकर (AES-256 एन्क्रिप्शन) जाती है। यह कोड कभी सर्वर पर नहीं जाता।|Every entry is locked with your 12-character family code (AES-256 encryption) before it leaves the phone. The code itself never goes to the server.'))),
			q(L('सर्वर पर सिर्फ़ बंद डिब्बा|The server keeps only a locked box'), p(L('आपका हिसाब फ़ोन पर ही ताले में बंद होकर जाता है — हमारे सर्वर पर सिर्फ़ बंद डिब्बा रहता है; कोड के बिना कोई नहीं खोल सकता। चाबी बनाने के लिए फ़ोन कोड को 2 लाख बार घुमाता है, इसलिए अंदाज़े से कोड ढूँढना बहुत मुश्किल है।|Your accounts are locked on your phone before they travel — our server keeps only a locked box; nobody can open it without the code. To make the key, the phone turns the code 200,000 times, so guessing the code is very hard.')),
				p(L('हमें बस इतना दिखता है: कितनी एंट्री हैं, कब बदलीं, और आपकी सदस्यता (भुगतान का UTR)।|All we can see is how many records there are, when they changed, and your subscription (the payment UTR).'))),
			q(L('परिवार कोड किसके पास?|Who has the family code?'), p(L('जिसके पास कोड या न्योता लिंक है, वह परिवार में जुड़ सकता है — इसे सिर्फ़ परिवार में रखें। किसी को हटाना हो तो "सबको हटाकर नया कोड" चलाएँ: पुराना कोड बेकार हो जाएगा।|Anyone with the code or invite link can join — keep it within the family. To remove someone, use "New code — remove everyone": the old code stops working.'))),
			q(L('अपना डेटा ले जाएँ या मिटाएँ|Take your data or delete it'), p(L('कभी भी Excel/JSON में निकालें। "सारा डेटा मिटाएँ" इस फ़ोन से और चाहें तो सर्वर से भी सब मिटा देता है।|Export to Excel/JSON any time. "Delete all data" erases everything from this phone and, if you choose, from the server too.'))),
			q(L('न विज्ञापन, न डेटा की बिक्री|No ads, no selling data'), p(L('ऐप सदस्यता से चलता है। आपका डेटा किसी को नहीं दिया जाता।|The app is paid for by subscriptions. Your data is never shared.'))),
			h('div', {class: 'btnrow mt14'},
				bt('btn ghost sm', {onclick: () => exportJSON()}, '💾 ', L('बैकअप लें|Back up')),
				bt('btn ghost sm', {id: 'pv-rotate', onclick: () => rotateSheet()}, '🔁 ', L('नया कोड|New code'))),
			bt('btn ghost sm red block mt10', {id: 'pv-wipe', onclick: () => wipeSheet()}, '🗑️ ', L('सारा डेटा मिटाएँ|Delete all data'))),
	});
}
// "सबको हटाकर नया कोड": everything is re-encrypted under a new code and pushed; old rows are deleted
export function rotateSheet() {
	let step = 'ask', next = '';
	return sheet({
		id: 'rotate', title: L('सबको हटाकर नया कोड|New code — remove everyone'),
		body: api => step === 'done' ? h('div', {class: 'pad', style: {textAlign: 'center'}},
			h('div', {style: {fontSize: '42px', marginTop: '2px'}, 'aria-hidden': 1}, '🔐'),
			h('h2', {style: {margin: '4px 0 12px', fontSize: '21px'}}, L('नया परिवार कोड तैयार ✓|New family code ready ✓')),
			h('div', {class: 'codebox', id: 'new-code', 'aria-label': C.fmtSecret(next).split('').join(' ')}, C.fmtSecret(next)),
			h('p', {class: 'note mt10'}, L('पुराना कोड अब काम नहीं करेगा। जिन्हें परिवार में रखना है, उन्हें नया लिंक भेजें — उनके फ़ोन पर "नया कोड डालें" दिखेगा।|The old code no longer works. Send the new link to everyone who should stay — their phones will ask for the new code.')))
			: h('div', {class: 'pad'},
				h('p', {class: 'lead'}, L('किसी को परिवार से पूरी तरह हटाना है? या कोड ग़लत हाथ में चला गया?|Need to remove someone completely? Or did the code reach the wrong person?')),
				h('ul', {class: 'helplist'},
					h('li', null, L('एक नया 12 अक्षर का कोड बनेगा|A new 12-character code is made')),
					h('li', null, L('सारा हिसाब नए कोड से ताला लगाकर दोबारा भेजा जाएगा|All data is locked again with the new code and sent')),
					h('li', null, L('सर्वर से पुराना डेटा मिट जाएगा — पुराने कोड वाले फ़ोन का सिंक रुक जाएगा|Old data is deleted from the server — phones with the old code stop syncing')),
					h('li', null, L('जिन्हें रखना है, उन्हें नया न्योता भेजें|Send a new invite to everyone who should stay'))),
				!navigator.onLine ? dv('errbox', L('इसके लिए इंटरनेट चाहिए|This needs the internet')) : null),
		foot: api => step === 'done' ? h('div', {class: 'btnrow'}, bt('btn ghost', {onclick: () => api.close()}, L('बंद करें|Close')), bt('btn wa', {id: 'rotate-invite', onclick: () => invite()}, icon('wa', 20), L('नया न्योता भेजें|Send new invite')))
			: bt('btn danger block', {id: 'rotate-go', onclick: once(async () => {
				if (S.devGet('rotated')) {toast(L('इस फ़ोन का कोड पहले ही बदला जा चुका है — नया कोड डालकर जुड़ें|This phone\'s code was already changed — join with the new code'), {ms: 5000}); return;}
				if (!isPro()) {G.lockSheet('sync'); return;}
				const b = api.foot.querySelector('#rotate-go'); if (b) {b.disabled = true; b.textContent = L('नया कोड बना रहे हैं…|Making the new code…');}
				try {next = C.newSecret(); await Sync.rotate(next); step = 'done'; api.refresh(); G.render();}
				catch (e) {toast(L('अभी नहीं हो पाया — इंटरनेट देखें और फिर कोशिश करें|Could not do it now — check the internet and try again')); api.refresh();}
			})}, L('नया कोड बनाएँ|Make a new code')),
	});
}

/* plan sheets */
export function openPlan(which) {
	const s = S.settings();
	if (which === 'budgets') return pro('budgets', () => budgetsSheet());
	if (which === 'savings') return savingsSheet();
	if (which === 'save') {
		let pct = s.savePct || 0, amt = s.saveAmt || 0, mode = s.saveAmt ? 'amt' : 'pct';
		return sheet({
			id: 'plan-save', title: L('पहले बचत|Save first'),
			body: api => dv('pad', h('p', {class: 'note'}, L('तनख़्वाह आते ही पहले कितना अलग रखें?|How much to set aside as soon as income comes?')),
				h('div', {class: 'chips mt10'}, [0, 10, 15, 20, 25].map(p => h('button', {class: 'chip' + (mode === 'pct' && pct === p ? ' on' : ''), onclick: () => {mode = 'pct'; pct = p; amt = 0; api.refresh();}}, p ? p + '%' : L('नहीं|None'))),
					h('button', {class: 'chip' + (mode === 'amt' ? ' on' : ''), onclick: () => {mode = 'amt'; api.refresh();}}, L('₹ रकम|₹ amount'))),
				mode === 'amt' ? field(L('हर महीने (₹)|Every month (₹)'), moneyInput(amt, p => {amt = p || 0;})) : null,
				h('p', {class: 'lead mt14'}, mode === 'pct' && pct && s.income ? L(`हर महीने पहले ${fmt(Math.round(s.income * pct / 100 / 100) * 100)} बचत`, `Save ${fmt(Math.round(s.income * pct / 100 / 100) * 100)} first every month`) : '')),
			foot: api => bt('btn pri block', {onclick: once(async () => {S.saveSettings(mode === 'amt' ? {saveAmt: amt, savePct: 0} : {savePct: pct, saveAmt: 0}); await api.close();})}, L('सेव करें|Save')),
		});
	}
	// incomes (one or more earners), payday, cycle start
	const srcs = (s.incomes && s.incomes.length ? s.incomes : [{id: 'i1', name: '', amt: s.income || 0, day: s.payday || 1}]).map(x => ({...x}));
	let cs = s.cycleStart || '1';
	return sheet({
		id: 'plan-income', title: L('आमदनी और तनख़्वाह|Income & payday'), cls: 'tall',
		body: api => h('div', {class: 'pad'},
			srcs.map((x, i) => h('div', {class: 'box' + (i ? ' mt12' : ''), 'data-income': i},
				i ? field(L('किसकी / किससे?|Whose / from what?'), h('input', {class: 'inp', value: x.name, maxlength: 24, placeholder: L('जैसे: पत्नी की तनख़्वाह, किराया|e.g. wife\'s salary, rent'), oninput: e => {x.name = e.target.value;}})) : null,
				field(i ? L('हर महीने (₹)|Every month (₹)') : L('महीने की आमदनी (लगभग)|Monthly income (approx.)'), moneyInput(x.amt, p => {x.amt = p || 0;})),
				field(L('किस तारीख को आती है?|Which day does it come?'), h('select', {class: 'inp', onchange: e => {x.day = +e.target.value; api.refresh();}}, Array.from({length: 31}, (_, d) => h('option', {value: d + 1, selected: x.day === d + 1}, String(d + 1))))),
				i ? bt('linkbtn', {style: {color: 'var(--red)'}, onclick: () => {srcs.splice(i, 1); api.refresh();}}, L('हटाएँ|Remove')) : null)),
			srcs.length < 4 ? bt('btn line sm mt10', {id: 'add-income', onclick: () => {srcs.push({id: 'i' + Date.now().toString(36), name: '', amt: 0, day: 1}); api.refresh();}}, '+ ', L('एक और आमदनी|Another income')) : null,
			srcs[0].day > 1 ? field(L('महीना कब से गिनें?|Count the month from'), chips([['1', L('1 तारीख से|The 1st')], ['payday', L(`तनख़्वाह के दिन (${srcs[0].day} तारीख) से`, `Payday (the ${srcs[0].day}th)`)]], cs, v => {cs = v;}),
				L('तनख़्वाह महीने के आख़िर में आती हो तो "तनख़्वाह के दिन से" चुनें — तब वही पैसा अगले महीने के खर्च के लिए गिना जाएगा।|If salary comes near the month end, choose "payday" — then it counts for the month it is spent in.')) : null),
		foot: api => bt('btn pri block', {id: 'income-save', onclick: once(async () => {
			const list = srcs.filter((x, i) => i === 0 || x.amt > 0);
			S.saveSettings({income: list.reduce((a, x) => a + (x.amt || 0), 0), payday: list[0].day || 1, incomes: list.length > 1 ? list : [], cycleStart: list[0].day > 1 ? cs : '1'});
			await api.close(); toast(L('योजना सेव हुई|Plan saved'));
		})}, L('सेव करें|Save')),
	});
}
function savingsSheet() {
	let v = S.settings().savingsBalance || 0;
	return sheet({
		id: 'plan-sav', title: L('अभी की कुल बचत|Current total savings'),
		body: () => dv('pad', h('p', {class: 'note'}, L('बैंक, FD, PPF, सोना… सब मिलाकर लगभग कितना? आगे की बचत अपने-आप जुड़ेगी।|Bank, FD, PPF, gold… about how much in all? Later savings add up by themselves.')),
			field(L('कुल बचत (₹)|Total savings (₹)'), moneyInput(v, p => {v = p || 0;}))),
		foot: api => bt('btn pri block', {id: 'sav-save', onclick: once(async () => {S.saveSettings({savingsBalance: v, savingsAsOf: today()}); await api.close(); toast(L('बचत लिख दी|Savings saved'));})}, L('सेव करें|Save')),
	});
}
function emergencySheet() {
	const E = C.emergencyMonths(S.state(), today());
	const xr = (op, l, v) => dv('xl-r', sp('xl-op', op), dv('xl-m', dv('xl-l', l)), sp('xl-a', v));
	return sheet({
		id: 'emerg', title: L('घर कितने महीने चल सकता है|Months the home can run'),
		body: () => dv('pad', h('div', {class: 'box xl'},
			xr('', L('कुल बचत (शुरू की बचत + तब से बचाया)|Total savings (starting balance + saved since)'), fmt(E.total)),
			xr('÷', E.basis === 'pace' ? L('इस महीने की रफ़्तार से महीने का खर्च|Monthly spending at this month\'s pace') : L(`पिछले ${E.n} महीनों का औसत खर्च`, `Average spending of the last ${E.n} months`), fmt(E.avg)),
			dv('xl-r eq', sp('xl-op', '='), dv('xl-m', dv('xl-l', L('महीने — अगर आमदनी रुक जाए|Months — if income stops'))), sp('xl-a', E.months == null ? '—' : String(E.months)))),
			h('p', {class: 'note mt12'}, L('3–6 महीने का होना अच्छा माना जाता है।|3–6 months is considered healthy.')),
			bt('btn ghost block mt10', {id: 'emerg-sav', onclick: () => savingsSheet()}, L('अपनी कुल बचत लिखें / बदलें|Enter / change total savings'))),
	});
}
function budgetsSheet() {
	const s = S.settings(), b = {...(s.budgets || {})};
	return sheet({
		id: 'budgets', title: L('डिब्बे (बजट)|Budgets'), cls: 'tall',
		body: api => dv('pad', h('p', {class: 'note'}, L('जैसे राशन ₹6,000, बाहर खाना ₹2,000।|e.g. groceries ₹6,000, eating out ₹2,000.')),
			h('div', {class: 'list mt12'}, s.cats.filter(c => c.t === 'out' && !c.hidden && !c.sys).map(c => h('div', {class: 'setrow', 'data-budget': c.id},
				h('span', {class: 'row-ic', style: {width: '36px', height: '36px', fontSize: '19px'}}, c.e),
				dv('row-main', dv('row-t', C.catName(c, lang())), b[c.id] > 0 ? h('div', {style: {marginTop: '6px', maxWidth: '170px'}}, moneyInput(b[c.id], p => {b[c.id] = p || 0;})) : null),
				toggle(b[c.id] > 0, on => {b[c.id] = on ? (b[c.id] || 200000) : 0; api.refresh();}, C.catName(c, lang())))))),
		foot: api => bt('btn pri block', {id: 'budgets-save', onclick: once(async () => {const out = {}; for (const k in b) if (b[k] > 0) out[k] = b[k]; S.saveSettings({budgets: out}); await api.close(); toast(L('डिब्बे सेव हुए|Budgets saved'));})}, L('सेव करें|Save')),
	});
}
function catsSheet() {
	let type = 'out';
	return sheet({
		id: 'cats', title: L('श्रेणियाँ|Categories'), cls: 'tall', live: true,
		body: api => {
			const s = S.settings();
			return h('div', {class: 'pad'},
				dv('seg', [['out', L('खर्च|Spend')], ['in', L('आमदनी|Income')], ['save', L('बचत|Saving')]].map(([k, lb]) => h('button', {class: k === type ? 'on' : '', onclick: () => {type = k; api.refresh();}}, lb))),
				h('div', {class: 'list mt12'}, s.cats.filter(c => c.t === type && !c.sys).map(c => bt('row', {onclick: () => catEdit(c.id)},
					dv('row-ic', c.e), dv('row-main', h('div', {class: 'row-t', style: {opacity: c.hidden ? .55 : 1}}, C.catName(c, lang())), c.hidden ? dv('row-s', L('छुपी हुई|Hidden')) : null), sp('chev', icon('chev', 18))))),
				bt('btn pri block mt12', {onclick: () => catEdit(null, type)}, icon('plus', 20), L('नई श्रेणी|New category')));
		},
	});
}
function catEdit(id, type) {
	const s = S.settings(), c0 = id ? s.cats.find(c => c.id === id) : null;
	const v = c0 ? {...c0} : {id: 'c' + Date.now().toString(36), e: '🏷️', hi: '', en: '', t: type || 'out'};
	let name = c0 ? C.catName(c0, lang()) : '';
	const EM = ['🏷️', '🛒', '🍔', '🚕', '🐶', '🎮', '💄', '🏋️', '📦', '🍼', '🪴', '🧾', '🎓', '🙏', '✈️', '🍬'];
	return sheet({
		id: 'catedit', title: c0 ? L('श्रेणी बदलें|Edit category') : L('नई श्रेणी|New category'),
		body: () => h('div', {class: 'pad'},
			field(L('नाम|Name'), h('input', {class: 'inp', id: 'cat-name', value: name, maxlength: 24, oninput: e => {name = e.target.value;}})),
			field(L('निशान|Icon'), chips([...new Set([v.e, ...EM])].map(e => [e, e]), v.e, e => {v.e = e;})),
			c0 ? trow(L('छुपाएँ|Hide'), L('पुरानी एंट्री में दिखती रहेगी|Still shows on old entries'), toggle(!!v.hidden, x => {v.hidden = x;}, L('छुपाएँ|Hide'))) : null),
		foot: api => h('button', {
			class: 'btn pri block', onclick: once(async () => {
				if (!name.trim()) {toast(L('नाम लिखें|Enter a name')); return;}
				const s2 = S.settings(), cats = s2.cats.slice(), nv = {...v, [lang() === 'en' ? 'en' : 'hi']: name.trim()};
				if (!c0) {nv.hi = nv.hi || name.trim(); nv.en = nv.en || name.trim();}
				const i = cats.findIndex(c => c.id === v.id); if (i >= 0) cats[i] = nv; else cats.push(nv);
				S.saveSettings({cats}); await api.close();
			}),
		}, L('सेव करें|Save')),
	});
}

/* PIN (salted per phone, so a new family code does not break it) */
export const pinOk = p => C.pinHash(S.devGet('pinSalt') || S.devGet('secret', ''), p) === S.devGet('pinHash');
export function pinPad(onDone, title, sub) {
	let pin = '';
	const dots = h('div', {class: 'pin-dots', 'aria-hidden': 1}, [0, 1, 2, 3].map(() => h('i')));
	const set = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < pin.length));
	const press = k => {if (k === '⌫') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k; set(); if (pin.length === 4) {const p = pin; setTimeout(() => {const ok = onDone(p); if (ok === false) {pin = ''; set(); dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake');}}, 120);}};
	return h('div', {style: {display: 'flex', flexDirection: 'column', alignItems: 'center'}},
		title ? h('div', {class: 'lead', style: {fontWeight: 700, textAlign: 'center'}}, title) : null, sub ? h('div', {class: 'note', style: {textAlign: 'center'}}, sub) : null, dots,
		dv('pinpad', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(k => k ? h('button', {'data-pin': k, 'aria-label': k === '⌫' ? L('मिटाएँ|Delete') : k, onclick: () => press(k)}, k) : h('span'))));
}
function pinSetup() {
	let first = null;
	return sheet({
		id: 'pinset', title: L('PIN लगाएँ|Set a PIN'), cls: 'tall',
		body: api => pinPad(p => {
			if (!first) {first = p; api.refresh(); return true;}
			if (p !== first) {first = null; toast(L('दोनों PIN अलग थे — फिर से|PINs did not match — try again')); api.refresh(); return false;}
			const salt = C.randomKey(16);
			S.devSet({pinSalt: salt, pinHash: C.pinHash(salt, p)}); api.close(); toast(L('PIN लग गया 🔒|PIN set 🔒')); G.render(); return true;
		}, first ? L('फिर से वही PIN|Enter the same PIN again') : L('4 अंकों का नया PIN|New 4-digit PIN'), L('भूल जाएँ तो परिवार कोड से खोल सकते हैं|If you forget it, unlock with the family code')),
	});
}
function pinRemove() {
	return sheet({
		id: 'pinrm', title: L('PIN हटाएँ|Remove PIN'), cls: 'tall',
		body: api => pinPad(p => {
			if (!pinOk(p)) return false;
			S.devSet({pinHash: '', pinSalt: ''}); api.close(); toast(L('PIN हटा दिया|PIN removed')); G.render(); return true;
		}, L('अभी का PIN डालें|Enter current PIN')),
	});
}

/* backup */
function importJSON() {
	const inp = h('input', {type: 'file', accept: 'application/json,.json', style: {display: 'none'}});
	inp.addEventListener('change', async () => {
		const f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
		let data; try {data = JSON.parse(await f.text());} catch (e) {toast(L('यह बैकअप फ़ाइल नहीं लगती|This does not look like a backup file')); return;}
		const recs = Array.isArray(data) ? data : data && data.records;
		if (!Array.isArray(recs) || !recs.every(r => r && r.id && r.kind)) {toast(L('यह बैकअप फ़ाइल नहीं लगती|This does not look like a backup file')); return;}
		const n = recs.filter(r => r.kind === 'tx').length;
		confirmSheet(L('बैकअप वापस लाएँ?|Restore backup?'), L(`${recs.length} रिकॉर्ड (${n} एंट्री) जुड़ेंगे। जो पहले से हैं, उनमें नया वाला रहेगा।`, `${recs.length} records (${n} entries) will be merged. Where both exist, the newer one is kept.`), L('वापस लाएँ|Restore'), () => {
			const k = S.importRecords(recs, {keepUpdated: true}); toast(L(`${k} रिकॉर्ड वापस आए`, `${k} records restored`));
		});
	});
	document.body.appendChild(inp); inp.click();
	window.__lastFileInput = inp;
}
export function wipeSheet() {
	const word = L('मिटाएँ|DELETE');
	let v = '', server = true;
	const synced = !!secret(); // any phone with a family code may have rows on the server
	return sheet({
		id: 'wipe', title: L('सारा डेटा मिटाएँ|Delete all data'),
		body: api => dv('pad', h('p', {class: 'lead'}, L('इस फ़ोन का सारा हिसाब मिटेगा। पहले बैकअप ले लें।|All data on this phone will be erased. Take a backup first.')),
			synced ? trow(L('सर्वर से भी मिटाएँ|Also delete from the server'), L('पूरे परिवार की सर्वर कॉपी मिटेगी — दूसरे फ़ोन में जो है, वह उनके फ़ोन में रहेगा|Removes the family\'s server copy — other phones keep what is on them'), toggle(server, x => {server = x;}, L('सर्वर से भी|Server too'))) : null,
			h('p', {class: 'note mt10'}, L(`पक्का करने के लिए "${word}" लिखें`, `Type "${word}" to confirm`)),
			h('input', {class: 'inp', id: 'wipe-in', autocomplete: 'off', oninput: e => {v = e.target.value;}})),
		foot: api => dv('btnrow', bt('btn ghost', {onclick: () => api.close()}, L('रहने दें|Cancel')),
			bt('btn danger', {id: 'wipe-go', onclick: once(async () => {
				if (v.trim() !== word && v.trim().toUpperCase() !== 'DELETE') {toast(L(`"${word}" लिखें`, `Type "${word}"`)); return;}
				if (synced && server) {try {await Sync.deleteServerCopy();} catch (e) {toast(L('सर्वर से नहीं मिट पाया — इंटरनेट देखें|Could not delete from the server — check the internet')); return;}}
				S.wipe(); location.replace(location.pathname);
			})}, L('मिटाएँ|Delete'))),
	});
}
