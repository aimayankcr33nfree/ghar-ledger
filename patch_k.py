import re
p='/tmp/claude-0/-home-claude/b3b786fe-2630-570a-811c-7efa4e555f1c/scratchpad/site/index.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)>=1, 'MISSING: '+old[:90]
    s=s.replace(old,new,count)

# fonts: add Tiro for bahi
rep('family=Yatra+One&display=swap">','family=Yatra+One&family=Tiro+Devanagari+Hindi&display=swap">')

css = r'''
/* ---------- SKIN TOKENS (whole app) ---------- */
html.jantri[lang]{
  --bg:#EDE6D8; --card:#FBF7EE; --ink:#1F1A17; --ink2:#3A312A; --muted:#6E5A44; --line:#DCD1BE; --soft:#F1EADB; --soft2:#E4DAC6;
  --blue:#1F1A17; --blue-ink:#000; --blue-soft:#ECE4D4; --blue-tint:#D6CAB2;
  --orange:#B9841A; --orange-soft:#F6EBD2; --orange-tint:#E7D3A3;
  --green:#1C5A36; --green-soft:#DDEAD9; --green-tint:#B9D4B3;
  --dark:#1F1A17; --dark2:#2E2620; --dark-ink:#FBF7EE; --dark-muted:#C9BBA6;
  --r:8px; --r-sm:6px;
  --shadow:0 1px 0 #D9D0C0, 0 8px 20px -14px rgba(60,40,20,.35);
  --shadow-lg:0 2px 0 #D9D0C0, 0 20px 36px -20px rgba(60,40,20,.45);
}
html.jantri .days button.t{background:#C8102E}
html.jantri .top h1{font-family:'Noto Sans Devanagari','DM Sans',sans-serif}
html.jantri .tab.plus .pb{background:#1F1A17;box-shadow:0 10px 22px -8px rgba(0,0,0,.5)}
html.jantri .tab.mic .pb{background:#C8102E}
html.jantri .bcard .lbl,html.jantri .pcard .ph,html.jantri .sec-h .a{color:#B9841A}
html.jantri .bcard .ring .fg{stroke:#1C5A36}
html.jantri .closecard{background:var(--card);border:1.5px solid #C8102E}
html.jantri .sheet,html.jantri .card,html.jantri .closecard,html.jantri .due{border-radius:6px}
html.jantri .sheet{border-radius:10px 10px 0 0}

html.bahi[lang]{
  --bg:#E9DEC3; --card:#F8F1E1; --ink:#1F1A17; --ink2:#3A2E26; --muted:#6E5A44; --line:#D9C9A8; --soft:#EFE4CB; --soft2:#E2D4B4;
  --blue:#B3261E; --blue-ink:#8E1B15; --blue-soft:#F3E3DB; --blue-tint:#E3C2B6;
  --orange:#B8862B; --orange-soft:#F5EAD0; --orange-tint:#E6D09C;
  --green:#1C5A36; --green-soft:#DDEAD9; --green-tint:#B9D4B3;
  --dark:#1F1A17; --dark2:#2E2620; --dark-ink:#F6EEDC; --dark-muted:#CDBFA5;
  --r:6px; --r-sm:4px;
  --shadow:0 1px 0 #D4C4A2, 0 8px 20px -14px rgba(60,30,10,.35);
  --shadow-lg:0 2px 0 #D4C4A2, 0 20px 36px -20px rgba(60,30,10,.45);
}
html.bahi body{font-family:'Tiro Devanagari Hindi','DM Sans','Noto Sans Devanagari',serif}
html.bahi .num,html.bahi .tt,html.bahi .amt,html.bahi .big,html.bahi .v,html.bahi .v2,html.bahi .big2{font-family:'DM Sans',sans-serif}
html.bahi .top h1{font-family:'Tiro Devanagari Hindi',serif;font-weight:400;letter-spacing:0}
html.bahi .sec-h .t{font-family:'Tiro Devanagari Hindi',serif;font-weight:400;font-size:20px}
html.bahi .sec-h .n{background:#B8862B;color:#1F1A17;border-radius:4px}
html.bahi .tabs{background:#8E1B15;border-top:2px solid #B8862B}
html.bahi .tab{color:rgba(246,238,220,.75)}
html.bahi .tab.on{color:#F6EEDC;background:rgba(255,255,255,.1)}
html.bahi .tab.plus .pb{background:#B8862B;color:#1F1A17;box-shadow:0 10px 22px -8px rgba(0,0,0,.5)}
html.bahi .tab.mic .pb{background:#B3261E;color:#F6EEDC}
html.bahi .days button.t{background:#B3261E}
html.bahi .btn{border-radius:6px}
html.bahi .card,html.bahi .closecard,html.bahi .due{border-radius:6px}
html.bahi .sheet{border-radius:8px 8px 0 0;border-top:6px solid #8E1B15}
html.bahi .hero{background:#8E1B15;color:#F6EEDC;padding:0;gap:0;border-radius:6px;box-shadow:0 14px 26px -14px rgba(0,0,0,.45)}
html.bahi .hero::after{display:none}
html.bahi .lock{background:#8E1B15;color:#F6EEDC}
html.bahi .lock .s{color:rgba(246,238,220,.75)}
/* Bahi hero */
.bh{display:flex;flex-direction:column}
.bh .cover{padding:12px 16px 10px;display:flex;justify-content:space-between;align-items:flex-end;color:#F6EEDC}
.bh .cover .k{font-family:'DM Sans',sans-serif;font-size:10.5px;font-weight:800;letter-spacing:.18em;color:#E0B45A}
.bh .cover .t{font-family:'Tiro Devanagari Hindi',serif;font-size:24px;line-height:1.1}
.bh .cover .d{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;color:#F3D9A0;text-align:right;line-height:1.3}
.bh .page{margin:0 8px;background:#F6EEDC;background-image:repeating-linear-gradient(180deg,transparent 0 35px,rgba(120,80,40,.14) 35px 36px);border-radius:4px 4px 0 0;position:relative;padding:10px 12px 0 30px;color:#1F1A17;box-shadow:inset 0 0 0 1px rgba(120,80,40,.25)}
.bh .page::before{content:"";position:absolute;left:18px;top:0;bottom:0;width:1.5px;background:#B3261E;opacity:.7}
.bh .jama{display:flex;flex-direction:column;gap:0;padding-bottom:6px;border-bottom:2px solid #1F1A17}
.bh .jama .r{display:flex;justify-content:space-between;align-items:baseline;min-height:30px;font-size:17px}
.bh .jama .r.g{color:#1C5A36;font-size:15px}
.bh .jama .r b{font-family:'DM Sans',sans-serif;font-weight:800;font-variant-numeric:tabular-nums}
.bh .hd{display:grid;grid-template-columns:1fr 78px 78px;font-size:11.5px;color:#6E5A44;padding:6px 0 2px;border-bottom:1px solid rgba(120,80,40,.35)}
.bh .hd span:not(:first-child){text-align:right}
.bh .kr{display:grid;grid-template-columns:1fr 78px 78px;align-items:center;min-height:36px;font-size:16px;width:100%;text-align:left;color:#1F1A17;padding:0}
.bh .kr b{font-family:'DM Sans',sans-serif;font-weight:700;font-variant-numeric:tabular-nums;text-align:right}
.bh .kr b.due{color:#B3261E}
.bh .kr b.ok{color:#1C5A36}
.bh .tot{display:grid;grid-template-columns:1fr auto;align-items:center;min-height:46px;font-size:18px;border-top:2px solid #1F1A17;margin-top:2px}
.bh .tot b{font-family:'DM Sans',sans-serif;font-size:26px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.bh .tot b.neg{color:#B3261E}
.bh .inb{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px;color:#6E5A44;min-height:34px;cursor:pointer}
.bh .inb b{color:#1F1A17;font-family:'DM Sans',sans-serif;font-weight:700;font-variant-numeric:tabular-nums}
.bh .stamp{position:absolute;right:10px;top:58px;width:72px;height:72px;border-radius:36px;border:2.5px solid #B8862B;color:#B8862B;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-10deg);opacity:.85;font-family:'DM Sans',sans-serif;font-size:9.5px;font-weight:800;letter-spacing:.1em;text-align:center;line-height:1.3;pointer-events:none}
html.elder.bahi .bh .kr{font-size:19px;min-height:44px}
/* brass stamp ritual */
@keyframes stampin{0%{opacity:0;transform:translate(-50%,-50%) scale(2.2) rotate(-18deg)}70%{opacity:1;transform:translate(-50%,-50%) scale(.95) rotate(-9deg)}100%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(-9deg)}}
.stampwrap{position:fixed;z-index:60;pointer-events:none;left:50%;top:40%;width:170px;height:170px;border-radius:85px;border:5px solid #B8862B;color:#B8862B;background:rgba(246,238,220,.9);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;animation:stampin .7s cubic-bezier(.2,.8,.2,1) both;box-shadow:0 20px 40px rgba(0,0,0,.3)}
.stampwrap .a{font-family:'Tiro Devanagari Hindi',serif;font-size:36px;line-height:1}
.stampwrap .b{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:800;letter-spacing:.14em}
/* skin picker */
.skpick{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.skpick button{border:2px solid var(--line);border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:6px;align-items:stretch;background:var(--card);text-align:left}
.skpick button.on{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-soft)}
.skpick .pv{height:64px;border-radius:6px;position:relative;overflow:hidden}
.skpick .pv i{position:absolute;display:block}
.skpick .pv.p1{background:#F4F5F1}.skpick .pv.p1 i:nth-child(1){left:6px;right:6px;top:6px;height:28px;border-radius:6px;background:#243029}.skpick .pv.p1 i:nth-child(2){left:6px;right:6px;top:40px;height:16px;border-radius:4px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.1)}
.skpick .pv.p2{background:#EDE6D8}.skpick .pv.p2 i:nth-child(1){left:6px;right:6px;top:6px;height:10px;background:#C8102E}.skpick .pv.p2 i:nth-child(2){left:6px;right:6px;top:16px;bottom:6px;background:#FBF7EE}.skpick .pv.p2 i:nth-child(3){left:12px;top:20px;width:18px;height:26px;border-radius:3px;background:#C8102E;opacity:.9}
.skpick .pv.p3{background:#8E1B15}.skpick .pv.p3 i:nth-child(1){left:8px;right:8px;top:14px;bottom:0;background:#F6EEDC;background-image:repeating-linear-gradient(180deg,transparent 0 7px,rgba(120,80,40,.25) 7px 8px)}.skpick .pv.p3 i:nth-child(2){left:16px;top:14px;bottom:0;width:1px;background:#B3261E}.skpick .pv.p3 i:nth-child(3){right:12px;top:24px;width:22px;height:22px;border-radius:11px;border:2px solid #B8862B}
.skpick .nm{font-size:13.5px;font-weight:700;text-align:center}
'''
rep('/* page tear */', css + '/* page tear */')

# settings: replace 2-way with 3-way picker
rep('<div class="lang"><button id="lk-jantri"></button><button id="lk-plain"></button></div></div>',
    '<div class="skpick" id="sk-pick"></div></div>')

# strings
rep("look:'घर स्क्रीन का रूप',lookhint:'जंत्री = दीवार के कैलेंडर जैसा पन्ना। इस फ़ोन पर ही लागू।',lookjantri:'जंत्री',lookplain:'साधारण',",
    "look:'ऐप का रूप',lookhint:'तीन रूप — साधारण · जंत्री (दीवार का कैलेंडर) · बही‑खाता (मुनीम की बही)। इस फ़ोन पर ही लागू; हिसाब वही रहता है।',lookjantri:'जंत्री',lookplain:'साधारण',lookbahi:'बही‑खाता',bhjama:'जमा',bhinc:'आमदनी',bhsav:'पहले बचत',bhcut:'(घटाई)',bhmad:'मद',bhdiya:'दिया',bhbaki:'बाक़ी',bhhand:'हाथ में बचा',bhstamp:'पहले<br>बचत<br>✓',bhclosed:'बंद',")
rep("look:'Home screen look',lookhint:'Jantri = a wall-calendar page. Applies to this phone only.',lookjantri:'Jantri',lookplain:'Plain',",
    "look:'App look',lookhint:'Three looks — Plain · Jantri (wall calendar) · Bahi‑khata (the munim\\'s ledger). This phone only; the numbers stay the same.',lookjantri:'Jantri',lookplain:'Plain',lookbahi:'Bahi‑khata',bhjama:'Credit',bhinc:'Income',bhsav:'Savings first',bhcut:'(set aside)',bhmad:'Item',bhdiya:'Paid',bhbaki:'Pending',bhhand:'In hand',bhstamp:'PAID<br>SELF<br>✓',bhclosed:'CLOSED',")

# skin state: 3 values + picker
old = s[s.index("let skin = 'jantri';"):s.index("function setElder(v){")]
new = '''let skin = 'jantri'; try{ skin = localStorage.getItem('gl-skin') || 'jantri'; }catch(e){} if(!['plain','jantri','bahi'].includes(skin)) skin='jantri';
function applySkin(){ document.documentElement.classList.toggle('jantri', skin==='jantri'); document.documentElement.classList.toggle('bahi', skin==='bahi');
  const pk = document.getElementById('sk-pick'); if(pk){ pk.innerHTML = [['plain','p1',t('lookplain')],['jantri','p2',t('lookjantri')],['bahi','p3',t('lookbahi')]].map(([k,c,n])=>`<button data-sk="${k}" class="${skin===k?'on':''}"><span class="pv ${c}"><i></i><i></i><i></i></span><span class="nm">${n}</span></button>`).join(''); pk.querySelectorAll('[data-sk]').forEach(b=>b.onclick=()=>setSkin(b.dataset.sk)); } }
function setSkin(v){ skin = v; try{ localStorage.setItem('gl-skin', v); }catch(e){} const h = document.getElementById('hero'); if(h) delete h.dataset.built; applySkin(); buzz(6); renderAll(); go('home'); }
applySkin();
'''
s = s.replace(old, new)

# hero branch: add bahi
rep("  if(skin==='jantri'){ renderJantri(hero, {out, left, jl, perDay}); }\n  else {\n  if(hero.dataset.built==='j') hero.dataset.built='';",
    "  if(skin==='jantri'){ renderJantri(hero, {out, left, jl, perDay}); }\n  else if(skin==='bahi'){ renderBahi(hero, {out, left, jl, perDay}); }\n  else {\n  if(hero.dataset.built==='j'||hero.dataset.built==='b') hero.dataset.built='';")

# Bahi renderer + stamp ritual, placed before tearPage
bahi = r'''
/* ---------- Bahi-khata hero (munim's ledger page) ---------- */
function renderBahi(hero, X){
  const {left} = X;
  const babPl0 = plan.emergency.plan + sipTotal() + provTotal(), babDn0 = babDone() + babEntries();
  const fixPl0 = fixedTotal(), fixDn0 = fixedPaidTotal() + fixOther();
  const babTodo = Math.max(0, babPl0 - babDn0), fixTodo = Math.max(0, fixPl0 - fixDn0);
  const free = left - babTodo - fixTodo;
  const recv = inflowTotal(), hand = recv - X.out, toCome0 = Math.max(0, plan.income - recv);
  const dt = new Date(now.getFullYear(), now.getMonth(), TODAY);
  if(hero.dataset.built!=='b'){ hero.innerHTML = `<div class="bh"><div class="cover"><div><div class="k">GHAR KHARCH</div><div class="t" id="bh-t"></div></div><div class="d" id="bh-d"></div></div>
    <div class="page"><div class="jama" id="bh-jama"></div><div class="hd" id="bh-hd"></div><div id="bh-rows"></div><div class="tot" id="bh-tot"></div><div class="inb tap" id="bh-in"></div><div class="stamp" id="bh-stamp"></div></div></div>`; hero.dataset.built='b'; }
  document.getElementById('bh-t').textContent = `${t('ghartitle2')} · ${lang==='hi'?'बही':'Bahi'}`;
  document.getElementById('bh-d').innerHTML = `${MS[lang][now.getMonth()]} ${now.getFullYear()}<br>${t('day')} ${TODAY} / ${DIM}`;
  document.getElementById('bh-jama').innerHTML = `<div style="font-size:12px;color:#6E5A44">${t('bhjama')}</div><div class="r"><span>${t('bhinc')}</span><b>${fmt(plan.income)}</b></div><div class="r g"><span>${t('bhsav')} <small style="color:#6E5A44">${t('bhcut')}</small></span><b>− ${fmt(babPl0)}</b></div>`;
  document.getElementById('bh-hd').innerHTML = `<span>${t('bhmad')}</span><span>${t('bhdiya')}</span><span>${t('bhbaki')}</span>`;
  const row = (k, n, dn, td) => `<button class="kr" data-lane="${k}"><span>${n}</span><b>${fmt(dn)}</b><b class="${td?'due':'ok'}">${td?fmt(td):'✓'}</b></button>`;
  document.getElementById('bh-rows').innerHTML = row('bab', t('laneBab'), babDn0, babTodo) + row('fix', t('laneFix'), fixDn0, fixTodo) + row('var', t('laneVar'), varSpent(), Math.max(0, jarTotal()-varSpent()));
  hero.querySelectorAll('[data-lane]').forEach(b=>b.onclick=()=>{ const tgt = {bab:'#bab-grid', fix:'#fix-list', var:'#jars'}[b.dataset.lane]; const el = document.querySelector(tgt); if(el){ buzz(4); el.closest('.sec').scrollIntoView({behavior:'smooth', block:'start'}); } });
  const tot = document.getElementById('bh-tot'); tot.innerHTML = `<span>${t('bhhand')} <small style="color:#6E5A44;font-size:12px">· ${t('trulyfree')}</small></span><b class="${free<0?'neg':''}" id="bh-free"></b>`; countTo(document.getElementById('bh-free'), free);
  const bi = document.getElementById('bh-in'); bi.innerHTML = `<span>${t('received')} <b>${inr(recv)}</b>${toCome0 ? ` · ${t('tocome')} <b style="color:#B8862B">${inr(toCome0)}</b>` : ''}</span><span>${t('inhand')} <b style="color:${hand<0?'#B3261E':'#1C5A36'}">${inr(hand)}</b> ›</span>`; bi.onclick = inflowSheet;
  const st = document.getElementById('bh-stamp'); const paidSelf = plan.emergency.done && plan.sips.every(x=>x.done); st.style.display = paidSelf ? '' : 'none'; st.innerHTML = t('bhstamp');
}
function stampClose(label){
  return new Promise(res=>{
    if(skin!=='bahi'){ res(); return; }
    const w = document.createElement('div'); w.className='stampwrap';
    const d = new Date(); w.innerHTML = `<div class="a">${t('bhclosed')}</div><div class="b">${String(d.getDate()).padStart(2,'0')} · ${String(d.getMonth()+1).padStart(2,'0')} · ${d.getFullYear()}</div><div class="b" style="font-size:10px;letter-spacing:.04em">${label||''}</div>`;
    document.body.appendChild(w); buzz([20,30,60]); setTimeout(()=>{ w.remove(); res(); }, 1400);
  });
}
'''
rep("function tearPage(){", bahi + "function tearPage(){")
# close ritual: tear (jantri) or stamp (bahi)
rep("await pullBab(); await tearPage(); buzz([10,40,18,40,10]); renderAll();",
    "await pullBab(); await tearPage(); await stampClose(monthName(pk)); buzz([10,40,18,40,10]); renderAll();")

# jantri month label for bahi uses MS[lang]; ensure fmt exists
assert 'function fmt(' in s or 'const fmt' in s
open(p,'w',encoding='utf-8').write(s)
m=re.findall(r'<script>(.*?)</script>',s,re.S); open('/tmp/claude-0/-home-claude/b3b786fe-2630-570a-811c-7efa4e555f1c/scratchpad/site/chk.js','w').write(max(m,key=len))
print('ok')
