/* Yukti Publications — site.js v0.1 */
const CFG = {
  whatsapp: '917500029885',            // business WhatsApp (country code + number)
  email: 'yuktipublication@gmail.com',
  supabaseUrl: '',                     // fill to store leads in Supabase (table: leads)
  supabaseKey: '',
  shopifyDomain: '',                   // fill when the Shopify store exists (e.g. yukti.myshopify.com)
  shopifyToken: '',
  parikshaUrl: 'https://yuktiparikhsa.in'
};
const BASE = (location.pathname.match(/^(.*\/)[^/]*$/)||['','/'])[1];
let lang = 'en'; try{ const sv = localStorage.getItem('yk-lang'); lang = sv || ((navigator.language||'').startsWith('hi') ? 'hi' : 'en'); }catch(e){}
const T = {
  en:{ home:'Home', books:'Books', samples:'Free samples', teachers:'Teachers', sellers:'Booksellers', errata:'Errata & Key Challenge', contact:'Contact', lang:'हिन्दी',
       tagline:'Exam prep books from Agra, since 2013', foot:'© Yukti Publications, Agra. All rights reserved.', priceReq:'Price on request', buy:'Buy now', amazon:'Buy on Amazon', sample:'Download sample PDF', freemock:'Free first mock test', pages:'Pages', language:'Language', kind:'Type', exam:'Exam',
       hi:'Hindi', en:'English', bi:'Bilingual', practice:'Practice sets', guide:'Guide', solved:'Solved papers', current:'Current affairs', all:'All',
       sent:'Thank you — we will send it to your WhatsApp shortly.', sentWa:'Opening WhatsApp with your request…', need:'Please enter your name and 10-digit mobile number.', whatsapp:'WhatsApp us', copied:'Copied' },
  hi:{ home:'होम', books:'पुस्तकें', samples:'मुफ़्त सैंपल', teachers:'शिक्षक', sellers:'पुस्तक विक्रेता', errata:'शुद्धि-पत्र व कुंजी चुनौती', contact:'संपर्क', lang:'English',
       tagline:'आगरा से परीक्षा की किताबें, 2013 से', foot:'© युक्ति पब्लिकेशन्स, आगरा। सर्वाधिकार सुरक्षित।', priceReq:'मूल्य पूछें', buy:'अभी ख़रीदें', amazon:'Amazon पर ख़रीदें', sample:'सैंपल PDF डाउनलोड करें', freemock:'पहला मॉक टेस्ट मुफ़्त', pages:'पृष्ठ', language:'भाषा', kind:'प्रकार', exam:'परीक्षा',
       hi:'हिन्दी', en:'अंग्रेज़ी', bi:'द्विभाषी', practice:'अभ्यास सेट', guide:'गाइड', solved:'हल प्रश्नपत्र', current:'करेंट अफेयर्स', all:'सभी',
       sent:'धन्यवाद — हम इसे आपके WhatsApp पर भेजेंगे।', sentWa:'आपकी माँग के साथ WhatsApp खुल रहा है…', need:'कृपया नाम और 10 अंकों का मोबाइल नंबर लिखें।', whatsapp:'WhatsApp करें', copied:'कॉपी हो गया' }
};
const t = k => (T[lang][k] ?? T.en[k] ?? k);
const inr = n => n==null ? t('priceReq') : '₹' + Number(n).toLocaleString('en-IN');

function applyLang(){
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-hi]').forEach(el=>{
    if(!el.dataset.en) el.dataset.en = el.innerHTML;
    el.innerHTML = lang==='hi' ? el.dataset.hi : el.dataset.en;
  });
  document.querySelectorAll('[data-t]').forEach(el=>{ el.textContent = t(el.dataset.t); });
  document.querySelectorAll('[data-ph]').forEach(el=>{ el.placeholder = lang==='hi' ? el.dataset.ph : (el.dataset.phen || el.placeholder); if(!el.dataset.phen) el.dataset.phen = el.placeholder; });
  const lb = document.getElementById('langbtn'); if(lb) lb.textContent = t('lang');
}
function setLang(l){ lang = l; try{ localStorage.setItem('yk-lang', l); }catch(e){} applyLang(); document.dispatchEvent(new Event('langchange')); }

function header(){
  const here = location.pathname.split('/').pop() || 'index.html';
  const links = [['index.html','home'],['books.html','books'],['samples.html','samples'],['teachers.html','teachers'],['booksellers.html','sellers'],['errata.html','errata'],['contact.html','contact']];
  const h = document.getElementById('hdr'); if(!h) return;
  h.className = 'hdr'; h.innerHTML = `<div class="wrap"><a class="logo" href="index.html"><i>य</i>Yukti</a>
    <nav class="nav" id="nav">${links.map(([u,k])=>`<a href="${u}" class="${here===u?'on':''}" data-t="${k}"></a>`).join('')}</nav>
    <div class="row" style="gap:8px"><button class="langbtn" id="langbtn"></button><button class="burger" id="burger" aria-label="menu">☰</button></div></div>`;
  document.getElementById('langbtn').onclick = ()=>setLang(lang==='hi'?'en':'hi');
  document.getElementById('burger').onclick = ()=>document.getElementById('nav').classList.toggle('open');
  const f = document.getElementById('ftr'); if(f){ f.className='ftr'; f.innerHTML = `<div class="wrap">
    <div><b>Yukti Publications</b><span data-t="tagline"></span><br><span class="muted">${CFG.email} · +91 ${CFG.whatsapp.slice(2)}</span><br><br><span data-t="foot"></span></div>
    <div><b data-hi="पुस्तकें">Books</b>${links.slice(1,3).map(([u,k])=>`<a href="${u}" data-t="${k}"></a>`).join('')}<a href="${CFG.parikshaUrl}" target="_blank" rel="noopener">Yukti Pariksha ↗</a></div>
    <div><b data-hi="और">More</b>${links.slice(3).map(([u,k])=>`<a href="${u}" data-t="${k}"></a>`).join('')}</div></div>`; }
  applyLang();
}

let DATA = null;
async function data(){ if(DATA) return DATA; const r = await fetch(BASE+'data/books.json'); DATA = await r.json(); return DATA; }
function bookCard(b){
  const ex = DATA.exams.find(e=>e.id===b.exam);
  return `<a class="book fade" href="book.html?id=${b.id}"><div class="cover ${b.cover}"><small>${ex?ex[lang]:''}</small><span class="lang">${t(b.lang)}</span><div class="t">${b.title[lang]}</div></div>
    <div class="meta"><b>${b.title[lang]}</b><small>${t(b.kind)}${b.pages?` · ${b.pages} ${t('pages')}`:''}</small>
    <div class="price"><span>${b.mrp&&b.price&&b.mrp>b.price?`<span class="mrp">${inr(b.mrp)}</span>`:''}${inr(b.price)}</span><span class="muted" style="font-weight:600;font-size:13px">→</span></div></div></a>`;
}
async function renderBooks(sel, opts={}){
  await data(); const el = document.querySelector(sel); if(!el) return;
  let list = DATA.books; if(opts.exam) list = list.filter(b=>b.exam===opts.exam); if(opts.limit) list = list.slice(0, opts.limit);
  el.innerHTML = list.map(bookCard).join('') || `<p class="muted">—</p>`;
}
async function renderExamChips(sel, onPick){
  await data(); const el = document.querySelector(sel); if(!el) return;
  const cur = new URL(location).searchParams.get('exam') || '';
  el.innerHTML = `<a class="chip ${cur?'':'on'}" href="books.html">${t('all')}</a>` + DATA.exams.map(e=>`<a class="chip ${cur===e.id?'on':''}" href="books.html?exam=${e.id}">${e[lang]}</a>`).join('');
}
async function renderBook(){
  await data(); const id = new URL(location).searchParams.get('id'); const b = DATA.books.find(x=>x.id===id); const el = document.getElementById('book'); if(!el) return;
  if(!b){ el.innerHTML = `<p>Not found. <a href="books.html">All books</a></p>`; return; }
  const ex = DATA.exams.find(e=>e.id===b.exam); document.title = `${b.title[lang]} — Yukti Publications`;
  const buyBtn = b.shopify && CFG.shopifyDomain ? `<div id="shopify-buy" data-product="${b.shopify}"></div>`
    : b.amazon ? `<a class="btn saff wide" href="${b.amazon}" target="_blank" rel="noopener">${t('amazon')} ↗</a>`
    : `<a class="btn saff wide" href="https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent((lang==='hi'?'मुझे यह पुस्तक चाहिए: ':'I want to order: ')+b.title[lang])}" target="_blank" rel="noopener">${t('buy')} · WhatsApp</a>`;
  el.innerHTML = `<div class="detail fade"><div><div class="cover ${b.cover}"><small>${ex?ex[lang]:''}</small><span class="lang">${t(b.lang)}</span><div class="t" style="font-size:22px">${b.title[lang]}</div></div></div>
    <div><div class="eyebrow">${ex?ex[lang]:''} · ${t(b.kind)}</div><h1 style="font-size:clamp(26px,3.5vw,40px);margin-top:6px">${b.title[lang]}</h1><p class="lead" style="margin-top:12px">${b.blurb[lang]}</p>
    <div class="specs"><div><small>${t('pages')}</small><b>${b.pages||'—'}</b></div><div><small>${t('language')}</small><b>${t(b.lang)}</b></div><div><small>${t('kind')}</small><b>${t(b.kind)}</b></div><div><small>${t('exam')}</small><b>${ex?ex[lang]:''}</b></div></div>
    ${b.toc&&b.toc.length?`<h3 data-hi="अंदर क्या है">What's inside</h3><ul class="toc" style="margin-top:8px">${b.toc.map(x=>`<li>${x}</li>`).join('')}</ul>`:''}
    <div class="buy"><div class="pr">${inr(b.price)}${b.mrp&&b.price&&b.mrp>b.price?`<s>${inr(b.mrp)}</s>`:''}</div>${buyBtn}
      <a class="btn ghost wide" href="samples.html?book=${b.id}">${t('sample')}</a>
      <p class="note" data-hi="प्रीपेड ऑर्डर · पूरे भारत में डिलीवरी · छपाई की ग़लती मिले तो शुद्धि-पत्र पेज देखें।">Prepaid orders · delivery across India · printing errors go on our public Errata page.</p></div></div></div>`;
  applyLang();
}

/* lead capture: Supabase if configured, else WhatsApp deep link */
async function submitLead(form, kind){
  const f = new FormData(form); const name = (f.get('name')||'').trim(); const phone = (f.get('phone')||'').replace(/\D/g,'').slice(-10);
  const exam = f.get('exam')||''; const note = f.get('note')||''; const book = f.get('book')||'';
  if(!name || phone.length!==10){ toast(t('need')); return; }
  const payload = {kind, name, phone, exam, note, book, lang, page: location.pathname, ts: new Date().toISOString()};
  if(CFG.supabaseUrl && CFG.supabaseKey){
    try{ const r = await fetch(`${CFG.supabaseUrl}/rest/v1/leads`, {method:'POST', headers:{'Content-Type':'application/json', apikey:CFG.supabaseKey, Authorization:'Bearer '+CFG.supabaseKey, Prefer:'return=minimal'}, body: JSON.stringify(payload)});
      if(r.ok){ form.querySelector('.ok').classList.add('on'); form.reset(); toast(t('sent')); return; } }catch(e){}
  }
  const msg = (lang==='hi' ? `नमस्ते युक्ति, मैं ${name}। ` : `Hi Yukti, I am ${name}. `) + ({sample: lang==='hi'?'मुझे सैंपल PDF चाहिए':'Please send the sample PDF', mock: lang==='hi'?'मुझे मुफ़्त मॉक टेस्ट चाहिए':'Please send the free mock test', dealer: lang==='hi'?'मैं पुस्तक विक्रेता हूँ, डीलर रेट चाहिए':'I am a bookseller, please share dealer terms', teacher: lang==='hi'?'मैं शिक्षक हूँ, inspection copy / थोक रेट चाहिए':'I am a teacher, please share inspection copy / bulk rates', contact: note||''}[kind]||'') + (exam?` · ${exam}`:'') + (book?` · ${book}`:'') + (note&&kind!=='contact'?` · ${note}`:'');
  toast(t('sentWa')); window.open(`https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
  form.querySelector('.ok').classList.add('on');
}
function wireForms(){ document.querySelectorAll('form[data-lead]').forEach(f=>{ f.onsubmit = e=>{ e.preventDefault(); submitLead(f, f.dataset.lead); }; }); }
async function fillExamSelect(){ await data(); document.querySelectorAll('select[name=exam]').forEach(s=>{ const cur = s.value; s.innerHTML = `<option value="">${t('exam')}…</option>` + DATA.exams.map(e=>`<option value="${e.id}">${e[lang]}</option>`).join(''); s.value = cur; }); }
async function fillBookSelect(){ await data(); document.querySelectorAll('select[name=book]').forEach(s=>{ const pre = new URL(location).searchParams.get('book')||''; s.innerHTML = `<option value="">${t('books')}…</option>` + DATA.books.map(b=>`<option value="${b.id}" ${pre===b.id?'selected':''}>${b.title[lang]}</option>`).join(''); }); }

let toastT; function toast(m){ let el = document.getElementById('toast'); if(!el){ el = document.createElement('div'); el.id='toast'; el.className='toast'; document.body.appendChild(el); } el.textContent = m; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(()=>el.classList.remove('on'), 2600); }

async function renderErrata(){
  const el = document.getElementById('errata'); if(!el) return;
  try{ const r = await fetch(BASE+'data/errata.json'); const E = await r.json();
    el.innerHTML = `<div class="r"><span>${lang==='hi'?'पुस्तक · पृष्ठ':'Book · page'}</span><span>${lang==='hi'?'छपा था':'Printed'}</span><span>${lang==='hi'?'सही':'Correct'}</span></div>` +
      (E.items.length ? E.items.map(x=>`<div class="r"><span><span class="tag">${x.book}</span><br><small class="muted">${lang==='hi'?'पृष्ठ':'p.'} ${x.page}${x.q?` · Q${x.q}`:''} · ${x.date}</small></span><span class="was">${x.was}</span><span class="now">${x.now}${x.note?`<br><small class="muted" style="font-weight:500">${x.note}</small>`:''}</span></div>`).join('')
       : `<div class="r"><span></span><span class="muted">${lang==='hi'?'अभी कोई प्रविष्टि नहीं।':'No entries yet.'}</span><span></span></div>`);
  }catch(e){ el.innerHTML=''; }
}

document.addEventListener('DOMContentLoaded', ()=>{ header(); wireForms(); fillExamSelect(); fillBookSelect(); renderErrata(); const p = document.body.dataset.page;
  if(p==='home'){ renderBooks('#latest', {limit:8}); }
  if(p==='books'){ renderExamChips('#chips'); renderBooks('#grid', {exam: new URL(location).searchParams.get('exam')||''}); }
  if(p==='book'){ renderBook(); }
});
document.addEventListener('langchange', ()=>{ const p = document.body.dataset.page; fillExamSelect(); fillBookSelect(); renderErrata();
  if(p==='home') renderBooks('#latest', {limit:8}); if(p==='books'){ renderExamChips('#chips'); renderBooks('#grid', {exam: new URL(location).searchParams.get('exam')||''}); } if(p==='book') renderBook(); });
