import re
p='/tmp/claude-0/-home-claude/b3b786fe-2630-570a-811c-7efa4e555f1c/scratchpad/site/index.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)>=1, 'MISSING: '+old[:100]
    s=s.replace(old,new,cnt)

# 1. groups + guessing + migration v15
rep("const PLAN_VERSION = 14;", """const PLAN_VERSION = 15;
const GROUPS = [
  {id:'home',    hi:'घर',        en:'Home',        ic:'🏠'},
  {id:'help',    hi:'सहायक',      en:'Helpers',     ic:'🧹'},
  {id:'kids',    hi:'बच्चे',      en:'Kids',        ic:'🎒'},
  {id:'kitchen', hi:'रसोई',       en:'Kitchen',     ic:'🍲'},
  {id:'vehicle', hi:'गाड़ी',      en:'Vehicle',     ic:'🛵'},
  {id:'health',  hi:'सेहत',       en:'Health',      ic:'💊'},
  {id:'emi',     hi:'EMI / कर्ज़', en:'EMI / loans', ic:'🏦'},
  {id:'other',   hi:'अन्य',       en:'Other',       ic:'•'} ];
const GRP_KW = {
  home:['society','rent','kiraya','किराया','सोसाइटी','bijli','electric','बिजली','pani','water','पानी','gas','गैस','wifi','internet','broadband','dth','tata sky','jio','airtel','phone','mobile','recharge','रिचार्ज','maintenance','मेंटेनेंस','newspaper','अख़बार','akhbar'],
  help:['milk','दूध','doodh','maid','amma','अम्मा','kaam','काम वाली','kuda','कूड़','kude','sweeper','driver','ड्राइवर','press','प्रेस','istri','इस्त्री','cook','खाना बनाने','mali','माली','guard'],
  kids:['school','स्कूल','fee','फ़ीस','फीस','tuition','ट्यूशन','coaching','कोचिंग','class','क्लास','bus','van','वैन','kids','बच्च','stationery','स्टेशनरी','copy','कॉपी','book','किताब','uniform','skating','dance','swimming','karate','music'],
  kitchen:['grocery','किराना','kirana','ration','राशन','veg','sabji','सब्ज़ी','सब्जी','fruit','फल','paneer','पनीर','dairy','atta','आटा','oil','तेल','cylinder','सिलेंडर','water can','bisleri','bakery','bread','egg','अंडे','meat','chicken','masala','मसाला','dry fruit'],
  vehicle:['petrol','पेट्रोल','diesel','डीज़ल','cng','car','गाड़ी','bike','scooty','scooter','service','सर्विस','insurance car','parking','toll','fastag','puncture','tyre'],
  health:['med','दवा','dawa','medicine','doctor','डॉक्टर','hospital','अस्पताल','clinic','gym','जिम','yoga','health','insurance','बीमा','lab','test','चश्मा','dentist'],
  emi:['emi','ईएमआई','loan','लोन','कर्ज़','karz','credit card','क्रेडिट','instalment','किस्त','kist','chit','committee','कमेटी','lic','sip home'] };
function guessGrp(x){ const txt = ((x.id||'')+' '+(x.name||'')+' '+(x.hi||'')).toLowerCase(); for(const g of ['help','kids','emi','vehicle','health','kitchen','home']){ if(GRP_KW[g].some(k=>txt.includes(k))) return g; } return 'other'; }
function grpOf(x){ return x.grp || guessGrp(x); }
function gname(id){ const g = GROUPS.find(x=>x.id===id) || GROUPS[GROUPS.length-1]; return (lang==='hi' ? g.hi : g.en); }
function gicon(id){ const g = GROUPS.find(x=>x.id===id); return g ? g.ic : '•'; }""")
rep("  if(v <= 13){ plan.provCarry = {}; }", "  if(v <= 14){ plan.fixed.forEach(f=>{ if(!f.grp) f.grp = (plan.helpers||[]).some(h=>h.fixedId===f.id) ? 'help' : guessGrp(f); }); plan.jars.forEach(j=>{ if(!j.grp) j.grp = guessGrp(j); }); }\n  if(v <= 13){ plan.provCarry = {}; }")

# 2. fixed section: grouped blocks, helpers inside
rep('''    <div class="card list" id="fix-list"></div>
    <button class="a" id="fix-toggle" style="align-self:center"></button>
  </div>
''', '''    <div class="gblks" id="fix-list"></div>
    <button class="a" id="fix-toggle" style="align-self:center"></button>
  </div>
''')
rep('''  <div class="sec" id="help-sec">
    <div class="sec-h"><div class="t" data-i="helpers"></div><div class="tt num" id="tt-help"></div></div>
    <div class="card list" id="help-card"></div>
  </div>
''', '')
old_fix = s[s.index("  // fixed\n  const rows = plan.fixed.filter(f=> showAllFixed"):s.index("  renderHelpers(); renderGullak(); renderStreak();")]
new_fix = r'''  // fixed — grouped
  const helperIds = new Set((plan.helpers||[]).map(h=>h.fixedId));
  const rows = plan.fixed.filter(f=> !helperIds.has(f.id) && (showAllFixed || paid[f.id] || f.due>0 || (f.kind==='rec' && itemSpent(f.id)>0)));
  document.getElementById('fix-toggle').textContent = showAllFixed ? t('showless') : t('showall') + ' (' + plan.fixed.filter(f=>!helperIds.has(f.id)).length + ')';
  const rowHtml = f => {
    if(f.kind==='rec'){ const sp = itemSpent(f.id), full = f.amt>0 && sp>=f.amt, over = f.amt>0 && sp>f.amt;
      return `<button class="row44" data-rec="${f.id}"><div class="box ${full?'on':''}">${CHECK}</div><div class="nm">${nm(f)}</div><div class="amt" ${over?'style="color:var(--orange)"':''}>${fmt(sp)}<span style="color:var(--muted);font-weight:500"> / ${f.amt?fmt(f.amt):'—'}</span></div><div class="dt">${t('rec')}</div></button>`; }
    const p = paid[f.id]; const hot = !p && f.due>0 && f.due<=TODAY;
    const dt = p ? `${t('paid')}<br>${shortDate(p.day)}` : (f.due>0 ? `${t('due')}<br>${shortDate(f.due)}` : (f.kind==='rec'?t('rec'):''));
    return `<button class="row44 ${p?'on':''}" data-fix="${f.id}"><div class="box ${p?'on':''} ${hot?'hot':''} ${lastPop===f.id?'pop':''}">${CHECK}</div><div class="nm">${nm(f)}</div><div class="amt">${p?fmt(p.amt):(f.amt?fmt(f.amt):'—')}</div><div class="dt ${hot?'hot':p?'ok':''}">${dt}</div></button>`; };
  const gDone = g => plan.fixed.filter(f=>grpOf(f)===g).reduce((a,f)=>a + (helperIds.has(f.id) ? (paid[f.id] ? paid[f.id].amt : 0) : (f.kind==='rec' ? itemSpent(f.id) : (paid[f.id] ? paid[f.id].amt : 0))), 0) + entries.filter(e=>e.cat==='fix' && !plan.fixed.find(f=>f.id===e.catId) && g==='other').reduce((a,e)=>a+e.amt,0);
  const gPlan = g => plan.fixed.filter(f=>grpOf(f)===g).reduce((a,f)=>a + (helperIds.has(f.id) ? hAmt((plan.helpers||[]).find(h=>h.fixedId===f.id)||{}) : (f.amt||0)), 0);
  const blocks = GROUPS.map(G=>{
    const grows = G.id==='help' ? (plan.helpers||[]) : rows.filter(f=>grpOf(f)===G.id);
    if(!grows.length) return '';
    const col = gcol.has(G.id);
    return `<div class="gblk"><button class="gh" data-g="${G.id}"><span class="gi">${G.ic}</span><b>${G.id==='help'?t('helpers'):gname(G.id)}</b><span class="gs"><b class="num">${inr(gDone(G.id))}</b> / ${inr(gPlan(G.id))}</span><span class="chev">${col?'›':'⌄'}</span></button>${col?'':(G.id==='help' ? `<div class="card list" id="help-card"></div>` : `<div class="card list">${grows.map(rowHtml).join('')}</div>`)}</div>`;
  }).join('');
  document.getElementById('fix-list').innerHTML = blocks || `<div class="hint" style="padding:14px 0">${t('none')}</div>`;
  document.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{ const g = b.dataset.g; if(gcol.has(g)) gcol.delete(g); else gcol.add(g); try{ localStorage.setItem('gl-gcol', JSON.stringify(Array.from(gcol))); }catch(e){} buzz(4); renderHome(); });
  document.querySelectorAll('[data-fix]').forEach(el=>el.onclick=()=>togglePaid(el.dataset.fix));
  document.querySelectorAll('[data-rec]').forEach(el=>el.onclick=()=>{ quickPick(el.dataset.rec); go('log'); });
'''
s = s.replace(old_fix, new_fix)
rep("let showAllFixed = false;", "let showAllFixed = false;\nlet gcol = new Set(); try{ gcol = new Set(JSON.parse(localStorage.getItem('gl-gcol')||'[]')); }catch(e){}")
# helpers render into the moved card
rep("  const el = document.getElementById('help-card'); const hs = document.getElementById('help-sec'); if(hs) hs.style.display = H.length?'':'none'; if(!H.length){ el.innerHTML=''; document.getElementById('tt-help').textContent=''; return; }",
    "  const el = document.getElementById('help-card'); if(!el) return; if(!H.length){ el.innerHTML=''; return; }")
rep("  document.getElementById('tt-help').textContent = inr(tot);\n  el.querySelectorAll('[data-help]')", "  el.querySelectorAll('[data-help]')")
# CSS for group blocks
rep("/* page tear */", """/* fixed groups */
.gblks{display:flex;flex-direction:column;gap:10px}
.gblk{display:flex;flex-direction:column;gap:6px}
.gh{display:flex;align-items:center;gap:8px;min-height:36px;padding:0 4px;width:100%;text-align:left;font-size:14px;color:var(--ink)}
.gh .gi{width:26px;height:26px;border-radius:8px;background:var(--soft);display:flex;align-items:center;justify-content:center;font-size:14px;flex:none}
.gh b{font-weight:700;flex:1}
.gh .gs{font-size:12.5px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.gh .gs b{color:var(--ink)}
.gh .chev{color:var(--muted);width:16px;text-align:center}
html.elder .gh{font-size:17px;min-height:44px}
/* where it went */
.where{display:flex;flex-direction:column;gap:8px;padding:14px}
.where .h{display:flex;justify-content:space-between;align-items:baseline;font-weight:700;font-size:15px}
.where .h small{color:var(--muted);font-weight:500;font-size:12.5px}
.where .wr{display:grid;grid-template-columns:26px 1fr 72px 44px;align-items:center;gap:8px;font-size:14px}
.where .wr .bar{height:8px;border-radius:4px;background:var(--soft2);overflow:hidden}
.where .wr .bar i{display:block;height:100%;background:var(--blue);border-radius:4px}
.where .wr .amt{text-align:right;font-variant-numeric:tabular-nums;font-weight:700}
.where .wr .pc{text-align:right;color:var(--muted);font-size:12.5px;font-variant-numeric:tabular-nums}
.where .wr .nmw{display:flex;flex-direction:column;gap:3px;min-width:0}
.where .wr .nmw span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* page tear */""")

# 3. Hisaab: where it went, by group (fixed + jars + helpers)
rep('  <div class="card review" id="score-card" style="padding:14px"></div>\n  <button class="rcbtn" id="rc-btn"></button>',
    '  <div class="card review" id="score-card" style="padding:14px"></div>\n  <div class="card where" id="where"></div>\n  <button class="rcbtn" id="rc-btn"></button>')
rep("  renderWeek(D); renderScore(D); document.getElementById('rc-btn').innerHTML",
    "  renderWeek(D); renderScore(D); renderWhere(D); document.getElementById('rc-btn').innerHTML")
rep("function renderWeek(D){", r'''function renderWhere(D){
  const el = document.getElementById('where'); if(!el) return;
  const P = D.plan, E = D.entries; const sum = {};
  const add = (g, a) => { sum[g] = (sum[g]||0) + a; };
  P.fixed.forEach(f=>{ const g = grpOf(f); const pd = D.paid[f.id] ? D.paid[f.id].amt : 0; add(g, pd + E.filter(e=>e.cat==='fix' && e.catId===f.id).reduce((a,e)=>a+e.amt,0)); });
  E.filter(e=>e.cat==='fix' && !P.fixed.find(f=>f.id===e.catId)).forEach(e=>add('other', e.amt));
  P.jars.forEach(j=>add(grpOf(j), E.filter(e=>jarMatch(e,j.id)).reduce((a,e)=>a+e.amt,0)));
  const tot = Object.values(sum).reduce((a,b)=>a+b,0);
  const rows = GROUPS.map(G=>({g:G.id, a:sum[G.id]||0})).filter(x=>x.a>0).sort((a,b)=>b.a-a.a);
  const prevKey = shiftMonth(D.key, -1), pv = viewCache[prevKey];
  const prevSum = {}; if(pv && !pv.loading){ pv.plan.fixed.forEach(f=>{ const g = grpOf(f); prevSum[g] = (prevSum[g]||0) + (pv.paid[f.id]?pv.paid[f.id].amt:0) + pv.entries.filter(e=>e.cat==='fix'&&e.catId===f.id).reduce((a,e)=>a+e.amt,0); }); pv.plan.jars.forEach(j=>{ const g = grpOf(j); prevSum[g] = (prevSum[g]||0) + pv.entries.filter(e=>jarMatch(e,j.id)).reduce((a,e)=>a+e.amt,0); }); }
  el.style.display = rows.length ? '' : 'none';
  el.innerHTML = `<div class="h"><span>${t('where')}</span><small>${t('fixed')} + ${t('variable')} · ${inr(tot)}</small></div>` + rows.map(r=>{ const pc = tot ? Math.round(r.a/tot*100) : 0; const pr = prevSum[r.g]; const diff = pr!=null && pr>0 ? r.a - pr : null;
    return `<div class="wr"><span class="gi" style="font-size:16px;text-align:center">${gicon(r.g)}</span><div class="nmw"><span>${r.g==='help'?t('helpers'):gname(r.g)}${diff!==null ? ` <small style="color:${diff>0?'var(--orange)':'var(--green)'}">${diff>0?'▲':'▼'} ${inr(Math.abs(diff))}</small>` : ''}</span><div class="bar"><i style="width:${pc}%"></i></div></div><span class="amt">${inr(r.a)}</span><span class="pc">${pc}%</span></div>`; }).join('');
}
function renderWeek(D){''')

# 4. settings: group pickers for fixed items and jars
rep("document.getElementById('f-fixed').innerHTML = plan.fixed.map((f,i)=>`<div class=\"field\"><input class=\"txt\" id=\"in-fn${i}\" value=\"${nm(f)}\" aria-label=\"${t('name')}\"><input class=\"sm\" id=\"in-fd${i}\" inputmode=\"numeric\" value=\"${f.due||''}\" placeholder=\"${t('duedate')}\" aria-label=\"${t('duedate')}\"><input id=\"in-fa${i}\" inputmode=\"numeric\" value=\"${f.amt||''}\" aria-label=\"${t('amount')}\"></div>`).join('');",
    "const gsel = (id, cur) => `<select id=\"${id}\" class=\"gsel\" aria-label=\"${t('group')}\">${GROUPS.map(G=>`<option value=\"${G.id}\" ${cur===G.id?'selected':''}>${G.ic} ${G.id==='help'?t('helpers'):gname(G.id)}</option>`).join('')}</select>`;\n  document.getElementById('f-fixed').innerHTML = plan.fixed.map((f,i)=>`<div class=\"field\"><input class=\"txt\" id=\"in-fn${i}\" value=\"${nm(f)}\" aria-label=\"${t('name')}\"><input class=\"sm\" id=\"in-fd${i}\" inputmode=\"numeric\" value=\"${f.due||''}\" placeholder=\"${t('duedate')}\" aria-label=\"${t('duedate')}\"><input id=\"in-fa${i}\" inputmode=\"numeric\" value=\"${f.amt||''}\" aria-label=\"${t('amount')}\"></div><div class=\"field gfield\">${gsel('in-fg'+i, grpOf(f))}</div>`).join('');")
rep("document.getElementById('f-jars').innerHTML = plan.jars.map((j,i)=>fld(nm(j),'in-jar'+i,j.plan)).join('');",
    "document.getElementById('f-jars').innerHTML = plan.jars.map((j,i)=>fld(nm(j),'in-jar'+i,j.plan) + `<div class=\"field gfield\">${gsel('in-jg'+i, grpOf(j))}</div>`).join('');")
rep("  plan.fixed.forEach((f,i)=>{ const n = document.getElementById('in-fn'+i).value; if(lang==='hi') f.hi=n; else f.name=n; f.due=v('in-fd'+i); f.amt=v('in-fa'+i); });\n  plan.jars.forEach((j,i)=>j.plan=v('in-jar'+i));",
    "  plan.fixed.forEach((f,i)=>{ const n = document.getElementById('in-fn'+i).value; if(lang==='hi') f.hi=n; else f.name=n; f.due=v('in-fd'+i); f.amt=v('in-fa'+i); const g = document.getElementById('in-fg'+i); if(g) f.grp = g.value; });\n  plan.jars.forEach((j,i)=>{ j.plan=v('in-jar'+i); const g = document.getElementById('in-jg'+i); if(g) j.grp = g.value; });")
rep(".field input[type=date]{", ".field.gfield{margin-top:-6px;padding-top:0}\n.gsel{width:100%;min-height:40px;border:1.5px solid var(--line);border-radius:10px;background:var(--card);padding:0 10px;font-size:14px;color:var(--ink2)}\n.field input[type=date]{")
# new fixed item defaults to a guessed group
rep("plan.fixed.push({id:'f'+Date.now(), name:n, hi:n, amt:0, due:0, kind:'once'}); renderSettings();", "plan.fixed.push({id:'f'+Date.now(), name:n, hi:n, amt:0, due:0, kind:'once', grp:guessGrp({name:n})}); renderSettings();")

# 5. strings
rep("munim:'मुनीम ने लिखा — ठीक है?',", "munim:'मुनीम ने लिखा — ठीक है?',where:'कहाँ गया',group:'समूह',")
rep("munim:'Munim wrote this — OK?',", "munim:'Munim wrote this — OK?',where:'Where it went',group:'Group',")
rep("const BUILD = '12.10.0930';", "const BUILD = '12.10.1030';")
open(p,'w',encoding='utf-8').write(s)
m=re.findall(r'<script>(.*?)</script>',s,re.S); open('/tmp/claude-0/-home-claude/b3b786fe-2630-570a-811c-7efa4e555f1c/scratchpad/site/chk.js','w').write(max(m,key=len)); print('ok')
