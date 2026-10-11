// Ghar Kharch reminders → Telegram family group. Runs on GitHub Actions (see .github/workflows/reminders.yml).
// Needs: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_URL, SUPABASE_KEY. MODE = morning | evening | weekly | test
const { TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: CHAT, SUPABASE_URL: URL_, SUPABASE_KEY: KEY } = process.env;
const MODE = process.argv[2] || process.env.MODE || 'morning';
if(!TOKEN || !CHAT || !URL_ || !KEY){ console.error('missing secrets'); process.exit(1); }

// IST clock
const nowIST = new Date(Date.now() + 5.5*3600*1000);
const Y = nowIST.getUTCFullYear(), M = nowIST.getUTCMonth(), D = nowIST.getUTCDate();
const MKEY = `${Y}-${String(M+1).padStart(2,'0')}`;
const DIM = new Date(Date.UTC(Y, M+1, 0)).getUTCDate();
const MS = ['जन','फ़र','मार्च','अप्रै','मई','जून','जुला','अग','सित','अक्टू','नव','दिस'];
const inr = n => '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN');
const nm = o => o.hi || o.name;

async function sbGet(path){
  const r = await fetch(`${URL_}/rest/v1/${path}`, {headers:{apikey:KEY, Authorization:`Bearer ${KEY}`}});
  if(!r.ok) throw new Error('supabase ' + r.status + ' ' + await r.text());
  return r.json();
}
async function send(text){
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({chat_id: CHAT, text, parse_mode:'HTML', disable_web_page_preview:true})});
  const j = await r.json(); if(!j.ok) throw new Error('telegram ' + JSON.stringify(j)); console.log('sent', MODE);
}

const months = await sbGet(`months?id=eq.${MKEY}&select=data`);
const data = months[0] ? months[0].data : null;
if(!data){ console.log('no month row yet'); if(MODE==='test') await send('🏠 घर का हिसाब बॉट चालू है ✓'); process.exit(0); }
const plan = data.plan, paid = data.paid || {}, inflows = data.inflows || [];
const entries = await sbGet(`entries?month=eq.${MKEY}&select=*`);

const jarMatch = (e, id) => (e.cat==='var' && (e.cat_id===id || (id==='stat' && e.cat_id==='other'))) || (e.cat==='fix' && ((id==='deepak'&&e.cat_id==='deepak')||(id==='mandir'&&e.cat_id==='chalave')));
const jarSpent = id => entries.filter(e=>jarMatch(e,id)).reduce((a,e)=>a+e.amt,0);
const provTotal = plan.provisions.reduce((a,p)=>a+p.plan,0);
const babDone = (plan.emergency.done?plan.emergency.plan:0) + plan.sips.reduce((a,s)=>a+(s.done?s.plan:0),0) + plan.provisions.reduce((a,x)=>a+((x.done||plan.provDone)?x.plan:0),0);
const out = babDone + Object.values(paid).reduce((a,p)=>a+(p.amt||0),0) + entries.filter(e=>e.cat!=='var'||true).filter(e=>e.cat==='fix'||e.cat==='var'||e.cat==='bab').reduce((a,e)=>a+e.amt,0);
const left = plan.income - out;
const dueToday = plan.fixed.filter(f=>!paid[f.id] && f.due===D);
const overdue = plan.fixed.filter(f=>!paid[f.id] && f.due>0 && f.due<D);
const dueTomorrow = plan.fixed.filter(f=>!paid[f.id] && f.due===D+1);
const jl = plan.jars.reduce((a,j)=>a+j.plan,0) - plan.jars.reduce((a,j)=>a+jarSpent(j.id),0);
const daysLeft = DIM - D;
const perDay = daysLeft>0 ? Math.max(0,jl)/daysLeft : jl;
const reds = plan.jars.map(j=>({j, over: jarSpent(j.id)-j.plan})).filter(x=>x.over>0);
const todays = entries.filter(e=>e.day===D);

let text = '';
if(MODE==='morning'){
  const L = [`🏠 <b>सुप्रभात</b> · ${D} ${MS[M]} · ${daysLeft} दिन बाकी`];
  if(dueToday.length) L.push(`⏰ <b>आज देना है:</b> ` + dueToday.map(f=>`${nm(f)} ${f.amt?inr(f.amt):''}`).join(', '));
  if(overdue.length) L.push(`🔴 <b>बाकी रह गया:</b> ` + overdue.map(f=>`${nm(f)} (${f.due} ${MS[M]})`).join(', '));
  if(dueTomorrow.length) L.push(`📅 कल: ` + dueTomorrow.map(nm).join(', '));
  L.push(`🫙 रोज़ के लिए ${inr(jl)} बचा · <b>${inr(perDay)}/दिन</b>`);
  if(reds.length) L.push(`⚠ योजना से ऊपर: ` + reds.map(x=>`${nm(x.j)} +${inr(x.over)}`).join(', '));
  if(!dueToday.length && !overdue.length && !reds.length && MODE==='morning' && D!==1){ console.log('quiet morning, nothing due'); process.exit(0); }
  text = L.join('\n');
}
else if(MODE==='evening'){
  if(todays.length){ console.log('entries logged today:', todays.length); process.exit(0); }
  text = `🌙 <b>आज की एंट्री हो गई?</b>\nआज कुछ नहीं लिखा गया। सब्ज़ी, फल, दवा… जो भी लिया हो, + दबाकर लिख दें।\n👉 https://aimayankcr33nfree.github.io/ghar-ledger/`;
}
else if(MODE==='weekly'){
  const start = Math.max(1, D-6);
  const wk = entries.filter(e=>e.day>=start && e.day<=D);
  const wkVar = wk.filter(e=>e.cat==='var').reduce((a,e)=>a+e.amt,0);
  const perJar = plan.jars.map(j=>({n:nm(j), v: wk.filter(e=>jarMatch(e,j.id)).reduce((a,e)=>a+e.amt,0)})).sort((a,b)=>b.v-a.v).slice(0,3).filter(x=>x.v>0);
  const dueSoon = plan.fixed.filter(f=>!paid[f.id] && f.due>D && f.due<=D+7);
  const L = [`🏠 <b>हफ़्ते का हिसाब</b> · ${start}–${D} ${MS[M]}`, `रोज़ का खर्च: <b>${inr(wkVar)}</b>`];
  perJar.forEach(x=>L.push(`• ${x.n} ${inr(x.v)}`));
  if(reds.length) L.push(`⚠ योजना से ऊपर: ` + reds.map(x=>`${nm(x.j)} +${inr(x.over)}`).join(', '));
  if(overdue.length) L.push(`🔴 बाकी: ` + overdue.map(nm).join(', '));
  if(dueSoon.length) L.push(`📅 इस हफ़्ते देना है: ` + dueSoon.map(f=>`${nm(f)} ${f.due} ${MS[M]}`).join(', '));
  L.push(`इस महीने बचा है: <b>${inr(left)}</b>${left<0?' (−)':''}`);
  text = L.join('\n');
}
else { text = `🏠 घर का हिसाब बॉट चालू है ✓\n${D} ${MS[M]} · ${entries.length} एंट्री इस महीने · बचा ${inr(left)}`; }
await send(text);
