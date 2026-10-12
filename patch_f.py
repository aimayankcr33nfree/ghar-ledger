import re
p='/tmp/claude-0/-home-claude/b3b786fe-2630-570a-811c-7efa4e555f1c/scratchpad/site/index.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,cnt=1):
    global s
    n = s.count(old)
    assert n>=1, 'MISSING: '+old[:110]
    if cnt==1: assert n==1, 'DUP(%d): '%n+old[:110]
    s=s.replace(old,new,cnt if cnt>0 else n)

# ---------- 6. milk counted once: helper-linked items take their amount from the calendar ----------
rep("const fixedTotal = () => plan.fixed.reduce((a,f)=>a+(f.amt||0),0);",
    "const planAmt = f => { const h = (plan.helpers||[]).find(x=>x.fixedId===f.id); if(h){ const c = helperCalc(h); return h.mode==='daily' ? c.full : (hAmt(h) - (c.cut||0)); } return f.amt||0; };\nconst fixedTotal = () => plan.fixed.reduce((a,f)=>a+planAmt(f),0);")
rep("const gPlan = g => plan.fixed.filter(f=>grpOf(f)===g && !helperIds.has(f.id)).reduce((a,f)=>a + (f.amt||0), 0);",
    "const gPlan = g => plan.fixed.filter(f=>grpOf(f)===g && !helperIds.has(f.id)).reduce((a,f)=>a + planAmt(f), 0);")
# calc() for the live month uses the same amounts
rep("  const fixPlan = P.fixed.reduce((a,f)=>a+(f.amt||0),0);", "  const fixPlan = P.fixed.reduce((a,f)=>a+(P===plan ? planAmt(f) : (f.amt||0)),0);")
# refresh home when the helper sheet closes
rep("  await ask({title:`${h.ic||''} ${nm(h)}`, sub:`${MONTHS[lang][now.getMonth()]} · ${helperLine(h, helperCalc(h))}`, html: view(), cancelText:t('closeb'), onOpen: body => {",
    "  await ask({title:`${h.ic||''} ${nm(h)}`, sub:`${MONTHS[lang][now.getMonth()]} · ${helperLine(h, helperCalc(h))}`, html: view(), cancelText:t('closeb'), onOpen: body => {")
s = s.replace("        setDays(days, +b.dataset.q); paint(); });\n    };\n    wire();\n  }});\n}",
              "        setDays(days, +b.dataset.q); paint(); });\n    };\n    wire();\n  }});\n  renderAll();\n}", 1)

# ---------- 1. one free number, per-day derived from it ----------
rep("const outSoFar = () => babDone() + fixedPaidTotal() + fixOther() + varSpent() + babEntries();",
    "const outSoFar = () => babDone() + fixedPaidTotal() + fixOther() + varSpent() + babEntries();\n"
    "function freeCalc(){ const out = outSoFar() + lateTotal(); const left = plan.income - out;\n"
    "  const babTodo = Math.max(0, invPlan() - invDone()), envTodo = Math.max(0, envTotal() - envDone()), fixTodo = Math.max(0, fixedTotal() - (fixedPaidTotal() + fixOther())), upT = upThisMonth();\n"
    "  const free = left - babTodo - envTodo - fixTodo - upT; const jl = Math.max(0, jarTotal() - varSpent());\n"
    "  const pool = Math.max(0, Math.min(free, jl)); return {out, left, free, jl, pool, perDay: DAYS_LEFT>0 ? pool/DAYS_LEFT : pool, tight: free < jl, short: Math.max(0, jl - Math.max(0, free))}; }")
rep("  const perDay = DAYS_LEFT>0 ? Math.max(0, jl)/DAYS_LEFT : Math.max(0,jl);", "  const FC = freeCalc(); const perDay = FC.perDay;")
rep("document.getElementById('jh-pd').textContent = lang==='hi' ?",
    "const pdEl = document.getElementById('jh-pd'); pdEl.style.color = FCj.tight ? '#B9841A' : ''; pdEl.textContent = (FCj.tight ? '⚠ ' : '') + (lang==='hi' ?")
s = s.replace("${t('perdayj')} ${inr(Math.round(perDay))} ${t('upto')} · ${DAYS_LEFT} ${t('daysj')}` : `${t('perdayj')} ${inr(Math.round(perDay))} ${t('upto')} · ${DAYS_LEFT} ${t('daysj')}`;",
              "${t('perdayj')} ${inr(Math.round(perDay))} ${t('upto')} · ${DAYS_LEFT} ${t('daysj')}` : `${t('perdayj')} ${inr(Math.round(perDay))} ${t('upto')} · ${DAYS_LEFT} ${t('daysj')}`) + (FCj.tight ? ` · ${t('jarsshort')} ${inr(FCj.short)}` : '');", 1)
rep("  const {left, jl, perDay} = X;", "  const {left, jl, perDay} = X; const FCj = freeCalc();")
# plain hero: show per-day + tight note in the side box
rep("  document.getElementById('he-l2').textContent = t('leftmonth'); const hv2 = document.getElementById('he-v2'); hv2.classList.toggle('neg', left<0); countTo(hv2, left);",
    "  document.getElementById('he-l2').textContent = t('perdayshort'); const hv2 = document.getElementById('he-v2'); hv2.classList.toggle('neg', FC.tight); countTo(hv2, Math.round(FC.perDay));")

# ---------- unify the free-money label across looks ----------
rep("document.getElementById('jh-lf').textContent = lang==='hi' ? 'सच में बचा' : t('trulyfree');", "document.getElementById('jh-lf').textContent = t('trulyfree');")
rep("tot.innerHTML = `<span>${t('bhhand')} <small style=\"color:#6E5A44;font-size:12px\">· ${t('trulyfree')}</small></span>", "tot.innerHTML = `<span>${t('trulyfree')}</span>")
s = s.replace("trulyfree:'सच में खाली'", "trulyfree:'सच में बचा'")

# ---------- hide 'in hand' until money-in is logged ----------
for col in ["'#C8102E':'#1C5A36'", "'#F4B183':'#A8E0BE'"]:
    old = "<span>${t('inhand')} <b style=\"color:${hand<0?"+col+"}\">${inr(hand)}</b> <span class=\"chev\">›</span></span>`;"
    rep(old, "${recv>0 ? `<span>${t('inhand')} <b style=\"color:${hand<0?"+col+"}\">${inr(hand)}</b> <span class=\"chev\">›</span></span>` : `<span class=\"chev\">${t('addinflow')} ›</span>`}`;")
rep("<span>${t('inhand')} <b style=\"color:${hand<0?'#B3261E':'#1C5A36'}\">${inr(hand)}</b> ›</span>`; bi.onclick = inflowSheet;",
    "${recv>0 ? `<span>${t('inhand')} <b style=\"color:${hand<0?'#B3261E':'#1C5A36'}\">${inr(hand)}</b> ›</span>` : `<span>${t('addinflow')} ›</span>`}`; bi.onclick = inflowSheet;")

# ---------- 5. overspent never shows a green ✓ ----------
rep("const strip = (cls, n, pl, dn, td, dl, tl) => `<button class=\"js ${cls}\" data-lane=\"${cls==='s1'?'bab':cls==='s2'?'fix':'var'}\"><i style=\"width:${pl?Math.min(100,dn/pl*100):0}%\"></i><span class=\"n\">${n}</span><span class=\"m\">${inr(dn)} ${dl}</span><span class=\"a ${td?'todo':'ok'}\">${td ? inr(td)+' '+tl : '✓'}</span></button>`;",
    "const strip = (cls, n, pl, dn, td, dl, tl) => `<button class=\"js ${cls}\" data-lane=\"${cls==='s1'?'bab':cls==='s2'?'fix':cls==='s4'?'env':'var'}\"><i style=\"width:${pl?Math.min(100,dn/pl*100):0}%\"></i><span class=\"n\">${n}</span><span class=\"m\">${inr(dn)} ${dl}</span><span class=\"a ${dn>pl&&cls!=='s1'?'over':td?'todo':'ok'}\">${dn>pl&&cls!=='s1' ? '+'+inr(dn-pl)+' '+t('overby') : td ? inr(td)+' '+tl : '✓'}</span></button>`;")
rep(".jh .js .a.ok{color:#1C5A36}", ".jh .js .a.ok{color:#1C5A36}.jh .js .a.over{color:#C8102E}")
rep("const row = (k, n, dn, td) => `<button class=\"kr\" data-lane=\"${k}\"><span>${n}</span><b>${fmt(dn)}</b><b class=\"${td?'pend':'ok'}\">${td?fmt(td):'✓'}</b></button>`;",
    "const row = (k, n, dn, td, pl) => `<button class=\"kr\" data-lane=\"${k}\"><span>${n}</span><b>${fmt(dn)}</b><b class=\"${pl!=null&&dn>pl?'pend':td?'pend':'ok'}\">${pl!=null&&dn>pl ? '+'+fmt(dn-pl) : td?fmt(td):'✓'}</b></button>`;")
rep("+ row('fix', t('laneFix'), fixDn0, fixTodo) + row('var', t('laneVar'), varSpent(), Math.max(0, jarTotal()-varSpent()))",
    "+ row('fix', t('laneFix'), fixDn0, fixTodo, fixPl0) + row('var', t('laneVar'), varSpent(), Math.max(0, jarTotal()-varSpent()), jarTotal())")
s = s.replace("<span class=\"b\">${td ? `<b>${inr(td)}</b>` : '<b style=\"color:#A8E0BE\">✓</b>'}</span>",
              "<span class=\"b\">${dn>pl && k!=='bab' && k!=='late' ? `<b style=\"color:#F4B183\">+${inr(dn-pl)}</b>` : td ? `<b>${inr(td)}</b>` : '<b style=\"color:#A8E0BE\">✓</b>'}</span>", 1)

# ---------- 2. one saving formula ----------
rep("function renderMonthCard(D, C){", r'''function monthSaving(D, C){
  C = C || calc(D);
  const inv = C.babActual;
  const told = D.live ? null : (pastSaved[D.key]!=null ? +pastSaved[D.key] : (D.closed && D.closed.saved!=null ? +D.closed.saved : null));
  let left = null, kind = 'unknown';
  if(told!=null){ left = told; kind = 'told'; }
  else if(D.live){ const F = freeCalc(); left = Math.max(0, F.free - F.jl); kind = 'proj'; }
  else if(C.received > 0){ left = Math.max(0, C.received - C.out); kind = 'est'; }
  const base = C.received > 0 ? C.received : C.income;
  const total = inv + (left||0);
  return {inv, left, kind, total, pct: base>0 ? Math.round(total/base*100) : 0, known: left!=null};
}
function renderMonthCard(D, C){''')
rep("  const told = D.live ? null : (pastSaved[D.key]!=null ? pastSaved[D.key] : (closed && closed.saved!=null ? +closed.saved : null));\n  const jarsLeft = told!=null ? told : Math.max(0, jarPlan - jarUsed);\n  const saved = C.babActual + jarsLeft; const pct = C.income>0 ? Math.round(saved/C.income*100) : 0;",
    "  const MS0 = monthSaving(D, C); const saved = MS0.total, pct = MS0.pct;")
rep("<div class=\"v sv\">${inr(saved)}</div><div class=\"l2\">${D.live ? t('savedsofar') : t('savedmonth')} · ${t('ofincome')} <b>${pct}%</b></div></div>",
    "<div class=\"v sv\">${inr(saved)}${MS0.known?'':' + ?'}</div><div class=\"l2\">${D.live ? t('savedproj') : t('savedmonth')}${MS0.known ? ` · ${t('ofincome')} <b>${pct}%</b>` : ''}</div></div>")
rep("<div class=\"msv-r\"><span>${told!=null ? t('monthsaving')+' ('+t('youtold')+')' : t('jarsleft')+(D.live?' ('+t('ifkept')+')':'')}</span><b>${inr(jarsLeft)}</b></div>${C.envActual ? `<div class=\"msv-r\" style=\"opacity:.8\"><span>${t('envsec')} · ${t('deposit')}</span><b>${inr(C.envActual)}</b></div>` : ''}<div class=\"msv-r tot\"><span>${D.live ? t('savedsofar') : t('savedmonth')}</span><b>${inr(saved)}</b></div></div>",
    "<div class=\"msv-r\"><span>${t('monthsaving')} (${t('sk_'+MS0.kind)})</span><b>${MS0.known ? inr(MS0.left) : `<button class=\"tellbtn\" data-tell=\"${D.key}\">? ${t('tellsaved')}</button>`}</b></div><div class=\"msv-r tot\"><span>${D.live ? t('savedproj') : t('savedmonth')}</span><b>${inr(saved)}${MS0.known?'':' + ?'}</b></div></div>")
rep("    <div class=\"mf\"><span>${t('inhand')}${lateIn ? ` · ${t('lateshort')} ${inr(lateIn)}` : ''}</span><b class=\"${left<0?'neg':''}\">${inr(left)}</b></div>",
    "    ${C.received>0 ? `<div class=\"mf\"><span>${t('inhand')}${lateIn ? ` · ${t('lateshort')} ${inr(lateIn)}` : ''}</span><b class=\"${C.received - C.out - lateIn<0?'neg':''}\">${inr(C.received - C.out - lateIn)}</b></div>` : ''}")
rep("  el.querySelectorAll('[data-mj]').forEach(b=>b.onclick=()=>{", "  el.querySelectorAll('[data-tell]').forEach(b=>b.onclick=ev=>{ ev.stopPropagation(); reportSaved(b.dataset.tell); });\n  el.querySelectorAll('[data-mj]').forEach(b=>b.onclick=()=>{")
rep(".mcard .mf b.neg{color:var(--orange)}", ".mcard .mf b.neg{color:var(--orange)}\n.mcard .tellbtn{font-size:12.5px;font-weight:700;color:var(--blue);background:var(--card);border-radius:8px;padding:3px 8px}")
# reportSaved takes an optional month
rep("async function reportSaved(){\n  const pk = prevMonthKey(); const cur = pastSaved[pk];", "async function reportSaved(mkey){\n  const pk = (typeof mkey==='string' && mkey) ? mkey : prevMonthKey(); const cur = pastSaved[pk];")
rep("if(c && !c.loading){ const C = calc(c); const jl = C.jars.reduce((a,j)=>a+Math.max(0, j.plan-j.actual),0); hint = t('savedsub').replace('{x}', inr(jl)).replace('{y}', inr(C.income - C.out)); }",
    "if(c && !c.loading){ const C = calc(c); hint = t('savedsub2').replace('{i}', inr(C.received)).replace('{o}', inr(C.out)).replace('{y}', inr(Math.max(0, C.received - C.out))); }")
rep("const bsv = document.getElementById('b-saved'); if(bsv) bsv.onclick = reportSaved;", "const bsv = document.getElementById('b-saved'); if(bsv) bsv.onclick = ()=>reportSaved();")
# Snapshot review uses the same figure
rep("  const sr = inc>0 ? Math.round((C.babActual + Math.max(0,left))/inc*100) : 0;", "  const MSr = monthSaving(D, C); const sr = MSr.pct;")
rep("    <div class=\"big\"><span>${t('saved2')}</span><span class=\"v\" style=\"color:${left<0?'var(--orange)':'var(--blue)'}\">${inr(left)}</span></div>\n    <div class=\"li\"><span>${t('savrate')}</span><span class=\"num\">${sr}%</span></div>",
    "    <div class=\"big\"><span>${D.live ? t('savedproj') : t('savedmonth')}</span><span class=\"v\" style=\"color:var(--green)\">${inr(MSr.total)}${MSr.known?'':' + ?'}</span></div>\n    <div class=\"li\"><span>${t('babshort')} + ${t('monthsaving')} (${t('sk_'+MSr.kind)})</span><span class=\"num\">${inr(MSr.inv)} + ${MSr.known ? inr(MSr.left) : '?'}</span></div>\n    ${MSr.known ? `<div class=\"li\"><span>${t('savrate')}</span><span class=\"num\">${sr}%</span></div>` : ''}")
rep("    ${D.closed ? `<div class=\"li\"><span>${t('closedon')}</span><span class=\"num\" style=\"color:var(--blue)\">+${inr(D.closed.sweep||0)} ${t('swept')}</span></div>` : ''}\n", "")
# report card image
rep("  const left = C.income - C.out, sr = C.income>0 ? Math.round((C.babActual + Math.max(0,left))/C.income*100) : 0;",
    "  const MSc = monthSaving(D, C); const left = MSc.total, sr = MSc.pct;")
rep("  T(t('saved2'), 100, 400, font(600, 30), '#55605B');", "  T(D.live ? t('savedproj') : t('savedmonth'), 100, 400, font(600, 30), '#55605B');")
# month close default = the same estimate
rep("const sv = await ask({title:t('savedq').replace('{m}', monthName(pk)), sub:t('savedsub').replace('{x}', inr(sweep)).replace('{y}', inr(C.income - C.out)), input:{value:sweep, placeholder:'0'}, okText:t('closenow')}); if(sv===null || sv===undefined) return; const savedAmt = (sv===true) ? sweep : sv;",
    "const est = Math.max(0, C.received - C.out); const sv = await ask({title:t('savedq').replace('{m}', monthName(pk)), sub:t('savedsub2').replace('{i}', inr(C.received)).replace('{o}', inr(C.out)).replace('{y}', inr(est)), input:{value:est, placeholder:'0'}, okText:t('closenow')}); if(sv===null || sv===undefined) return; const savedAmt = (sv===true) ? est : sv;")

# ---------- 3. which month — asked before any tick ; big-amount guard ----------
rep("  const extra = (document.getElementById('note').value||'').trim();\n  const photo = photoBlob ? await uploadPhoto(photoBlob) : '';\n  if(sel==='fix'){",
    "  { const j = sel!=='fix' ? plan.jars.find(x=>x.id===sel) : null; const ref = j ? j.plan : (item && item.amt) || 0;\n"
    "    if((ref>0 && a > 3*ref) || a >= 100000){ const ok = await ask({title:t('bigq').replace('{a}', inr(a)), sub: ref>0 ? t('bigsub').replace('{p}', inr(ref)) : '', okText:t('yeswrite'), cancelText:t('cancel')}); if(!ok) return; } }\n"
    "  let forPrev = false;\n"
    "  if(sel==='fix' && item && plan.fixed.find(f=>f.id===item.key) && mk===MKEY && TODAY<=20 && selDate<=TODAY_D){\n"
    "    const pk = prevMonthKey(); if(sb && !viewCache[pk]) await loadMonth(pk); const pc = viewCache[pk];\n"
    "    const prevUnpaid = !pc || pc.loading ? true : !(pc.paid && pc.paid[item.key]) && !pc.entries.some(e=>e.cat==='fix' && e.catId===item.key);\n"
    "    if(prevUnpaid){ const w = await ask({title:t('whichmonth'), sub:`${label} · ${inr(a)}`, buttons:[{text:`${monthName(pk)} ${t('ka')}`, value:'prev'}, {text:`${monthName(MKEY)} ${t('ka')}`, value:'cur'}]}); if(!w) return; forPrev = w==='prev'; }\n  }\n"
    "  const extra = (document.getElementById('note').value||'').trim();\n  const photo = photoBlob ? await uploadPhoto(photoBlob) : '';\n  if(sel==='fix'){")
rep("    else if(mk===MKEY && applyTick(item, a, selDate.getDate())){", "    else if(!forPrev && mk===MKEY && applyTick(item, a, selDate.getDate())){")
i = s.index("  if(cat==='fix' && mk===MKEY && TODAY<=20){ // a monthly bill logged early in the month: is it last month's?")
j = s.index("\n  else if(mk < MKEY){", i)
s = s[:i] + "  if(forPrev){ const pk = prevMonthKey(); const [py,pm] = pk.split('-').map(Number); const ld = new Date(py, pm, 0).getDate(); const fx = plan.fixed.find(x=>x.id===catId); mkE = pk; dayE = (fx && fx.due>0) ? Math.min(fx.due, ld) : ld; }" + s[j:]

# ---------- 4. keypad prefill is a placeholder ----------
rep("const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','C'];", "const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','C'];\n  av.classList.toggle('pre', amtPre && !!amt);")
rep("document.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ const k=b.dataset.k; if(k==='⌫') amt=amt.slice(0,-1);",
    "document.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ const k=b.dataset.k; if(amtPre){ amtPre=false; if(k!=='⌫' && k!=='C') amt=''; } if(k==='⌫') amt=amt.slice(0,-1);")
rep("if(it.key==='__fix'){ resetLog(); go('log'); const fi = await pickItem(); if(fi){ sel='fix'; item=fi; if(fi.amt) amt=String(fi.amt); renderLog(); } return; }",
    "if(it.key==='__fix'){ resetLog(); go('log'); const fi = await pickItem(); if(fi){ sel='fix'; item=fi; if(fi.amt){ amt=String(fi.amt); amtPre=true; } renderLog(); } return; }")
rep("sel='fix'; item=it; if(!amt && it.amt) amt=String(it.amt); }", "sel='fix'; item=it; if((!amt || amtPre) && it.amt){ amt=String(it.amt); amtPre=true; } }")
rep("function resetLog(){ amt='';", "let amtPre = false;\nfunction resetLog(){ amtPre=false; amt='';")
rep("document.querySelectorAll('[data-qa]').forEach(b=>b.onclick=()=>{ amt = String(b.dataset.qa); buzz(5); renderLog(); });", "document.querySelectorAll('[data-qa]').forEach(b=>b.onclick=()=>{ amt = String(b.dataset.qa); amtPre = false; buzz(5); renderLog(); });")
rep("/* fixed groups */", "#amt.pre{color:var(--muted)}\n#amt.pre::after{content:' ✎';font-size:.5em;vertical-align:middle}\n/* fixed groups */")

# ---------- 7. elder mode safety ----------
rep("html.elder #srch-mini,html.elder #skin-mini{display:none}", "html.elder #srch-mini,html.elder #skin-mini{display:none}\nhtml.elder .screen{padding-bottom:190px}")
rep("b.className='btn danger'; b.textContent = t('vundoall');", "b.className='btn ghost'; b.style.flex='0 0 auto'; b.style.color='var(--orange)'; b.textContent = t('vundoall');")
rep("  } else {\n    let amt = f.amt;", "  } else {\n    if(elder){ const ok = await ask({title:nm(f), sub:t('markpaidq'), okText:t('markpaid'), cancelText:t('cancel')}); if(!ok) return; }\n    let amt = f.amt;")

# ---------- jars: 2500 − 360 = 2140 · 19 days ----------
rep("<div class=\"lf\">${inr(left)}</div><div class=\"dy ${warn?'warn':''}\">${left<=0 ? '0 '+t('lasts') : (lasts>=DAYS_LEFT ? t('monthok') : lasts+' '+t('lasts'))}</div></button>`;",
    "<div class=\"lf ${left<0?'neg':''}\">${left<0 ? '+'+inr(-left) : inr(left)}</div><div class=\"eq\">${fmt(j.plan)} − ${fmt(sp)}</div><div class=\"dy ${warn?'warn':''}\">${left<=0 ? t('jarover') : (DAYS_LEFT>0 ? `${DAYS_LEFT} ${t('lasts')} · ₹${fmt(Math.floor(left/DAYS_LEFT))}/${t('dayshort')}` : t('lastday'))}</div></button>`;")
rep(".jar .dy.warn{background:var(--orange-soft);color:var(--orange)}", ".jar .dy.warn{background:var(--orange-soft);color:var(--orange)}\n.jar .eq{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums;margin-top:-2px}\n.jar .lf.neg{color:var(--orange)}")

# ---------- due tiles: one line when there are many ----------
rep("  b.innerHTML = dueNow.length ? `<div class=\"due\">", "  const dueShowAll = window.__dueAll || dueNow.length <= 3;\n  b.innerHTML = dueNow.length && !dueShowAll ? `<button class=\"due dueline\" id=\"due-more\"><div class=\"h\" style=\"width:100%\">${t('dues')}<span class=\"n\">${dueNow.length}</span><span style=\"flex:1\"></span><b class=\"num\">${inr(dueNow.reduce((a,f)=>{ const h = plan.helpers.find(x=>x.fixedId===f.id); return a + (h ? helperCalc(h).amt : (f.amt||0)); },0))}</b> ›</div></button>` : dueNow.length ? `<div class=\"due\">")
rep("  // babylon\n", "  { const dm = document.getElementById('due-more'); if(dm) dm.onclick = ()=>{ window.__dueAll = true; buzz(4); renderHome(); }; }\n  // babylon\n")
rep(".due{padding:10px 12px;gap:8px}", ".due{padding:10px 12px;gap:8px}\n.dueline{width:100%;text-align:left}\n.dueline .h{display:flex;align-items:center;gap:8px}")

# ---------- strings ----------
rep("munim:'मुनीम ने लिखा — ठीक है?',", "munim:'मुनीम ने लिखा — ठीक है?',perdayshort:'रोज़ खर्च सकते हैं',jarsshort:'घड़ों में ज़्यादा रखा',savedproj:'इस महीने बचत होगी',sk_told:'आपने बताया',sk_proj:'अगर बजट में रहे',sk_est:'ऐप का अनुमान',sk_unknown:'अभी पता नहीं',savedsub2:'ऐप के हिसाब से: मिला {i}, गया {o}, बचा {y}। जो सच में बचा हो वही लिखें।',bigq:'{a} — सही रक़म है?',bigsub:'इसकी योजना {p} है। ग़लती से ज़्यादा अंक तो नहीं लगे?',markpaidq:'दे दिया? टिक लगाएँ',jarover:'बजट से ज़्यादा',dayshort:'दिन',lastday:'आख़िरी दिन',")
rep("munim:'Munim wrote this — OK?',", "munim:'Munim wrote this — OK?',perdayshort:'Can spend per day',jarsshort:'jars over free money by',savedproj:'Will save this month',sk_told:'you told us',sk_proj:'if you stay in budget',sk_est:'app estimate',sk_unknown:'not known yet',savedsub2:'By the app: received {i}, spent {o}, left {y}. Enter what you really saved.',bigq:'{a} — is that right?',bigsub:'The plan for this is {p}. Did an extra digit slip in?',markpaidq:'Paid? Tick it',jarover:'over budget',dayshort:'day',lastday:'last day',")
rep("const BUILD = '12.10.1345';", "const BUILD = '12.10.1430';")
open(p,'w',encoding='utf-8').write(s)
m=re.findall(r'<script>(.*?)</script>',s,re.S); open('/tmp/claude-0/-home-claude/b3b786fe-2630-570a-811c-7efa4e555f1c/scratchpad/site/chk.js','w').write(max(m,key=len)); print('ok')
