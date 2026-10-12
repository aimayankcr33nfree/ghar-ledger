import re
p='/tmp/claude-0/-home-claude/b3b786fe-2630-570a-811c-7efa4e555f1c/scratchpad/site/index.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)>=1, 'MISSING: '+old[:100]
    s=s.replace(old,new,cnt)

# 1. fetch payments made this month for earlier months' kharcha (cash view)
rep("  try{ const u = await sb.from('entries').select('*').eq('cat','up').order('month').order('day'); if(!u.error) upcoming = (u.data||[]).map(r=>Object.assign(fromRow(r), {month:r.month})); }catch(e){}\n}",
    "  try{ const u = await sb.from('entries').select('*').eq('cat','up').order('month').order('day'); if(!u.error) upcoming = (u.data||[]).map(r=>Object.assign(fromRow(r), {month:r.month})); }catch(e){}\n"
    "  try{ const m0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime(); const l = await sb.from('entries').select('*').gte('ts', m0).lt('month', MKEY).neq('cat','up'); if(!l.error) latePaid = (l.data||[]).map(r=>Object.assign(fromRow(r), {month:r.month})); }catch(e){}\n}\n"
    "let latePaid = [];\nconst lateTotal = () => latePaid.reduce((a,e)=>a+e.amt,0);\nconst tsKey = e => { const d = new Date(e.ts||0); return d.getFullYear()+'-'+pad2(d.getMonth()+1); };")
# 2. hero: cash view subtracts late payments
rep("  const out = outSoFar(), left = plan.income - out, jl = jarTotal() - varSpent();",
    "  const out = outSoFar() + lateTotal(), left = plan.income - out, jl = jarTotal() - varSpent();")
rep("  if(upT>0) lanes.push(['up', t('upshort'), upT, 0, '', upT, t('topay'), 's4']);",
    "  if(upT>0) lanes.push(['up', t('upshort'), upT, 0, '', upT, t('topay'), 's4']);\n  if(lateTotal()>0) lanes.push(['late', t('lateshort'), lateTotal(), lateTotal(), t('paid'), 0, '', 's2']);")
rep("const tgt = {bab:'#bab-grid', fix:'#fix-list', var:'#jars', up:'#up-card'}[b.dataset.lane];", "const tgt = {bab:'#bab-grid', fix:'#fix-list', var:'#jars', up:'#up-card', late:'#fix-list'}[b.dataset.lane];", 3)
# jantri strip + bahi row
rep("    (upT>0 ? `<button class=\"js s4\" data-lane=\"up\">", "    (lateTotal()>0 ? `<button class=\"js s2\" data-lane=\"late\"><i style=\"width:100%\"></i><span class=\"n\">${t('lateshort')}</span><span class=\"m\">${latePaid.map(e=>entryNameP(e, plan)).slice(0,2).join(', ')}</span><span class=\"a ok\">${inr(lateTotal())} ✓</span></button>` : '') +\n    (upT>0 ? `<button class=\"js s4\" data-lane=\"up\">")
rep("+ (upT>0 ? row('up', t('upshort'), 0, upT) : '');", "+ (upT>0 ? row('up', t('upshort'), 0, upT) : '') + (lateTotal()>0 ? row('late', t('lateshort'), lateTotal(), 0) : '');")
# 3. Log flow: which month is this for? / when was it paid?
rep("  if(extra){ note = note ? note + ' · ' + extra : extra; label = label + ' · ' + extra; }\n  if(selDate > TODAY_D){ catId = cat + ':' + catId; cat = 'up'; if(!note) note = label; }\n  const newId = await addEntry({ts:Date.now(), month:mk, day:selDate.getDate(), cat, catId, amt:a, by:me, note, photo});",
    "  if(extra){ note = note ? note + ' · ' + extra : extra; label = label + ' · ' + extra; }\n  if(selDate > TODAY_D){ catId = cat + ':' + catId; cat = 'up'; if(!note) note = label; }\n"
    "  let ts = Date.now(), mkE = mk, dayE = selDate.getDate();\n"
    "  if(cat==='fix' && mk===MKEY && TODAY<=20){ // a monthly bill logged early in the month: is it last month's?\n"
    "    const pk = prevMonthKey(); const pc = viewCache[pk];\n"
    "    const prevUnpaid = !pc || pc.loading ? true : !(pc.paid && pc.paid[catId]) && !pc.entries.some(e=>e.cat==='fix' && e.catId===catId);\n"
    "    if(prevUnpaid && catId!=='fix'){ const w = await ask({title:t('whichmonth'), sub:`${label} · ${inr(a)}`, buttons:[{text:`${monthName(pk)} ${t('ka')}`, value:'prev'}, {text:`${monthName(MKEY)} ${t('ka')}`, value:'cur'}]}); if(!w) return; if(w==='prev'){ const [py,pm] = pk.split('-').map(Number); mkE = pk; dayE = Math.min(dayE, new Date(py, pm, 0).getDate()); } }\n  }\n"
    "  else if(mk < MKEY){ const w = await ask({title:t('whenpaid'), sub:`${label} · ${inr(a)} · ${shortDate(selDate.getDate(), selDate.getMonth())}`, buttons:[{text:t('paidthatday'), value:'then'}, {text:t('paidtoday'), value:'now'}]}); if(!w) return; if(w==='then'){ ts = new Date(selDate.getFullYear(), selDate.getMonth(), selDate.getDate(), 12).getTime(); } }\n"
    "  const newId = await addEntry({ts, month:mkE, day:dayE, cat, catId, amt:a, by:me, note, photo});\n  if(mkE!==MKEY){ delete viewCache[mkE]; }")
rep("  if(mk!==MKEY){ viewMonth = mk; delete viewCache[mk]; }\n  const shownLabel = label + (ago!==0 ? ' · ' + shortDate(selDate.getDate(), selDate.getMonth()) : '') + (cat==='up' ? ' · ' + t('upshort') : '');",
    "  if(mk!==MKEY){ viewMonth = mk; delete viewCache[mk]; }\n  const shownLabel = label + (ago!==0 ? ' · ' + shortDate(selDate.getDate(), selDate.getMonth()) : '') + (cat==='up' ? ' · ' + t('upshort') : '') + (mkE!==mk ? ' · ' + monthName(mkE) + ' ' + t('ka') : '');")
# 4. Book: live month shows late payments (grey, excluded from totals); past month rows paid later get a tag
rep("  (D.inflows||[]).forEach(x=>rows.push({day:x.day,cat:'in',name:x.note||t('moneyin'),amt:x.amt,by:x.by,ts:x.ts,inId:x.id}));",
    "  (D.inflows||[]).forEach(x=>rows.push({day:x.day,cat:'in',name:x.note||t('moneyin'),amt:x.amt,by:x.by,ts:x.ts,inId:x.id}));\n  if(D.live) latePaid.forEach(e=>{ const d = new Date(e.ts); rows.push({day:d.getDate(), cat:'late', name:entryNameP(e, plan) + ' · ' + monthName(e.month) + ' ' + t('ka'), amt:e.amt, by:e.by, ts:e.ts, id:e.id, lateOf:e.month}); });")
rep("rows = rows.filter(r=>bookF==='all'||r.cat===bookF);", "rows = rows.filter(r=>bookF==='all'||r.cat===bookF||(bookF==='fix'&&r.cat==='late'));")
rep("const tot = byDay[d].filter(r=>r.cat!=='in' && r.cat!=='prov' && r.cat!=='up').reduce((a,r)=>a+r.amt,0),", "const tot = byDay[d].filter(r=>r.cat!=='in' && r.cat!=='prov' && r.cat!=='up' && r.cat!=='late').reduce((a,r)=>a+r.amt,0),")
rep("${r.cat==='var'?'':`<span class=\"tag ${r.cat}\">${r.cat==='in'?t('moneyin'):r.cat==='prov'?t('pot'):r.cat==='bab'?t('babshort'):r.cat==='up'?t('upshort'):t('fixed')}</span>`}<div class=\"nm\">${r.name}</div>",
    "${r.cat==='var'?'':`<span class=\"tag ${r.cat}\">${r.cat==='in'?t('moneyin'):r.cat==='prov'?t('pot'):r.cat==='bab'?t('babshort'):r.cat==='up'?t('upshort'):r.cat==='late'?t('lateshort'):t('fixed')}</span>`}<div class=\"nm\">${r.name}${(r.ts && r.cat!=='late' && r.cat!=='in' && !D.live && tsKey({ts:r.ts})>D.key) ? ` <small style=\"color:var(--muted)\">· ${monthName(tsKey({ts:r.ts}))} ${t('paidin')}</small>` : ''}</div>")
# tapping a late row opens its actions
rep("document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ const e = D.entries.find(x=>x.id===b.dataset.del); if(!e) return;",
    "document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ let e = D.entries.find(x=>x.id===b.dataset.del); if(!e && D.live) e = latePaid.find(x=>x.id===b.dataset.del); if(!e) return;")
rep(".tag.up{background:var(--orange-soft);color:var(--orange)}", ".tag.up{background:var(--orange-soft);color:var(--orange)}\n.tag.late{background:var(--soft2);color:var(--muted)}")
# after add/delete, refresh late list (pullEntries already refreshes); delEntry remove locally
rep("    await pullBab(); upcoming = upcoming.filter(x=>x.id!==id);", "    await pullBab(); upcoming = upcoming.filter(x=>x.id!==id); latePaid = latePaid.filter(x=>x.id!==id);")
# 5. strings
rep("munim:'मुनीम ने लिखा — ठीक है?',", "munim:'मुनीम ने लिखा — ठीक है?',lateshort:'पिछला बकाया',whichmonth:'यह किस महीने का खर्च है?',ka:'का',whenpaid:'पैसे कब दिए?',paidthatday:'उसी दिन दिए थे',paidtoday:'आज दिए',paidin:'में दिया',")
rep("munim:'Munim wrote this — OK?',", "munim:'Munim wrote this — OK?',lateshort:'Last month\\'s dues',whichmonth:'Which month is this for?',ka:'',whenpaid:'When was it paid?',paidthatday:'On that day',paidtoday:'Today',paidin:'paid in',")
rep("const BUILD = '12.10.1100';", "const BUILD = '12.10.1130';")
open(p,'w',encoding='utf-8').write(s)
m=re.findall(r'<script>(.*?)</script>',s,re.S); open('/tmp/claude-0/-home-claude/b3b786fe-2630-570a-811c-7efa4e555f1c/scratchpad/site/chk.js','w').write(max(m,key=len)); print('ok')
