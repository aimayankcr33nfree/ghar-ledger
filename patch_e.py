import re
p='/tmp/claude-0/-home-claude/b3b786fe-2630-570a-811c-7efa4e555f1c/scratchpad/site/index.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)>=1, 'MISSING: '+old[:110]
    s=s.replace(old,new,cnt)

# ---------- helpers ----------
rep("const babDone = () => (plan.emergency.done?plan.emergency.plan:0) + sipTicked(plan) + provPaid(plan);",
    "const babDone = () => (plan.emergency.done?plan.emergency.plan:0) + sipTicked(plan) + provPaid(plan);\n"
    "const envName = x => x ? (x.name ? (lang==='hi' ? (x.hi||x.name) : x.name) : t(x.key)) : '';\n"
    "const envByKey = (key, P) => ((P||plan).provisions||[]).find(x=>x.key===key);\n"
    "const envTotal = () => provTotal();\n"
    "const envEntries = () => entries.filter(e=>e.cat==='bab' && provKeyOf(e.catId, plan)).reduce((a,e)=>a+e.amt,0);\n"
    "const invEntries = () => entries.filter(e=>e.cat==='bab' && !provKeyOf(e.catId, plan)).reduce((a,e)=>a+e.amt,0);\n"
    "const envDone = () => provPaid(plan) + envEntries();\n"
    "const invPlan = () => plan.emergency.plan + sipTotal();\n"
    "const invDone = () => (plan.emergency.done?plan.emergency.plan:0) + sipTicked(plan) + invEntries();\n"
    "let pastSaved = {}; const totalSaved = () => (corpus.savedBase||0) + Object.values(pastSaved).reduce((a,b)=>a+(b||0),0);")
# pastMonths: remember reported savings
rep("pastMonths[x.id] = {bab, closed:!!x.data.closed, sweep:(x.data.closed||{}).sweep||0};",
    "pastMonths[x.id] = {bab, closed:!!x.data.closed, sweep:(x.data.closed||{}).sweep||0, saved:(x.data.saved!=null ? x.data.saved : (x.data.closed||{}).saved)}; if(pastMonths[x.id].saved!=null) pastSaved[x.id] = +pastMonths[x.id].saved||0;")
rep("try{ const m = await sb.from('months').select('id,data'); pastMonths = {};", "try{ const m = await sb.from('months').select('id,data'); pastMonths = {}; pastSaved = {};")

# ---------- heroes: investment only in बचत lane; envelopes get their own line ----------
for _ in range(3):
    rep("  const babPl0 = plan.emergency.plan + sipTotal() + provTotal(), babDn0 = babDone() + babEntries();",
        "  const babPl0 = invPlan(), babDn0 = invDone(); const envPl0 = envTotal(), envDn0 = envDone(), envTodo = Math.max(0, envPl0 - envDn0);")
# plain hero free
rep("  const babTodo = Math.max(0, babPl0 - babDn0), fixTodo = Math.max(0, fixPl0 - fixDn0), upT = upThisMonth();\n  const free = left - babTodo - fixTodo - upT;\n  document.getElementById('he-l').textContent = t('trulyfree');",
    "  const babTodo = Math.max(0, babPl0 - babDn0), fixTodo = Math.max(0, fixPl0 - fixDn0), upT = upThisMonth();\n  const free = left - babTodo - fixTodo - upT - envTodo;\n  document.getElementById('he-l').textContent = t('trulyfree');")
rep("  if(upT>0) lanes.push(['up', t('upshort'), upT, 0, '', upT, t('topay'), 's4']);",
    "  if(envPl0>0) lanes.splice(1, 0, ['env', t('envshort'), envPl0, envDn0, t('done'), envTodo, t('notdone'), 's4']);\n  if(upT>0) lanes.push(['up', t('upshort'), upT, 0, '', upT, t('topay'), 's4']);")
rep("const tgt = {bab:'#bab-grid', fix:'#fix-list', var:'#jars', up:'#up-card', late:'#fix-list'}[b.dataset.lane];", "const tgt = {bab:'#bab-grid', fix:'#fix-list', var:'#jars', up:'#up-card', late:'#fix-list', env:'#env-grid'}[b.dataset.lane];", 3)
# jantri
rep("  const babTodo = Math.max(0, babPl0 - babDn0), fixTodo = Math.max(0, fixPl0 - fixDn0), upT = upThisMonth();\n  const free = left - babTodo - fixTodo - upT;\n  const recv = inflowTotal(), hand = recv - X.out, toCome0 = Math.max(0, plan.income - recv);\n  const dt = new Date(now.getFullYear(), now.getMonth(), TODAY);\n  const mon",
    "  const babTodo = Math.max(0, babPl0 - babDn0), fixTodo = Math.max(0, fixPl0 - fixDn0), upT = upThisMonth();\n  const free = left - babTodo - fixTodo - upT - envTodo;\n  const recv = inflowTotal(), hand = recv - X.out, toCome0 = Math.max(0, plan.income - recv);\n  const dt = new Date(now.getFullYear(), now.getMonth(), TODAY);\n  const mon")
rep("    strip('s1', t('laneBab'), babPl0, babDn0, babTodo, t('done'), t('notdone')) +\n    strip('s2',", "    strip('s1', t('laneBab'), babPl0, babDn0, babTodo, t('done'), t('notdone')) +\n    (envPl0>0 ? strip('s4', t('envshort'), envPl0, envDn0, envTodo, t('done'), t('notdone')) : '') +\n    strip('s2',")
rep(".jh .js.s4 .n{color:#B9841A}", ".jh .js.s4 i{background:#7A5C2E}")
# bahi
rep("  const babTodo = Math.max(0, babPl0 - babDn0), fixTodo = Math.max(0, fixPl0 - fixDn0), upT = upThisMonth();\n  const free = left - babTodo - fixTodo - upT;\n  const recv = inflowTotal(), hand = recv - X.out, toCome0 = Math.max(0, plan.income - recv);\n  const dt = new Date(now.getFullYear(), now.getMonth(), TODAY);\n  if(hero.dataset.built!=='b')",
    "  const babTodo = Math.max(0, babPl0 - babDn0), fixTodo = Math.max(0, fixPl0 - fixDn0), upT = upThisMonth();\n  const free = left - babTodo - fixTodo - upT - envTodo;\n  const recv = inflowTotal(), hand = recv - X.out, toCome0 = Math.max(0, plan.income - recv);\n  const dt = new Date(now.getFullYear(), now.getMonth(), TODAY);\n  if(hero.dataset.built!=='b')")
rep("document.getElementById('bh-rows').innerHTML = row('bab', t('laneBab'), babDn0, babTodo) + row('fix',", "document.getElementById('bh-rows').innerHTML = row('bab', t('laneBab'), babDn0, babTodo) + (envPl0>0 ? row('env', t('envshort'), envDn0, envTodo) : '') + row('fix',")
rep("<div class=\"r g\"><span>${t('bhsav')} <small style=\"color:#6E5A44\">${t('bhcut')}</small></span><b>− ${fmt(babPl0)}</b></div>", "<div class=\"r g\"><span>${t('bhsav')} <small style=\"color:#6E5A44\">${t('bhcut')}</small></span><b>− ${fmt(babPl0 + envPl0)}</b></div>")
# section totals
rep("  const babPl = plan.emergency.plan + sipTotal() + provTotal(), babDn = babDone() + babEntries();", "  const babPl = invPlan(), babDn = invDone();")

# ---------- calc ----------
rep("  const prov = P.provisions.reduce((a,p)=>a+p.plan,0);\n  const sips = P.sips.reduce((a,s)=>a+s.plan,0);\n  const babPlan = P.emergency.plan + sips + prov;\n  const babTick = (P.emergency.done?P.emergency.plan:0) + sipTicked(P) + provPaid(P);\n  const babActual = babTick + sum(E.filter(e=>e.cat==='bab'));",
    "  const prov = P.provisions.reduce((a,p)=>a+p.plan,0);\n  const sips = P.sips.reduce((a,s)=>a+s.plan,0);\n  const babPlan = P.emergency.plan + sips;\n  const babTick = (P.emergency.done?P.emergency.plan:0) + sipTicked(P);\n  const babActual = babTick + sum(E.filter(e=>e.cat==='bab' && !provKeyOf(e.catId, P)));\n  const envPlan = prov, envActual = provPaid(P) + sum(E.filter(e=>e.cat==='bab' && provKeyOf(e.catId, P)));")
rep("  const totalPlan = babPlan + fixPlan + jars.reduce((a,j)=>a+j.plan,0);\n  const out = babActual + fixActual + jars.reduce((a,j)=>a+j.actual,0);",
    "  const totalPlan = babPlan + envPlan + fixPlan + jars.reduce((a,j)=>a+j.plan,0);\n  const out = babActual + envActual + fixActual + jars.reduce((a,j)=>a+j.actual,0);")
rep("  return {income:P.income, babPlan, babActual, fixPlan, fixActual, jars, fixItems, otherFix, totalPlan, out, received, potsUsed};",
    "  return {income:P.income, babPlan, babActual, envPlan, envActual, fixPlan, fixActual, jars, fixItems, otherFix, totalPlan, out, received, potsUsed};")
# score: envelopes not part of 'paid yourself first'
rep(".concat(P.provisions.map(x=>x.plan>0 ? ((x.done||P.provDone)?1:0) : null)).filter(x=>x!==null);", ".filter(x=>x!==null);")

# ---------- month card: envelope row + reported saving ----------
rep("    ${row(t('laneFix'), C.fixActual, C.fixPlan, pend(Math.max(0, C.fixPlan - C.fixActual)), 's2')}",
    "    ${C.envPlan>0 ? row(t('envshort'), C.envActual, C.envPlan, pend(Math.max(0, C.envPlan - C.envActual)), 's4') : ''}\n    ${row(t('laneFix'), C.fixActual, C.fixPlan, pend(Math.max(0, C.fixPlan - C.fixActual)), 's2')}")
rep("  const jarsLeft = closed ? (closed.sweep||0) : Math.max(0, jarPlan - jarUsed);\n  const saved = C.babActual + jarsLeft; const pct = C.income>0 ? Math.round(saved/C.income*100) : 0;",
    "  const told = D.live ? null : (pastSaved[D.key]!=null ? pastSaved[D.key] : (closed && closed.saved!=null ? +closed.saved : null));\n  const jarsLeft = told!=null ? told : Math.max(0, jarPlan - jarUsed);\n  const saved = C.babActual + jarsLeft; const pct = C.income>0 ? Math.round(saved/C.income*100) : 0;")
rep("<div class=\"msv-r\"><span>${closed ? t('jarsleft')+' → '+t('emer') : t('jarsleft')+(D.live?' ('+t('ifkept')+')':'')}</span><b>${inr(jarsLeft)}</b></div>",
    "<div class=\"msv-r\"><span>${told!=null ? t('monthsaving')+' ('+t('youtold')+')' : t('jarsleft')+(D.live?' ('+t('ifkept')+')':'')}</span><b>${inr(jarsLeft)}</b></div>${C.envActual ? `<div class=\"msv-r\" style=\"opacity:.8\"><span>${t('envsec')} · ${t('deposit')}</span><b>${inr(C.envActual)}</b></div>` : ''}")
rep(".mcard .mb i.s1{background:var(--green)}.mcard .mb i.s2{background:var(--orange)}.mcard .mb i.s3{background:var(--blue)}", ".mcard .mb i.s1{background:var(--green)}.mcard .mb i.s2{background:var(--orange)}.mcard .mb i.s3{background:var(--blue)}.mcard .mb i.s4{background:#7A5C2E}")

# ---------- section 1: third card = last month's saving (reported) ----------
rep('''    <div class="bab2" id="bab-grid"></div>
    <div class="card pcard" id="prov-card"></div>
  </div>
''', '''    <div class="bab2" id="bab-grid"></div>
  </div>

  <div class="sec" id="env-sec">
    <div class="sec-h"><div class="t" data-i="envsec"></div><div class="tt num" id="tt-env"></div><button class="a" id="env-add"></button></div>
    <div class="prog" id="pg-env"></div>
    <div class="envs" id="env-grid"></div>
    <div class="hint" id="env-hint" style="text-align:left;padding:0 2px"></div>
  </div>
''')
rep("    <button class=\"card bcard ${sipOn?'on':''}\" id=\"b-sip\">", "    ${savedCardHtml()}\n    <button class=\"card bcard ${sipOn?'on':''}\" id=\"b-sip\">")
old_prov = s[s.index("  document.getElementById('prov-card').innerHTML"):s.index("  // emergency ring")]
new_prov = r'''  renderEnvelopes();
'''
s = s.replace(old_prov, new_prov)
rep("  document.getElementById('b-emer').onclick = ()=>toggleEmer();", "  document.getElementById('b-emer').onclick = ()=>toggleEmer();\n  const bsv = document.getElementById('b-saved'); if(bsv) bsv.onclick = reportSaved;")
rep(".bab2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}", ".bab2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}\n.bab2 .bcard.wide{grid-column:1/-1}\n.bcard.saved .big.q{color:var(--muted)}\n.envs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}\n.ecard{padding:12px 12px 10px;display:flex;flex-direction:column;gap:6px;text-align:left;width:100%;position:relative;border:1.5px solid transparent}\n.ecard.on{border-color:var(--green-tint);background:linear-gradient(180deg,var(--green-soft),var(--card) 70%)}\n.ecard .eh{display:flex;align-items:center;gap:8px}\n.ecard .eh .ic{width:30px;height:30px;border-radius:9px;background:var(--soft);display:flex;align-items:center;justify-content:center;font-size:16px;flex:none}\n.ecard .eh b{font-size:14.5px;line-height:1.2;flex:1;min-width:0}\n.ecard .bal{font-size:20px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}\n.ecard .bal small{display:block;font-size:11px;color:var(--muted);font-weight:600}\n.ecard .ln{font-size:11.5px;color:var(--muted);line-height:1.35}\n.ecard .mo{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;margin-top:2px}\n.ecard .mo .box{width:22px;height:22px;border-radius:7px}\n.ecard .tg{height:5px;border-radius:3px;background:var(--soft2);overflow:hidden}\n.ecard .tg i{display:block;height:100%;background:#7A5C2E;border-radius:3px}\n.ecard .tgl{font-size:11px;color:var(--muted)}\nhtml.elder .ecard .bal{font-size:24px}\n.ecard .box{display:flex;align-items:center;justify-content:center;border:1.5px solid var(--line);background:var(--card);color:transparent}\n.ecard .box.on{background:var(--green);border-color:var(--green);color:#fff}")

# functions: savedCardHtml, reportSaved, renderEnvelopes, addEnvelope, envSheet
rep("async function toggleProv(i){", r'''function savedCardHtml(){
  const pk = prevMonthKey(); const v = pastSaved[pk];
  return `<button class="card bcard saved wide" id="b-saved"><div class="lbl">${t('lastsaved')} · ${monthName(pk)}</div><div class="big ${v==null?'q':''}">${v==null ? '?' : inr(v)}</div><div class="st">${v==null ? `<span style="color:var(--blue)">${t('tellsaved')} →</span>` : `<div class="box on">${CHECK}</div>${t('youtold')} · ${t('change')}`}</div><div class="tot"><span>${t('totalsaved')}</span><b>${inr(totalSaved())}</b></div></button>`;
}
async function reportSaved(){
  const pk = prevMonthKey(); const cur = pastSaved[pk];
  if(!viewCache[pk] && sb){ await loadMonth(pk); }
  const c = viewCache[pk]; let hint = '';
  if(c && !c.loading){ const C = calc(c); const jl = C.jars.reduce((a,j)=>a+Math.max(0, j.plan-j.actual),0); hint = t('savedsub').replace('{x}', inr(jl)).replace('{y}', inr(C.income - C.out)); }
  const v = await ask({title:t('savedq').replace('{m}', monthName(pk)), sub:hint, input:{value: cur!=null ? cur : '', placeholder:'0'}, okText:t('save')});
  if(v===null || v===undefined || v===true) return;
  pastSaved[pk] = v; if(pastMonths[pk]) pastMonths[pk].saved = v;
  if(sb){ try{ const r = await sb.from('months').select('data').eq('id', pk).maybeSingle(); const data = Object.assign({}, (r.data&&r.data.data)||(c&&c.raw)||{plan:c?c.plan:plan, paid:c?c.paid:{}, inflows:c?c.inflows:[]}, {saved:v}); await sb.from('months').upsert({id:pk, data, updated_at:new Date().toISOString()}); delete viewCache[pk]; }catch(e){ toast('⚠ ' + (e.message||'')); } }
  else { try{ localStorage.setItem('gl-saved-'+pk, String(v)); }catch(e){} }
  buzz([10,40,18]); renderAll(); toast(`✓ ${monthName(pk)} · ${inr(v)}`);
}
function envIcon(x){ const k = (x.key||'')+' '+(x.name||'')+' '+(x.hi||''); if(/admission|एडमिशन|fee|फ़ीस|school/i.test(k)) return '🎓'; if(/fest|त्योहार|gift|उपहार|diwali/i.test(k)) return '🪔'; if(/repair|मरम्मत|maint/i.test(k)) return '🔧'; if(/wedding|शादी/i.test(k)) return '💍'; if(/travel|यात्रा|trip|ticket/i.test(k)) return '🧳'; if(/car|गाड़ी|bike/i.test(k)) return '🛵'; if(/cloth|कपड़/i.test(k)) return '👗'; return '✉️'; }
function renderEnvelopes(){
  const grid = document.getElementById('env-grid'); if(!grid) return;
  const L = plan.provisions || [];
  document.getElementById('env-add').textContent = t('envnew'); document.getElementById('env-add').onclick = addEnvelope;
  document.getElementById('env-hint').textContent = L.length ? t('envhint') : t('envempty');
  const pl = envTotal(), dn = envDone();
  countTo(document.getElementById('tt-env'), pl);
  document.getElementById('pg-env').innerHTML = pl ? `<div class="tr"><b data-k="pg-env" data-w="${dn/pl*100}"></b></div><span class="x">${t('done')} ${inr(dn)} · ${t('notdone')} ${inr(Math.max(0,pl-dn))}</span>` : '';
  grid.innerHTML = L.map((x,i)=>{ const on = x.done||plan.provDone; const bal = potBalance(plan, entries, x.key); const prev = potPrev(plan, entries, x.key); const used = potUsed(entries, x.key);
    const logged = entries.filter(e=>e.cat==='bab' && provKeyOf(e.catId, plan)===x.key).reduce((a,e)=>a+e.amt,0); const inM = (on ? x.plan : 0) + logged;
    let tgt = ''; if(x.target>0){ const pc = Math.min(100, bal/x.target*100); const need = Math.max(0, x.target - bal); let when = ''; if(x.by){ const [by,bm] = x.by.split('-').map(Number); const months = (by - now.getFullYear())*12 + (bm - (now.getMonth()+1)); const perM = x.plan>0 ? Math.ceil(need / x.plan) : 0; when = months>0 ? (need<=0 ? ` · ${t('ready')} ✓` : (perM<=months ? ` · ${t('ontrack')}` : ` · ${inr(Math.ceil(need/months))}/${t('month')} ${t('needed')}`)) : ''; }
      tgt = `<div class="tg"><i style="width:${pc}%"></i></div><div class="tgl">${t('envtarget')} ${inr(x.target)}${x.by ? ' · ' + monthName(x.by) : ''}${when}</div>`; }
    return `<div class="card ecard ${on?'on':''}"><button class="eh" data-env="${i}" style="text-align:left"><span class="ic">${envIcon(x)}</span><b>${envName(x)}</b></button>
      <button data-env="${i}" style="text-align:left"><div class="bal">${inr(bal)}<small>${t('envnow')}</small></div><div class="ln">${t('potprev')} ${inr(prev)}${inM?` + ${inr(inM)}`:''}${used?` − ${inr(used)}`:''}</div>${tgt}</button>
      <button class="mo" data-envtick="${i}"><div class="box ${on?'on':''} ${lastPop==='prov'+i?'pop':''}">${CHECK}</div><span>${t('envmonthly')} ${inr(x.plan)}</span><span style="flex:1"></span><span style="font-size:12px;color:${on?'var(--green)':'var(--muted)'}">${on?t('done'):t('notdone')}</span></button></div>`; }).join('');
  grid.querySelectorAll('[data-envtick]').forEach(b=>b.onclick=()=>toggleProv(+b.dataset.envtick));
  grid.querySelectorAll('[data-env]').forEach(b=>b.onclick=()=>envSheet(+b.dataset.env));
}
async function envSheet(i){
  const x = plan.provisions[i]; if(!x) return;
  const v = await ask({title:`${envIcon(x)} ${envName(x)}`, sub:`${t('envnow')} ${inr(potBalance(plan, entries, x.key))} · ${t('envmonthly')} ${inr(x.plan)}`, buttons:[
    {text:t('envledger'), value:'led'}, {text:t('envtake'), value:'take'}, {text:t('envedit'), value:'edit'}, {text:t('remove'), value:'del', cls:'danger'} ]});
  if(!v) return;
  if(v==='led'){ potLedger(x.key, envName(x)); return; }
  if(v==='take'){ resetLog(); go('log'); const it = itemList().find(q=>q.key==='pw:'+x.key); if(it){ sel='fix'; item=it; renderLog(); } return; }
  if(v==='edit'){ const r = await ask({title:t('envedit'), fields:[
      {key:'name', type:'text', label:t('name'), value:envName(x), req:true},
      {key:'plan', type:'num', label:t('envmonthly')+' (₹)', value:x.plan, placeholder:'0', req:true},
      {key:'target', type:'num', label:t('envtarget')+' (₹, '+t('optional')+')', value:x.target||'', placeholder:'0', req:false},
      {key:'by', type:'text', label:t('envby')+' (YYYY-MM, '+t('optional')+')', value:x.by||'', placeholder:'2027-03', req:false} ], okText:t('save')});
    if(r && typeof r==='object'){ if(r.name){ if(lang==='hi') x.hi = r.name; x.name = x.name || r.name; if(lang!=='hi') x.name = r.name; } if(r.plan>0) x.plan = r.plan; x.target = r.target>0 ? r.target : 0; x.by = /^\d{4}-\d{2}$/.test(r.by||'') ? r.by : ''; saveCfg(); renderAll(); } return; }
  if(v==='del'){ const ok = await ask({title:`${t('remove')} · ${envName(x)}?`, sub:t('envdelsub'), okText:t('remove'), danger:true}); if(!ok) return; plan.provisions.splice(i,1); saveCfg(); renderAll(); toast(t('deleted')); }
}
async function addEnvelope(){
  const r = await ask({title:t('envnew'), sub:t('envhint'), fields:[
    {key:'name', type:'text', label:t('name'), value:'', placeholder:t('envnamehint'), req:true},
    {key:'plan', type:'num', label:t('envmonthly')+' (₹)', value:'', placeholder:'0', req:true},
    {key:'target', type:'num', label:t('envtarget')+' (₹, '+t('optional')+')', value:'', placeholder:'0', req:false},
    {key:'by', type:'text', label:t('envby')+' (YYYY-MM, '+t('optional')+')', value:'', placeholder:'2027-03', req:false} ], okText:t('save')});
  if(!r || typeof r!=='object' || !r.name) return;
  const key = 'env' + Date.now().toString(36);
  plan.provisions.push({key, name:r.name, hi:r.name, plan:r.plan||0, done:false, target:r.target>0?r.target:0, by:/^\d{4}-\d{2}$/.test(r.by||'')?r.by:''});
  saveCfg(); renderAll(); buzz([10,30,10]); toast(`✓ ${r.name}`);
}
async function toggleProv(i){''')

# ---------- naming: t(x.key) → envName ----------
rep("if(x.done){ const ok = await ask({title:`${t('untickq')} · ${t(x.key)}`", "if(x.done){ const ok = await ask({title:`${t('untickq')} · ${envName(x)}`")
rep("plan.provisions.forEach((x,i)=>L.push({key:'prov'+i, cat:'bab', grp:gb, label:t(x.key), amt:x.plan}));", "plan.provisions.forEach((x,i)=>L.push({key:'prov'+i, cat:'bab', grp:gb, label:envName(x), amt:x.plan}));")
rep("plan.provisions.forEach(x=>L.push({key:'pw:'+x.key, cat:'prov', grp:t('potwithdraw'), label:`${t(x.key)} (${t('pot')} ${inr(potBalanc", "plan.provisions.forEach(x=>L.push({key:'pw:'+x.key, cat:'prov', grp:t('potwithdraw'), label:`${envName(x)} (${t('pot')} ${inr(potBalanc")
rep("P.provisions.forEach(x=>{ if(x.done||P.provDone) rows.push({day:1,cat:'bab',name:t('prov')+' · '+t(x.key),amt:x.plan}); });", "P.provisions.forEach(x=>{ if(x.done||P.provDone) rows.push({day:1,cat:'bab',name:t('prov')+' · '+envName(x),amt:x.plan}); });")
rep("if(e.cat==='prov'){ const base = (e.catId===FEST_KEY && P.festival && P.festival.name) ? '🎉 ' + P.festival.name : t(e.catId) + ' · ' + t('potwithdraw');",
    "if(e.cat==='prov'){ const base = (e.catId===FEST_KEY && P.festival && P.festival.name) ? '🎉 ' + P.festival.name : (envName(envByKey(e.catId, P)) || t(e.catId)) + ' · ' + t('potwithdraw');")
rep("await ask({title: title || t(key), sub:`${t('festlog')}", "await ask({title: title || envName(envByKey(key)) || t(key), sub:`${t('festlog')}")
# settings labels
s = s.replace("plan.provisions.map((p,i)=>fld(t(p.key),'in-prov'+i,p.plan)).join('')", "plan.provisions.map((p,i)=>fld(envName(p),'in-prov'+i,p.plan)).join('')")
s = s.replace("plan.provisions.map((p,i)=>fld(`${t(p.key)} · ${t('potcarry')}`,'in-carry'+i,(plan.provCarry||{})[p.key]||0)).join('')", "plan.provisions.map((p,i)=>fld(`${envName(p)} · ${t('potcarry')}`,'in-carry'+i,(plan.provCarry||{})[p.key]||0)).join('')")
# export + report labels
s = s.replace("Item:t('prov')+' · '+t(x.key)", "Item:t('prov')+' · '+envName(x)")
s = s.replace("plan.provisions.forEach(x=>Plan.push({Section:t('prov'), Item:t(x.key), Plan:x.plan, Pot:potBalance(plan, entries, x.key)}));", "plan.provisions.forEach(x=>Plan.push({Section:t('prov'), Item:envName(x), Plan:x.plan, Pot:potBalance(plan, entries, x.key)}));")

# ---------- month close: ask the saving instead of sweeping into emergency ----------
rep("    <div class=\"li\"><span>${t('jarsleft')}</span><b style=\"color:var(--blue)\">${inr(sweep)} → ${t('emer')}</b></div>\n    <div class=\"li\"><span>${t('potscarry')}</span><b>${inr(carryTot)}</b></div>",
    "    <div class=\"li\"><span>${t('jarsleft')}</span><b style=\"color:var(--blue)\">${inr(sweep)}</b></div>\n    <div class=\"li\"><span>${t('potscarry')}</span><b>${inr(carryTot)}</b></div>")
rep("    const ok = await ask({title:`${monthName(pk)} ${t('closeq')}`, sub:`${t('jarsleft')} ${inr(sweep)} → ${t('emer')} · ${t('potscarry')} ${inr(carryTot)}`, okText:t('closenow')}); if(!ok) return;\n    corpus.emergencyBase = (corpus.emergencyBase||0) + sweep;\n    plan.pendingClose = null;\n    const closed = {at:new Date().toISOString(), sweep, carry, out:C.out, left:C.income-C.out, received:C.received};\n    try{ await sb.from('months').upsert({id:pk, data:Object.assign({}, c.raw||{plan:P, paid:c.paid, inflows:c.inflows, corpus}, {closed}), updated_at:new Date().toISOString()}); }catch(e){}",
    "    const sv = await ask({title:t('savedq').replace('{m}', monthName(pk)), sub:t('savedsub').replace('{x}', inr(sweep)).replace('{y}', inr(C.income - C.out)), input:{value:sweep, placeholder:'0'}, okText:t('closenow')}); if(sv===null || sv===undefined) return; const savedAmt = (sv===true) ? sweep : sv;\n    plan.pendingClose = null;\n    const closed = {at:new Date().toISOString(), sweep:0, saved:savedAmt, carry, out:C.out, left:C.income-C.out, received:C.received};\n    pastSaved[pk] = savedAmt;\n    try{ await sb.from('months').upsert({id:pk, data:Object.assign({}, c.raw||{plan:P, paid:c.paid, inflows:c.inflows, corpus}, {closed, saved:savedAmt}), updated_at:new Date().toISOString()}); }catch(e){}")
rep("renderAll(); toast(`✓ ${monthName(pk)} ${t('closedok')} · +${inr(sweep)}`);", "renderAll(); toast(`✓ ${monthName(pk)} ${t('closedok')} · ${t('monthsaving')} ${inr(savedAmt)}`);")

# ---------- strings ----------
rep("munim:'मुनीम ने लिखा — ठीक है?',", "munim:'मुनीम ने लिखा — ठीक है?',envsec:'कल की तैयारी',envshort:'तैयारी',env:'लिफ़ाफ़ा',envnew:'+ नया लिफ़ाफ़ा',envmonthly:'हर महीने',envnow:'अभी जमा',envput:'लिफ़ाफ़े में डालो',envtake:'लिफ़ाफ़े से निकालो',envledger:'लिफ़ाफ़े का हिसाब',envedit:'लिफ़ाफ़ा बदलें',envdelsub:'लिफ़ाफ़ा हटेगा, पुरानी एंट्री बही में रहेंगी।',envhint:'जो खर्च आना तय है — एडमिशन, त्योहार, शादी, मरम्मत — उसके लिए हर महीने थोड़ा अलग रख दो। बचा हुआ अपने आप अगले महीने चलता है।',envempty:'अभी कोई लिफ़ाफ़ा नहीं — \"+ नया लिफ़ाफ़ा\" दबाएँ',envnamehint:'जैसे: एडमिशन, त्योहार, शादी',envtarget:'लक्ष्य',envby:'कब तक',optional:'वैकल्पिक',ready:'तैयार',ontrack:'सही चल रहा',needed:'चाहिए',month:'महीना',lastsaved:'पिछले महीने की बचत',tellsaved:'कितनी बचत हुई? बताएँ',youtold:'आपने बताया',totalsaved:'अब तक कुल बचत',savedq:'{m} में सच में कितनी बचत हुई?',savedsub:'ऐप के हिसाब से घड़ों में {x} बचा, हाथ में {y} — जो सच में बचा हो वही लिखें',monthsaving:'महीने की बचत',deposit:'जमा',")
rep("munim:'Munim wrote this — OK?',", "munim:'Munim wrote this — OK?',envsec:'Ready for tomorrow',envshort:'Envelopes',env:'Envelope',envnew:'+ New envelope',envmonthly:'Every month',envnow:'In it now',envput:'Put in envelope',envtake:'Take from envelope',envledger:'Envelope ledger',envedit:'Edit envelope',envdelsub:'The envelope goes; its old entries stay in the Book.',envhint:'Spends you know will come — admission, festivals, a wedding, repairs — set a little aside every month. The unspent part rolls into next month on its own.',envempty:'No envelopes yet — tap \"+ New envelope\"',envnamehint:'e.g. admission, festival, wedding',envtarget:'Target',envby:'By when',optional:'optional',ready:'ready',ontrack:'on track',needed:'needed',month:'month',lastsaved:'Last month\\'s saving',tellsaved:'How much did you save? Tell us',youtold:'you told us',totalsaved:'Total saved so far',savedq:'How much did you really save in {m}?',savedsub:'By the app, {x} was left in jars and {y} in hand — enter what you actually saved',monthsaving:'month\\'s saving',deposit:'deposit',")
# rename pot/provision vocabulary
s = s.replace("prov:'प्रावधान'", "prov:'कल की तैयारी'").replace("prov:'Provisions'", "prov:'Ready for tomorrow'")
s = s.replace("pot:'पॉट',pothint:", "pot:'लिफ़ाफ़ा',pothint:").replace("pot:'Pot',pothint:", "pot:'Envelope',pothint:")
s = s.replace("potwithdraw:'पॉट से निकासी'", "potwithdraw:'लिफ़ाफ़े से निकालो'").replace("potwithdraw:'Withdraw from pot'", "potwithdraw:'Take from envelope'")
s = s.replace("potscarry:'पॉट आगे'", "potscarry:'लिफ़ाफ़े आगे'").replace("potscarry:'Pots carried'", "potscarry:'Envelopes carried'")
s = s.replace("potcarry:'पॉट में पहले से (ऐप से पहले का)'", "potcarry:'लिफ़ाफ़े में पहले से (ऐप से पहले का)'").replace("potcarry:'Opening balance (before the app)'", "potcarry:'Opening balance (before the app)'")
s = s.replace("closehint:'बचा हुआ रोज़ का पैसा इमरजेंसी फ़ंड में जाएगा, प्रावधान के पॉट अगले महीने चलेंगे, और पिछले महीने की समीक्षा सुरक्षित रहेगी।'", "closehint:'महीने की सच्ची बचत आप बताएँगे — वही \"पिछले महीने की बचत\" में जुड़ेगी। लिफ़ाफ़े अगले महीने चलेंगे, समीक्षा सुरक्षित रहेगी।'")
s = s.replace("closehint:'Unspent daily money goes to the emergency fund, provision pots roll into next month, and last month\\'s review is saved.'", "closehint:'You tell us the month\\'s real saving — it goes into \"Last month\\'s saving\". Envelopes roll into next month; the review is kept.'")
s = s.replace("pothint:'पॉट = पहले से बचा + इस महीने जमा − निकाला। पिछले महीने का बचा अपने आप आगे आता है। निकासी: + लिखें → तय/अन्य → \"पॉट से निकासी\"'", "pothint:'लिफ़ाफ़ा = पहले से + इस महीने − निकाला।'")
rep("const BUILD = '12.10.1230';", "const BUILD = '12.10.1330';")
open(p,'w',encoding='utf-8').write(s)
m=re.findall(r'<script>(.*?)</script>',s,re.S); open('/tmp/claude-0/-home-claude/b3b786fe-2630-570a-811c-7efa4e555f1c/scratchpad/site/chk.js','w').write(max(m,key=len)); print('ok')
