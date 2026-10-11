import re, sys
p='/tmp/claude-0/-home-claude/b3b786fe-2630-570a-811c-7efa4e555f1c/scratchpad/site/index.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)>=1, 'MISSING: '+old[:80]
    s=s.replace(old,new,count)

# 1. fonts
rep('family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap">',
    'family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Yatra+One&display=swap">')

# 2. CSS — Jantri skin
css = r'''
/* ---------- Jantri skin (wall-calendar home) ---------- */
html.jantri .hero{background:#FBF7EE;color:#1F1A17;padding:0;gap:0;box-shadow:0 14px 26px -14px rgba(0,0,0,.35),0 2px 0 #D9D0C0;border-radius:6px}
html.jantri .hero::after{display:none}
.jh{display:flex;flex-direction:column}
.jh .perf{height:8px;border-bottom:2px dashed rgba(0,0,0,.16);background:repeating-linear-gradient(90deg,transparent 0 18px,rgba(0,0,0,.08) 18px 22px);background-size:40px 100%;background-position:center top;background-repeat:repeat-x}
.jh .mast{background:#C8102E;color:#FBF7EE;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:15px}
.jh .mast small{font-size:11px;font-weight:700;letter-spacing:.14em;font-family:'DM Sans',sans-serif}
.jh .topj{display:grid;grid-template-columns:118px 1fr;gap:8px;align-items:center;padding:6px 16px 0}
.jh .date{font-family:'Yatra One','Noto Sans Devanagari',serif;font-size:96px;line-height:.9;color:#C8102E;text-align:center;letter-spacing:-.02em}
.jh .side{display:flex;flex-direction:column;gap:1px;min-width:0}
.jh .dow{font-size:19px;font-weight:700;line-height:1.1}
.jh .dn{font-size:12.5px;color:#6E5A44}
.jh .lf{font-size:12px;color:#6E5A44;margin-top:6px}
.jh .free{font-size:30px;font-weight:700;letter-spacing:-.03em;line-height:1.05;font-variant-numeric:tabular-nums;color:#1F1A17}
.jh .free.neg{color:#C8102E}
.jh .pd{font-size:12.5px;font-weight:700;color:#1C5A36}
.jh .strips{margin:8px 16px 0;display:flex;flex-direction:column}
.jh .js{position:relative;display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:baseline;min-height:38px;border-bottom:1px solid rgba(0,0,0,.12);font-size:15px;color:#1F1A17;text-align:left;width:100%;padding:0 6px;overflow:hidden;border-radius:3px}
.jh .js:last-child{border-bottom:2px solid #1F1A17}
.jh .js i{position:absolute;left:0;top:0;bottom:0;width:0;opacity:.16;transition:width .9s var(--ease);border-radius:0}
.jh .js.s1 i{background:#1C5A36}.jh .js.s2 i{background:#B9841A}.jh .js.s3 i{background:#2C5A8A}
.jh .js .n{font-weight:700;position:relative;white-space:nowrap}
.jh .js .m{position:relative;font-size:12px;color:#6E5A44;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.jh .js .a{position:relative;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.jh .js .a.ok{color:#1C5A36}.jh .js .a.todo{color:#B9841A}
.jh .inj{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 16px 10px;font-size:12.5px;color:#6E5A44;cursor:pointer}
.jh .inj b{color:#1F1A17;font-weight:700;font-variant-numeric:tabular-nums}
.jh .inj .chev{color:#6E5A44}
.jh .foot{text-align:center;font-size:10px;color:#9A8870;letter-spacing:.1em;padding:0 0 6px}
html.jantri #s-home .top h1{font-family:'Noto Sans Devanagari','DM Sans',sans-serif}
html.elder.jantri .jh .date{font-size:110px}
html.elder.jantri .jh .js{font-size:18px;min-height:44px}
/* page tear */
@keyframes tearoff{0%{transform:rotate(0) translateY(0);opacity:1}25%{transform:rotate(-2deg) translateY(4px)}60%{transform:rotate(12deg) translateY(45vh);opacity:1}100%{transform:rotate(26deg) translateY(120vh);opacity:0}}
.tearwrap{position:fixed;z-index:60;pointer-events:none;transform-origin:50% 0;animation:tearoff 1.5s cubic-bezier(.4,0,.8,.4) both;box-shadow:0 20px 40px rgba(0,0,0,.35);border-radius:6px;overflow:hidden}
'''
rep('</style>\n</head>', css+'</style>\n</head>')

# 3. settings toggle (after elder block)
rep('''<div class="lang"><button id="el-off"></button><button id="el-on"></button></div></div>''',
    '''<div class="lang"><button id="el-off"></button><button id="el-on"></button></div></div>
  <div class="sec"><div class="sec-h"><div class="t" data-i="look"></div></div><div class="hint" style="text-align:left;padding:0 2px" data-i="lookhint"></div><div class="lang"><button id="lk-jantri"></button><button id="lk-plain"></button></div></div>''')

# 4. strings
rep("elderon:'बड़ा · आसान',bolo:'बोलो'}",
    "elderon:'बड़ा · आसान',bolo:'बोलो',look:'घर स्क्रीन का रूप',lookhint:'जंत्री = दीवार के कैलेंडर जैसा पन्ना। इस फ़ोन पर ही लागू।',lookjantri:'जंत्री',lookplain:'साधारण',jantri:'जंत्री',perdayj:'रोज़',upto:'तक',daysj:'दिन',munim:'मुनीम ने लिखा — ठीक है?',ghartitle2:'घर खर्च'}")
rep("elderon:'Big · simple',bolo:'Speak'}",
    "elderon:'Big · simple',bolo:'Speak',look:'Home screen look',lookhint:'Jantri = a wall-calendar page. Applies to this phone only.',lookjantri:'Jantri',lookplain:'Plain',jantri:'Jantri',perdayj:'Up to',upto:'a day',daysj:'days',munim:'Munim wrote this — OK?',ghartitle2:'Ghar Kharch'}")
# munim title on the voice proof
rep("ask({title:t('vreview'), sub:`${R.items.length}", "ask({title:t('munim'), sub:`${R.items.length}")

# 5. skin state + toggle wiring, next to elder
rep("function setElder(v){",
    "let skin = 'jantri'; try{ skin = localStorage.getItem('gl-skin') || 'jantri'; }catch(e){}\n"
    "function applySkin(){ document.documentElement.classList.toggle('jantri', skin==='jantri'); const a = document.getElementById('lk-jantri'), b = document.getElementById('lk-plain'); if(a){ a.className = skin==='jantri'?'on':''; a.textContent = t('lookjantri'); b.className = skin==='plain'?'on':''; b.textContent = t('lookplain'); } }\n"
    "function setSkin(v){ skin = v; try{ localStorage.setItem('gl-skin', v); }catch(e){} const h = document.getElementById('hero'); if(h) delete h.dataset.built; applySkin(); renderAll(); go('home'); }\n"
    "document.getElementById('lk-jantri').onclick = ()=>setSkin('jantri'); document.getElementById('lk-plain').onclick = ()=>setSkin('plain');\n"
    "function setElder(v){")
rep("renderSettings(); renderSync(); checkLock(); applyElder(); }",
    "renderSettings(); renderSync(); checkLock(); applyElder(); applySkin(); }")

# 6. Jantri hero renderer — branch inside renderHome
old_hero_start = "  const hero = document.getElementById('hero');\n  if(!hero.dataset.built){ hero.innerHTML = `<div class=\"top2\">"
assert old_hero_start in s
new_block = '''  const hero = document.getElementById('hero');
  if(skin==='jantri'){ renderJantri(hero, {out, left, jl, perDay}); }
  else {
  if(hero.dataset.built==='j') hero.dataset.built='';
  if(!hero.dataset.built){ hero.innerHTML = `<div class="top2">'''
rep(old_hero_start, new_block)
# close the else after the he-in wiring
rep("  const hin = document.getElementById('he-in'); hin.classList.add('tap'); hin.onclick = inflowSheet;\n",
    "  const hin = document.getElementById('he-in'); hin.classList.add('tap'); hin.onclick = inflowSheet;\n  }\n")

# the renderer itself, placed before renderClose
jr = r'''
/* ---------- Jantri hero (wall-calendar page) ---------- */
function renderJantri(hero, X){
  const {left, jl, perDay} = X;
  const babPl0 = plan.emergency.plan + sipTotal() + provTotal(), babDn0 = babDone() + babEntries();
  const fixPl0 = fixedTotal(), fixDn0 = fixedPaidTotal() + fixOther();
  const babTodo = Math.max(0, babPl0 - babDn0), fixTodo = Math.max(0, fixPl0 - fixDn0);
  const free = left - babTodo - fixTodo;
  const recv = inflowTotal(), hand = recv - X.out, toCome0 = Math.max(0, plan.income - recv);
  const dt = new Date(now.getFullYear(), now.getMonth(), TODAY);
  const mon = (MS[lang][now.getMonth()]||'') ; const yr = now.getFullYear();
  const strip = (cls, n, pl, dn, td, dl, tl) => `<button class="js ${cls}" data-lane="${cls==='s1'?'bab':cls==='s2'?'fix':'var'}"><i style="width:${pl?Math.min(100,dn/pl*100):0}%"></i><span class="n">${n}</span><span class="m">${inr(dn)} ${dl}</span><span class="a ${td?'todo':'ok'}">${td ? inr(td)+' '+tl : '✓'}</span></button>`;
  if(hero.dataset.built!=='j'){ hero.innerHTML = `<div class="jh"><div class="perf"></div><div class="mast"><span id="jh-mast"></span><small id="jh-ym"></small></div>
    <div class="topj"><div class="date" id="jh-date"></div><div class="side"><div class="dow" id="jh-dow"></div><div class="dn" id="jh-dn"></div><div class="lf" id="jh-lf"></div><div class="free" id="jh-free"></div><div class="pd" id="jh-pd"></div></div></div>
    <div class="strips" id="jh-strips"></div><div class="inj tap" id="jh-in"></div><div class="foot" id="jh-foot"></div></div>`; hero.dataset.built='j'; }
  document.getElementById('jh-mast').textContent = `${t('ghartitle2')} · ${t('jantri')}`;
  document.getElementById('jh-ym').textContent = `${mon.slice(0,3).toUpperCase()} ${yr}`;
  document.getElementById('jh-date').textContent = TODAY;
  document.getElementById('jh-dow').textContent = DAYS[lang][dt.getDay()];
  document.getElementById('jh-dn').textContent = `${t('day')} ${TODAY}/${DIM} · ${DAYS_LEFT} ${t('left')}`;
  document.getElementById('jh-lf').textContent = t('trulyfree');
  const fv = document.getElementById('jh-free'); fv.classList.toggle('neg', free<0); countTo(fv, free);
  document.getElementById('jh-pd').textContent = lang==='hi' ? `${t('perdayj')} ${inr(Math.round(perDay))} ${t('upto')} · ${DAYS_LEFT} ${t('daysj')}` : `${t('perdayj')} ${inr(Math.round(perDay))} ${t('upto')} · ${DAYS_LEFT} ${t('daysj')}`;
  document.getElementById('jh-strips').innerHTML =
    strip('s1', t('laneBab'), babPl0, babDn0, babTodo, t('done'), t('notdone')) +
    strip('s2', t('laneFix'), fixPl0, fixDn0, fixTodo, t('paid'), t('topay')) +
    strip('s3', t('laneVar'), jarTotal(), varSpent(), Math.max(0, jarTotal()-varSpent()), t('used'), t('leftof').toLowerCase());
  hero.querySelectorAll('[data-lane]').forEach(b=>b.onclick=()=>{ const tgt = {bab:'#bab-grid', fix:'#fix-list', var:'#jars'}[b.dataset.lane]; const el = document.querySelector(tgt); if(el){ buzz(4); el.closest('.sec').scrollIntoView({behavior:'smooth', block:'start'}); } });
  const ji = document.getElementById('jh-in');
  ji.innerHTML = `<span>${t('received')} <b>${inr(recv)}</b>${toCome0 ? ` · ${t('tocome')} <b style="color:#B9841A">${inr(toCome0)}</b>` : ''}</span><span>${t('inhand')} <b style="color:${hand<0?'#C8102E':'#1C5A36'}">${inr(hand)}</b> <span class="chev">›</span></span>`;
  ji.onclick = inflowSheet;
  document.getElementById('jh-foot').textContent = `— ${lang==='hi'?'परिवार':'family'} · ${t('ghartitle2')} —`;
}
function tearPage(){
  return new Promise(res=>{
    const hero = document.getElementById('hero'); if(!hero || skin!=='jantri'){ res(); return; }
    const r = hero.getBoundingClientRect(); const w = document.createElement('div'); w.className='tearwrap';
    w.style.cssText += `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
    const c = hero.cloneNode(true); c.id=''; c.style.cssText='margin:0;width:100%;height:100%'; w.appendChild(c); document.body.appendChild(w);
    buzz([8,30,12,30,20]); setTimeout(()=>{ w.remove(); res(); }, 1500);
  });
}
'''
rep("/* ---------- month close (one tap, with the sweep) ---------- */", jr + "\n/* ---------- month close (one tap, with the sweep) ---------- */")

# 7. page tear on close
rep("delete viewCache[pk]; await saveCfg(); await pullBab(); buzz([10,40,18,40,10]); renderAll();",
    "delete viewCache[pk]; await saveCfg(); await pullBab(); await tearPage(); buzz([10,40,18,40,10]); renderAll();")

open(p,'w',encoding='utf-8').write(s)
print('ok')
