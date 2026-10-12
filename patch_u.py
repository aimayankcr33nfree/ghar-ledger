import re
p='/tmp/claude-0/-home-claude/b3b786fe-2630-570a-811c-7efa4e555f1c/scratchpad/site/index.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)>=1, 'MISSING: '+old[:100]
    s=s.replace(old,new,cnt)

# ---- A. month range + date fields allow the future ----
rep("const FIRST_MONTH = '2026-09';", "const FIRST_MONTH = '2026-01';\nconst LAST_MONTH = (()=>{ const [y,m]=MKEY.split('-').map(Number); const d=new Date(y, m-1+14, 1); return d.getFullYear()+'-'+pad2(d.getMonth()+1); })();")
rep("const prevOk = viewMonth > FIRST_MONTH, nextOk = viewMonth < MKEY;", "const prevOk = viewMonth > FIRST_MONTH, nextOk = viewMonth < LAST_MONTH;")
rep("<small>${viewMonth===MKEY?t('current'):t('closed')}</small>", "<small>${viewMonth===MKEY?t('current'):viewMonth>MKEY?t('upshort'):t('closed')}</small>")
rep("if(f.type==='date'){ i.max = isoOf(TODAY_D); }", "if(f.type==='date'){ i.min = '2026-01-01'; i.max = f.future ? isoOf(new Date(now.getFullYear()+1, 11, 31)) : isoOf(TODAY_D); }")
# Log screen date picker: any date from Jan 2026 to end of next year
rep("const minD = new Date(now.getFullYear(), now.getMonth()-1, 1);", "const minD = new Date(2026, 0, 1), maxD = new Date(now.getFullYear()+1, 11, 31);")
rep('min="${isoOf(minD)}" max="${isoOf(TODAY_D)}"', 'min="${isoOf(minD)}" max="${isoOf(maxD)}"')
rep("let nd = new Date(y,m-1,d); if(nd>TODAY_D) nd=new Date(TODAY_D); if(nd<minD) nd=new Date(minD); selDate = nd; renderLog(); };",
    "let nd = new Date(y,m-1,d); if(nd>maxD) nd=new Date(maxD); if(nd<minD) nd=new Date(minD); selDate = nd; renderLog(); };")
rep("ds.textContent = ago===0 ? '' : `${DAYS[lang][selDate.getDay()]}, ${selDate.getDate()} ${MONTHS[lang][selDate.getMonth()]}` + (ago>1 ? ` · ${ago} ${t('daysago')}` : '');\n  ds.className = 'dsel' + (ago>0?' past':'');",
    "ds.textContent = ago===0 ? '' : `${DAYS[lang][selDate.getDay()]}, ${selDate.getDate()} ${MONTHS[lang][selDate.getMonth()]}` + (ago>1 ? ` · ${ago} ${t('daysago')}` : ago<0 ? ` · ${t('futureSave')}` : '');\n  ds.className = 'dsel' + (ago>0?' past':ago<0?' past':'');")
# chip label when a future date is picked
rep("${ago>1?shortDate(selDate.getDate(),selDate.getMonth()):t('pickdate')}", "${ago>1||ago<0?shortDate(selDate.getDate(),selDate.getMonth()):t('pickdate')}")
rep('<label class="${ago>1?\'on\':\'\'}">', '<label class="${ago>1||ago<0?\'on\':\'\'}">')
# Log save: a future date becomes an upcoming entry
rep("  if(extra){ note = note ? note + ' · ' + extra : extra; label = label + ' · ' + extra; }\n  const newId = await addEntry({ts:Date.now(), month:mk, day:selDate.getDate(), cat, catId, amt:a, by:me, note, photo});",
    "  if(extra){ note = note ? note + ' · ' + extra : extra; label = label + ' · ' + extra; }\n  if(selDate > TODAY_D){ catId = cat + ':' + catId; cat = 'up'; if(!note) note = label; }\n  const newId = await addEntry({ts:Date.now(), month:mk, day:selDate.getDate(), cat, catId, amt:a, by:me, note, photo});")
rep("const shownLabel = label + (ago>0 ? ' · ' + shortDate(selDate.getDate(), selDate.getMonth()) : '');",
    "const shownLabel = label + (ago!==0 ? ' · ' + shortDate(selDate.getDate(), selDate.getMonth()) : '') + (cat==='up' ? ' · ' + t('upshort') : '');")
rep("resetLog(); await celebrate(a, shownLabel, warn); go(ago>0 ? 'book' : 'home');", "resetLog(); await celebrate(a, shownLabel, warn); go(ago>0 ? 'book' : 'home'); if(cat==='up'){ viewMonth = MKEY; }")
# quickAdd: future allowed → upcoming
rep("    {key:'date', type:'date', label:t('pickdate'), value:isoOf(defDate||TODAY_D)},\n    {key:'note', type:'text', label:t('name'), value:'', placeholder:t('notehint')}\n  ], okText:t('save')});",
    "    {key:'date', type:'date', label:t('pickdate'), value:isoOf(defDate||TODAY_D), future:true},\n    {key:'note', type:'text', label:t('name'), value:'', placeholder:t('notehint')}\n  ], okText:t('save')});")
rep("  const newId = await addEntry({ts:Date.now(), month:mk, day:d, cat:'var', catId:jarId, amt:r.amt, by:me, note:(r.note||'').trim(), photo:''});\n  if(mk!==MKEY){ delete viewCache[mk]; if(!afterFn) viewMonth = mk; }",
    "  const fut = new Date(y, m-1, d) > TODAY_D;\n  const newId = await addEntry({ts:Date.now(), month:mk, day:d, cat:fut?'up':'var', catId:fut?'var:'+jarId:jarId, amt:r.amt, by:me, note:(r.note||'').trim() || (fut?nm(j):''), photo:''});\n  if(mk!==MKEY){ delete viewCache[mk]; if(!afterFn && !fut) viewMonth = mk; }")
# entryActions: date change allows future
rep("const r = await ask({title:t('chgdate'), sub:name, fields:[{key:'date', type:'date', label:t('when2'), value:cur}], okText:t('save')});\n    if(r && r.date){ const [y,m,d] = r.date.split('-').map(Number); const mk = `${y}-${pad2(m)}`; await updateEntry(e.id, {day:d, month:mk});",
    "const r = await ask({title:t('chgdate'), sub:name, fields:[{key:'date', type:'date', label:t('when2'), value:cur, future:true}], okText:t('save')});\n    if(r && r.date){ const [y,m,d] = r.date.split('-').map(Number); const mk = `${y}-${pad2(m)}`; const patch = {day:d, month:mk}; const fut = new Date(y,m-1,d) > TODAY_D; if(fut && e.cat!=='up'){ patch.cat='up'; patch.catId = e.cat+':'+e.catId; } if(!fut && e.cat==='up'){ const k = upKind(e); patch.cat=k.cat; patch.catId=k.id; } await updateEntry(e.id, patch);")
rep("const row = {}; if(patch.amt!=null) row.amt = patch.amt; if(patch.day!=null) row.day = patch.day; if(patch.month) row.month = patch.month; if(patch.note!=null) row.note = patch.note;",
    "const row = {}; if(patch.amt!=null) row.amt = patch.amt; if(patch.day!=null) row.day = patch.day; if(patch.month) row.month = patch.month; if(patch.note!=null) row.note = patch.note; if(patch.cat) row.cat = patch.cat; if(patch.catId) row.cat_id = patch.catId;")

# ---- B. voice: future dates, per-row date in the fix sheet ----
rep("const setDay = (d, mi) => { if(d<1||d>31) return false; const m = mi>=0 ? mi : now.getMonth(); const nd = new Date(now.getFullYear(), m, d); if(nd > TODAY_D) nd.setFullYear(nd.getFullYear()-1); date = nd; return true; };",
    "const setDay = (d, mi) => { if(d<1||d>31) return false; const m = mi>=0 ? mi : now.getMonth(); let nd = new Date(now.getFullYear(), m, d); if(mi<0 && nd > TODAY_D) nd = new Date(now.getFullYear(), m-1, d); if(mi>=0 && nd < new Date(now.getFullYear(), now.getMonth()-6, 1)) nd = new Date(now.getFullYear()+1, m, d); date = nd; return true; };")
rep("            {key:'amt', type:'num', label:t('amount')+' (₹)', value:it0.amt, placeholder:'0', req:true} ], okText:t('ok'), onOpen: ()=>{",
    "            {key:'amt', type:'num', label:t('amount')+' (₹)', value:it0.amt, placeholder:'0', req:true},\n            {key:'date', type:'date', label:t('when2'), value:isoOf(it0.date||R.date), future:true} ], okText:t('ok'), onOpen: ()=>{")
rep("else if(r && typeof r === 'object'){ it0.note = (r.note||'').trim().slice(0,60); if(r.amt>0) it0.amt = r.amt; }",
    "else if(r && typeof r === 'object'){ it0.note = (r.note||'').trim().slice(0,60); if(r.amt>0) it0.amt = r.amt; if(r.date){ const [y,m,d] = r.date.split('-').map(Number); const nd = new Date(y,m-1,d); it0.date = (nd.getTime()===R.date.getTime()) ? null : nd; } }")
rep("<small>${me||''}</small>", "<small>${it.date ? shortDate(it.date.getDate(), it.date.getMonth()) + (me?' · ':'') : ''}${me||''}</small>")
# voice save loop: per-item date, future → upcoming
rep("  const d = R.date.getDate(), mk = R.date.getFullYear()+'-'+pad2(R.date.getMonth()+1);\n  const done = [];\n  for(const it of R.items){\n    if(it.target.kind==='jar'){\n      const id = await addEntry({ts:Date.now(), month:mk, day:d, cat:'var', catId:it.target.id, amt:it.amt, by:me, note:it.note, photo:''});",
    "  const d0 = R.date.getDate(), mk0 = R.date.getFullYear()+'-'+pad2(R.date.getMonth()+1); let d = d0, mk = mk0;\n  const done = [];\n  for(const it of R.items){\n    const dt = it.date || R.date; d = dt.getDate(); mk = dt.getFullYear()+'-'+pad2(dt.getMonth()+1); const fut = dt > TODAY_D;\n    if(fut){ const kind = it.target.kind==='jar' ? 'var' : 'fix'; const id = await addEntry({ts:Date.now(), month:mk, day:d, cat:'up', catId:kind+':'+it.target.id, amt:it.amt, by:me, note:it.note || vTargetName(it.target), photo:''}); done.push({id, label:(it.note||vTargetName(it.target)) + ' · ' + shortDate(d, dt.getMonth()) + ' · ' + t('upshort'), amt:it.amt}); if(mk!==MKEY) delete viewCache[mk]; continue; }\n    if(it.target.kind==='jar'){\n      const id = await addEntry({ts:Date.now(), month:mk, day:d, cat:'var', catId:it.target.id, amt:it.amt, by:me, note:it.note, photo:''});")
rep("  if(mk!==MKEY) delete viewCache[mk];\n  buzz([10,40,18,40,10]); renderAll(); go(mk===MKEY && d===TODAY ? 'home' : 'book'); if(mk!==MKEY) viewMonth = mk;",
    "  if(mk0!==MKEY) delete viewCache[mk0];\n  buzz([10,40,18,40,10]); renderAll(); const anyFut = R.items.some(it=>(it.date||R.date) > TODAY_D); go((mk0===MKEY && d0===TODAY) || anyFut ? 'home' : 'book'); if(mk0!==MKEY && !anyFut) viewMonth = mk0;")

# ---- C. upcoming layer ----
rep("async function pullEntries(){\n  const {data, error} = await sb.from('entries').select('*').eq('month', MKEY).order('ts');\n  if(error) throw error;\n  entries = data.map(fromRow);\n}",
    "async function pullEntries(){\n  const {data, error} = await sb.from('entries').select('*').eq('month', MKEY).order('ts');\n  if(error) throw error;\n  entries = data.map(fromRow);\n  try{ const u = await sb.from('entries').select('*').eq('cat','up').order('month').order('day'); if(!u.error) upcoming = (u.data||[]).map(fromRow); }catch(e){}\n}\nlet upcoming = [];\nfunction upKind(e){ const i = String(e.catId||'').indexOf(':'); return i>0 ? {cat:e.catId.slice(0,i), id:e.catId.slice(i+1)} : {cat:'fix', id:'fix'}; }\nfunction upList(){ const L = sb ? upcoming : entries.filter(e=>e.cat==='up').map(e=>Object.assign({month:MKEY}, e)); return L.slice().sort((a,b)=>(a.month+pad2(a.day)).localeCompare(b.month+pad2(b.day))); }\nfunction upThisMonth(){ return upList().filter(e=>e.month===MKEY).reduce((a,e)=>a+e.amt,0); }\nfunction upName(e){ if(e.note) return e.note; const k = upKind(e); const j = plan.jars.find(x=>x.id===k.id); if(j) return nm(j); const f = plan.fixed.find(x=>x.id===k.id); return f ? nm(f) : t('upcoming'); }\n"
    "function renderUpcoming(){\n  const sec = document.getElementById('up-sec'); if(!sec) return; const L = upList();\n  document.getElementById('tt-up').textContent = L.length ? inr(L.reduce((a,e)=>a+e.amt,0)) : '';\n  document.getElementById('up-card').innerHTML = L.length ? L.map(e=>{ const [y,m] = e.month.split('-').map(Number); const over = new Date(y, m-1, e.day) < TODAY_D; return `<button class=\"row44\" data-up=\"${e.id}\"><span class=\"dt\" style=\"${over?'color:var(--orange)':''}\">${shortDate(e.day, m-1)}${y!==now.getFullYear()?' '+y:''}</span><div class=\"nm\">${upName(e)}<small>${over ? t('upover') : (e.by||'')}</small></div><div class=\"amt\">${inr(e.amt)}</div></button>`; }).join('') : `<div class=\"hint\" style=\"padding:14px\">${t('uphint')}</div>`;\n  sec.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{ const e = L.find(x=>String(x.id)===b.dataset.up); if(e) upActions(e); });\n}\n"
    "async function addUpcoming(){\n  const d7 = new Date(TODAY_D); d7.setDate(d7.getDate()+7);\n  const r = await ask({title:t('upcoming'), sub:t('uphint'), fields:[\n    {key:'note', type:'text', label:t('upnote'), value:'', placeholder:t('upnotehint'), req:true},\n    {key:'amt', type:'num', label:t('amount')+' (₹)', value:'', placeholder:'0', req:true},\n    {key:'date', type:'date', label:t('upwhen'), value:isoOf(d7), future:true} ], okText:t('save')});\n  if(!r || !r.date) return;\n  if(!me){ const w = await ask({title:t('who'), sub:t('whoonce'), buttons: plan.members.map(m=>({text:m, value:m}))}); if(!w) return; me = w; try{localStorage.setItem('gl-me',me);}catch(e){} }\n  const [y,m,d] = r.date.split('-').map(Number); const mk = y+'-'+pad2(m); const fut = new Date(y,m-1,d) > TODAY_D;\n  const id = await addEntry({ts:Date.now(), month:mk, day:d, cat:fut?'up':'fix', catId:fut?'fix:fix':'fix', amt:r.amt, by:me, note:(r.note||'').trim(), photo:''});\n  if(mk!==MKEY) delete viewCache[mk]; buzz([10,30,10]); renderAll(); toast(`✓ ${r.note} · ${inr(r.amt)} · ${shortDate(d, m-1)}`);\n}\n"
    "async function upActions(e){\n  const [y,m] = e.month.split('-').map(Number); const k = upKind(e);\n  const v = await ask({title:upName(e), sub:`${shortDate(e.day, m-1)} · ${inr(e.amt)}${e.by?' · '+e.by:''} · ${t('upshort')}`, buttons:[ {text:t('updone'), value:'done'}, {text:t('chgamt'), value:'amt'}, {text:t('chgdate'), value:'date'}, {text:t('chgnote'), value:'note'}, {text:t('remove'), value:'del', cls:'danger'} ]});\n  if(!v) return;\n  if(v==='done'){\n    let cat = k.cat, catId = k.id;\n    if(cat==='var' && !plan.jars.find(j=>j.id===catId)){ cat='fix'; catId='fix'; }\n    if(cat==='fix' && catId==='fix'){ const L = plan.jars.map(j=>({key:'var:'+j.id, grp:t('variable'), label:nm(j), amt:0})).concat([{key:'fix:fix', grp:t('fixed'), label:t('fixedother'), amt:0}]); const it = await ask({title:t('whichjar'), sub:upName(e), list:L}); if(!it) return; [cat, catId] = it.key.split(':'); }\n    await addEntry({ts:Date.now(), month:MKEY, day:TODAY, cat, catId, amt:e.amt, by:me||e.by||'', note:e.note||'', photo:''});\n    await delEntry(e.id); if(e.month!==MKEY) delete viewCache[e.month]; renderAll(); toast(`✓ ${upName(e)} · ${inr(e.amt)}`); return; }\n  if(v==='amt'){ const a = await ask({title:t('chgamt'), sub:upName(e), input:{value:e.amt, placeholder:'0'}, okText:t('save')}); if(a && a!==e.amt){ await updateEntry(e.id, {amt:a}); } }\n  else if(v==='date'){ const r = await ask({title:t('chgdate'), sub:upName(e), fields:[{key:'date', type:'date', label:t('when2'), value:`${e.month}-${pad2(e.day)}`, future:true}], okText:t('save')}); if(r && r.date){ const [yy,mm,dd] = r.date.split('-').map(Number); const mk = `${yy}-${pad2(mm)}`; await updateEntry(e.id, {day:dd, month:mk}); delete viewCache[e.month]; delete viewCache[mk]; } }\n  else if(v==='note'){ const n = await ask({title:t('chgnote'), sub:upName(e), input:{type:'text', value:e.note||'', placeholder:t('upnotehint')}}); if(n!==null && n!==undefined && n!==true){ await updateEntry(e.id, {note:String(n).trim()}); } }\n  else if(v==='del'){ await delEntry(e.id); if(e.month!==MKEY) delete viewCache[e.month]; renderAll(); toast(t('deleted')); }\n  if(sb){ try{ await pullEntries(); }catch(x){} } renderAll();\n}")
# delEntry for ids in other months: check it works generally (uses sb delete by id) — leave.
# home section HTML after today list
rep('''    <div class="card list" id="today-list"></div>
  </div>
''', '''    <div class="card list" id="today-list"></div>
  </div>

  <div class="sec" id="up-sec">
    <div class="sec-h"><div class="t" data-i="upcoming"></div><div class="tt num" id="tt-up"></div><button class="a" id="up-add"></button></div>
    <div class="card list" id="up-card"></div>
  </div>
''')
rep("renderHome(); renderLog(); renderBook(); renderSnap(); renderSettings(); renderSync(); checkLock(); applyElder(); applySkin(); }",
    "renderHome(); renderUpcoming(); renderLog(); renderBook(); renderSnap(); renderSettings(); renderSync(); checkLock(); applyElder(); applySkin(); const ua = document.getElementById('up-add'); if(ua){ ua.textContent = t('addup'); ua.onclick = addUpcoming; } }")
# today list excludes upcoming
rep("const todays = entries.filter(e=>e.day===TODAY).sort((a,b)=>(a.ts||0)-(b.ts||0));", "const todays = entries.filter(e=>e.day===TODAY && e.cat!=='up').sort((a,b)=>(a.ts||0)-(b.ts||0));")
# day strip: upcoming days get the due dot
rep("const dueD = {}; plan.fixed.forEach(f=>{ if(f.due>0 && !paid[f.id] && f.due>=TODAY) dueD[f.due] = true; });",
    "const dueD = {}; plan.fixed.forEach(f=>{ if(f.due>0 && !paid[f.id] && f.due>=TODAY) dueD[f.due] = true; }); upList().forEach(e=>{ if(e.month===MKEY) dueD[e.day] = true; });")
# hero: subtract this month's upcoming from free; plain lanes
rep("  const babTodo = Math.max(0, babPl0 - babDn0), fixTodo = Math.max(0, fixPl0 - fixDn0);\n  const free = left - babTodo - fixTodo;\n  document.getElementById('he-l').textContent = t('trulyfree');",
    "  const babTodo = Math.max(0, babPl0 - babDn0), fixTodo = Math.max(0, fixPl0 - fixDn0), upT = upThisMonth();\n  const free = left - babTodo - fixTodo - upT;\n  document.getElementById('he-l').textContent = t('trulyfree');")
rep("    ['var', t('laneVar'), jarTotal(), varSpent(), t('used'), Math.max(0, jarTotal()-varSpent()), t('leftof').toLowerCase(), 's3']\n  ];",
    "    ['var', t('laneVar'), jarTotal(), varSpent(), t('used'), Math.max(0, jarTotal()-varSpent()), t('leftof').toLowerCase(), 's3']\n  ];\n  if(upT>0) lanes.push(['up', t('upshort'), upT, 0, '', upT, t('topay'), 's4']);")
rep("const tgt = {bab:'#bab-grid', fix:'#fix-list', var:'#jars'}[b.dataset.lane];", "const tgt = {bab:'#bab-grid', fix:'#fix-list', var:'#jars', up:'#up-card'}[b.dataset.lane];", 3)
# jantri
rep("  const babTodo = Math.max(0, babPl0 - babDn0), fixTodo = Math.max(0, fixPl0 - fixDn0);\n  const free = left - babTodo - fixTodo;\n  const recv = inflowTotal(), hand = recv - X.out, toCome0 = Math.max(0, plan.income - recv);\n  const dt = new Date(now.getFullYear(), now.getMonth(), TODAY);\n  const mon",
    "  const babTodo = Math.max(0, babPl0 - babDn0), fixTodo = Math.max(0, fixPl0 - fixDn0), upT = upThisMonth();\n  const free = left - babTodo - fixTodo - upT;\n  const recv = inflowTotal(), hand = recv - X.out, toCome0 = Math.max(0, plan.income - recv);\n  const dt = new Date(now.getFullYear(), now.getMonth(), TODAY);\n  const mon")
rep("    strip('s3', t('laneVar'), jarTotal(), varSpent(), Math.max(0, jarTotal()-varSpent()), t('used'), t('leftof').toLowerCase());",
    "    strip('s3', t('laneVar'), jarTotal(), varSpent(), Math.max(0, jarTotal()-varSpent()), t('used'), t('leftof').toLowerCase()) +\n    (upT>0 ? `<button class=\"js s4\" data-lane=\"up\"><i></i><span class=\"n\">${t('upshort')}</span><span class=\"m\">${upList().filter(e=>e.month===MKEY).map(e=>upName(e)).slice(0,2).join(', ')}</span><span class=\"a todo\">${inr(upT)}</span></button>` : '');")
rep(".jh .js.s1 i{background:#1C5A36}.jh .js.s2 i{background:#B9841A}.jh .js.s3 i{background:#2C5A8A}", ".jh .js.s1 i{background:#1C5A36}.jh .js.s2 i{background:#B9841A}.jh .js.s3 i{background:#2C5A8A}.jh .js.s4 .n{color:#B9841A}")
# bahi
rep("  const babTodo = Math.max(0, babPl0 - babDn0), fixTodo = Math.max(0, fixPl0 - fixDn0);\n  const free = left - babTodo - fixTodo;\n  const recv = inflowTotal(), hand = recv - X.out, toCome0 = Math.max(0, plan.income - recv);\n  const dt = new Date(now.getFullYear(), now.getMonth(), TODAY);\n  if(hero.dataset.built!=='b')",
    "  const babTodo = Math.max(0, babPl0 - babDn0), fixTodo = Math.max(0, fixPl0 - fixDn0), upT = upThisMonth();\n  const free = left - babTodo - fixTodo - upT;\n  const recv = inflowTotal(), hand = recv - X.out, toCome0 = Math.max(0, plan.income - recv);\n  const dt = new Date(now.getFullYear(), now.getMonth(), TODAY);\n  if(hero.dataset.built!=='b')")
rep("row('var', t('laneVar'), varSpent(), Math.max(0, jarTotal()-varSpent()));", "row('var', t('laneVar'), varSpent(), Math.max(0, jarTotal()-varSpent())) + (upT>0 ? row('up', t('upshort'), 0, upT) : '');")
# book: tag + day totals + filter chip
rep("${r.cat==='var'?'':`<span class=\"tag ${r.cat}\">${r.cat==='in'?t('moneyin'):r.cat==='prov'?t('pot'):r.cat==='bab'?t('babshort'):t('fixed')}</span>`}",
    "${r.cat==='var'?'':`<span class=\"tag ${r.cat}\">${r.cat==='in'?t('moneyin'):r.cat==='prov'?t('pot'):r.cat==='bab'?t('babshort'):r.cat==='up'?t('upshort'):t('fixed')}</span>`}")
rep("const tot = byDay[d].filter(r=>r.cat!=='in' && r.cat!=='prov').reduce((a,r)=>a+r.amt,0), inc = byDay[d].filter(r=>r.cat==='in').reduce((a,r)=>a+r.amt,0);",
    "const tot = byDay[d].filter(r=>r.cat!=='in' && r.cat!=='prov' && r.cat!=='up').reduce((a,r)=>a+r.amt,0), inc = byDay[d].filter(r=>r.cat==='in').reduce((a,r)=>a+r.amt,0), upD = byDay[d].filter(r=>r.cat==='up').reduce((a,r)=>a+r.amt,0);")
rep("const totTxt = ((tot===0 && inc>0) ? `<span style=\"color:var(--green)\">+${inr(inc)}</span>` : (tot===0 && potT>0 ? '' : inr(tot))) + (potT>0 ? ` <span style=\"font-size:12px\">${tot>0?'· ':''}${inr(potT)} ${t('pot')}</span>` : '');",
    "const totTxt = ((tot===0 && inc>0) ? `<span style=\"color:var(--green)\">+${inr(inc)}</span>` : (tot===0 && (potT>0||upD>0) ? '' : inr(tot))) + (potT>0 ? ` <span style=\"font-size:12px\">${tot>0?'· ':''}${inr(potT)} ${t('pot')}</span>` : '') + (upD>0 ? ` <span style=\"font-size:12px;color:var(--orange)\">${tot>0||potT>0?'· ':''}${inr(upD)} ${t('upshort')}</span>` : '');")
rep("const fs = [['all',t('allf')],['in',t('moneyin')],['bab',t('babshort')],['fix',t('fixed')],['var',t('variable')],['prov',t('pot')]];",
    "const fs = [['all',t('allf')],['in',t('moneyin')],['bab',t('babshort')],['fix',t('fixed')],['var',t('variable')],['prov',t('pot')],['up',t('upshort')]];")
# entryNameP for up
rep("  if(e.cat==='prov'){ const base = (e.catId===FEST_KEY", "  if(e.cat==='up'){ return upName(e); }\n  if(e.cat==='prov'){ const base = (e.catId===FEST_KEY")
# book: tapping an 'up' row opens upActions
rep("document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ const e = D.entries.find(x=>x.id===b.dataset.del); if(!e) return; entryActions(",
    "document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ const e = D.entries.find(x=>x.id===b.dataset.del); if(!e) return; if(e.cat==='up'){ upActions(Object.assign({month:D.key}, e)); return; } entryActions(")
# .tag.up style
rep(".tag.var{", ".tag.up{background:var(--orange-soft);color:var(--orange)}\n.tag.var{")
# strings
rep("munim:'मुनीम ने लिखा — ठीक है?',", "munim:'मुनीम ने लिखा — ठीक है?',upcoming:'आगे का खर्च',upshort:'आगे का',addup:'+ जोड़ें',uphint:'जो खर्च आगे आना तय है — शादी, फ़ीस, यात्रा। तारीख़ और रक़म लिखें; उस महीने की बही में दिखेगा और \"सच में बचा\" से घटेगा। हो जाए तो दबाकर \"हो गया\" करें।',updone:'हो गया — आज लिखें',upwhen:'कब',upnote:'किस लिए',upnotehint:'जैसे: शादी, स्कूल फ़ीस, टिकट',upover:'तारीख़ निकल गई — हो गया?',futureSave:'आगे का — अभी नहीं गिना जाएगा',")
rep("munim:'Munim wrote this — OK?',", "munim:'Munim wrote this — OK?',upcoming:'Upcoming spends',upshort:'Upcoming',addup:'+ Add',uphint:'Spends you know are coming — a wedding, fees, tickets. Set the date and amount; it shows in that month\\'s book and is held back from \"Truly free\". When it happens, tap it → \"Done\".',updone:'Done — log it today',upwhen:'When',upnote:'For what',upnotehint:'e.g. wedding, school fee, tickets',upover:'Date passed — done?',futureSave:'upcoming — not counted yet',")
open(p,'w',encoding='utf-8').write(s)
m=re.findall(r'<script>(.*?)</script>',s,re.S); open('/tmp/claude-0/-home-claude/b3b786fe-2630-570a-811c-7efa4e555f1c/scratchpad/site/chk.js','w').write(max(m,key=len)); print('ok')
