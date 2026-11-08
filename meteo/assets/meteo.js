/* «Формула полёта. Авиационная метеорология» – общий код всех страниц направления.
   Хранилище: fp-theme (общий с основным сайтом), остальные ключи с префиксом fp-meteo-. */
(function(){
'use strict';
const FP = window.FP = {};
const root = document.documentElement;
root.classList.add('js');

/* ---------- хранилище ---------- */
FP.store = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} },
  json(k,def){ try { return JSON.parse(localStorage.getItem(k)) || def; } catch(e){ return def; } },
  put(k,o){ try { localStorage.setItem(k, JSON.stringify(o)); } catch(e){} }
};
/* тема: тёмная основная, светлая по выбору; ключ общий с основным сайтом */
if (FP.store.get('fp-theme') === 'light') root.dataset.theme = 'light';

/* ---------- физика МСА (ГОСТ 4401-81) ---------- */
const T0=288.15,P0=101325,L=0.0065,R=287.05287,G=9.80665,K=1.4,H11=11000,T11=216.65;
const N=G/(R*L), P11=P0*Math.pow(T11/T0,N);
FP.ISA = {T0,P0,L,R,G,K,H11,T11,N,P11, RHO0:P0/(R*T0), A0:Math.sqrt(K*R*T0), FT:0.3048, KT:0.514444,
  T:H=>H<=H11?T0-L*H:T11,
  P:H=>H<=H11?P0*Math.pow(1-L*H/T0,N):P11*Math.exp(-G*(H-H11)/(R*T11)),
  Hp:p=>p>=P11?T0/L*(1-Math.pow(p/P0,1/N)):H11+R*T11/G*Math.log(P11/p)};
FP.ISA.RHO = H=>FP.ISA.P(H)/(R*FP.ISA.T(H));
FP.invert = (fn,target,lo,hi)=>{for(let i=0;i<80;i++){const m=(lo+hi)/2;if(fn(m)>target)lo=m;else hi=m}return (lo+hi)/2};
FP.ISA.Hdens = rho=>FP.invert(FP.ISA.RHO,rho,-3000,20000);
FP.ISA.CAS = (M,p)=>{const qc=p*(Math.pow(1+0.2*M*M,3.5)-1);return FP.ISA.A0*Math.sqrt(5*(Math.pow(qc/P0+1,2/7)-1))};

/* ---------- формат чисел ---------- */
const nf={};
FP.f=(x,d=0)=>{nf[d]=nf[d]||new Intl.NumberFormat('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});return nf[d].format(x).replace('-','−')};
FP.sg=(x,d=0)=>(x>0?'+':'')+FP.f(x,d);
FP.fl=m=>'FL'+String(Math.max(0,Math.round(m/0.3048/100))).padStart(3,'0');
FP.ro=(cls,l,v,s='')=>`<div class="ro glass ${cls}"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
FP.$=(sel,el=document)=>el.querySelector(sel);

/* ---------- MathJax ---------- */
FP.typeset = el=>{ if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([el]).catch(()=>{}); };

/* ---------- логотип «Формула полёта» (лаймово-белый вариант) ---------- */
let logoN=0;
FP.logo = ()=>{const id='lg'+(++logoN);return `<svg role="img" aria-label="Логотип «Формула полёта»" xmlns="http://www.w3.org/2000/svg" viewBox="36 70 536 536"><defs><linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="currentColor" stop-opacity="0"/><stop offset=".3" stop-color="currentColor"/><stop offset="1" stop-color="currentColor"/></linearGradient></defs><path d="M 495.5 225.0 A 214 214 0 0 1 141.0 455.2" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round"/><path d="M 96.5 378.1 A 214 214 0 0 1 407.0 126.7" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round"/><g transform="translate(300 312) scale(.8) translate(-305 -326)"><path d="M 70 500 C 118 352, 250 252, 540 150 C 504 214, 466 256, 378 280 C 244 316, 128 380, 70 500 Z" fill="currentColor"/><path d="M 80 504 C 150 404, 268 330, 474 268 C 440 332, 396 368, 306 386 C 206 406, 124 444, 80 504 Z" fill="var(--lime-line)"/></g><path d="M 60 566 C 150 520, 250 430, 330 346 C 400 272, 470 210, 526 152" fill="none" stroke="url(#${id})" stroke-width="7" stroke-linecap="round"/><path d="M 52 0 C 48 -4, 40 -6, 30 -6 L 6 -6 L -14 -42 L -25 -42 L -12 -6 L -36 -6 L -46 -21 L -54 -21 L -48 -4 L -51 0 L -48 4 L -54 21 L -46 21 L -36 6 L -12 6 L -25 42 L -14 42 L 6 6 L 30 6 C 40 6, 48 4, 52 0 Z" fill="var(--lime-line)" transform="translate(532 146) rotate(-46) scale(0.55)"/></svg>`};
FP.brand = (href)=>`<a class="logo" href="${href}">${FP.logo()}<span><b>Формула полёта</b><small>Авиационная метеорология</small></span></a>`;

/* ---------- каркас страницы: фон, верхняя панель, плашка, подвал ---------- */
FP.chrome = ()=>{
  document.body.insertAdjacentHTML('afterbegin','<div class="fp-bg" aria-hidden="true"><i></i><i></i><i></i><b></b></div>');
  document.body.insertAdjacentHTML('beforeend',`
<div class="topbar" role="toolbar" aria-label="Вид страницы">
  <button class="pill lec" id="lecBtn" type="button" aria-pressed="false" title="Крупный шрифт, без меню и служебной информации"><svg class="scr" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg><svg class="x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg><span>Режим лекции</span></button>
  <button class="pill theme-sw" id="themeBtn" type="button" aria-label="Сменить оформление: светлое или тёмное" title="Сменить оформление"></button>
</div>
<div class="alpha" role="note">АЛЬФА версия 1</div>`);
  FP.$('#themeBtn').onclick=()=>{const l=root.dataset.theme!=='light';if(l)root.dataset.theme='light';else delete root.dataset.theme;FP.store.set('fp-theme',l?'light':'dark');document.dispatchEvent(new Event('fp-theme'))};
  let t; const lb=FP.$('#lecBtn');
  lb.onclick=()=>{const on=root.classList.toggle('lecture');lb.setAttribute('aria-pressed',on);lb.classList.remove('mini');clearTimeout(t);if(on)t=setTimeout(()=>lb.classList.add('mini'),3000)};
  FP.reveal(document);
};
FP.reveal = el=>{
  const items=el.querySelectorAll('.rv:not(.in)');
  if(!('IntersectionObserver' in window)){items.forEach(x=>x.classList.add('in'));return}
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
  items.forEach(x=>io.observe(x));
};
FP.footer = ()=>`<footer class="foot">
  <div class="row"><b style="color:var(--ink);font-family:var(--f-brand);font-size:.85rem">Формула полёта</b><span>Авиационная метеорология</span><span style="margin-left:auto">© 2026 М.&nbsp;Д.&nbsp;Назаркин</span></div>
  <details><summary>Правовая информация</summary>
  <p><b>О назначении тренажёра.</b> «Формула полёта. Авиационная метеорология» – вспомогательное учебное средство для самостоятельной работы обучающихся и для методической поддержки преподавателей. Оно не заменяет учебную литературу, лекции и практические занятия.</p>
  <p>Примеры из лётной практики, включая сведения о самолёте DA&nbsp;40&nbsp;NG и воздушных судах с высокой степенью автоматизации, приведены в иллюстративных целях и не являются эксплуатационной документацией. При подготовке и выполнении полётов используются только руководство по лётной эксплуатации (AFM), сборники аэронавигационной информации и действующие нормативные документы.</p>
  <p><b>DA&nbsp;40&nbsp;NG.</b> Тренажёр не связан с компанией Diamond Aircraft Industries и не одобрен ею. Наименования типов воздушных судов приводятся только для их обозначения. Обращения правообладателей: Milleinelium@yandex.ru.</p>
  <p><b>Правовая информация.</b> © 2026 М.&nbsp;Д.&nbsp;Назаркин. Тексты, интерактивные модели, программный код и оформление тренажёра являются объектами авторских прав (ст.&nbsp;1259 ГК РФ); программа для ЭВМ охраняется как литературное произведение (ст.&nbsp;1261 ГК РФ). Исключительное право принадлежит Назаркину М.&nbsp;Д. (ст.&nbsp;1270 ГК РФ), знак охраны авторского права – ст.&nbsp;1271 ГК РФ. Цитирование в учебных и научных целях допускается с указанием автора и источника (ст.&nbsp;1274 ГК РФ). Иное использование – только с письменного согласия правообладателя.</p>
  <p><b>Авторы.</b> Назаркин Максим Дмитриевич – руководитель проекта, программный код и оформление. [ФИО] – научное содержание.</p>
  <p><b>Шрифты и сторонние компоненты.</b> Шрифты Unbounded, Cormorant Garamond, Golos Text и JetBrains Mono распространяются по лицензии SIL Open Font License 1.1. Формулы набраны с помощью MathJax (лицензия Apache 2.0).</p>
  <p><b>Рабочая программа дисциплины.</b> Содержание тренажёра соотнесено с рабочей программой дисциплины «Авиационная метеорология» образовательной программы 25.03.03 «Аэронавигация», направленность «Лётная эксплуатация гражданских воздушных судов».</p>
  <p><b>Статус тренажёра.</b> «Формула полёта» – инициативная разработка автора. Тренажёр не является официальным ресурсом университета.</p>
  <p><b>Связь с авторами.</b> Назаркин М.&nbsp;Д., Milleinelium@yandex.ru.</p>
  </details></footer>`;

/* ---------- графики ---------- */
FP.plot = (svg,o)=>{
  const W=340,Hh=270,ml=46,mr=14,mt=12,mb=36,pw=W-ml-mr,ph=Hh-mt-mb;
  const X=x=>ml+(x-o.x0)/(o.x1-o.x0)*pw,Y=y=>mt+ph-(y-o.y0)/(o.y1-o.y0)*ph;let s='';
  s+=`<defs><linearGradient id="${svg.id}g" x1="0" x2="1"><stop offset="0" stop-color="var(--lime)" stop-opacity="0"/><stop offset="1" stop-color="var(--lime)" stop-opacity=".2"/></linearGradient></defs>`;
  o.yt.forEach(y=>{s+=`<line x1="${ml}" x2="${ml+pw}" y1="${Y(y)}" y2="${Y(y)}" stroke="var(--line)"/><text x="${ml-6}" y="${Y(y)+3}" text-anchor="end">${FP.f(y)}</text>`});
  o.xt.forEach(x=>{s+=`<line y1="${mt}" y2="${mt+ph}" x1="${X(x)}" x2="${X(x)}" stroke="var(--line)" stroke-dasharray="2 3"/><text x="${X(x)}" y="${mt+ph+14}" text-anchor="middle">${FP.f(x)}</text>`});
  if(o.band) s+=`<rect x="${ml}" width="${pw}" y="${Y(o.band[1])}" height="${Y(o.band[0])-Y(o.band[1])}" fill="var(--lime-soft)"/><text x="${ml+pw-4}" y="${Y(o.band[1])-4}" text-anchor="end">${o.bandLabel||''}</text>`;
  if(o.fill){const p=o.series[0].pts;s+=`<path d="M${X(o.x0)} ${Y(p[0][1])}`+p.map(q=>`L${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join('')+`L${X(o.x0)} ${Y(p[p.length-1][1])}Z" fill="url(#${svg.id}g)"/>`}
  o.series.forEach(se=>{s+=`<path d="${se.pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join('')}" fill="none" stroke="${se.c}" stroke-width="2" ${se.dash?'stroke-dasharray="5 4"':''}/>`});
  if(o.hline!=null) s+=`<line x1="${ml}" x2="${ml+pw}" y1="${Y(o.hline)}" y2="${Y(o.hline)}" stroke="var(--ink)" stroke-opacity=".35"/>`;
  (o.marks||[]).forEach(m=>{s+=`<circle cx="${X(m[0])}" cy="${Y(m[1])}" r="5" fill="${m[2]}" stroke="var(--bg)" stroke-width="2"/>`});
  s+=`<text x="${ml+pw/2}" y="${Hh-4}" text-anchor="middle">${o.xl}</text><text x="12" y="${mt+ph/2}" text-anchor="middle" transform="rotate(-90 12 ${mt+ph/2})">${o.yl||'H, км'}</text>`;
  svg.innerHTML=s;
};

/* ---------- самопроверка: первый вариант в списке – верный ---------- */
FP.quiz = (host,secId,Q)=>{
  const key='fp-meteo-quiz-'+secId, saved=FP.store.json(key,{});
  const order=Q.map(()=>{const a=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a});
  host.innerHTML=`<div class="row" style="justify-content:space-between;max-width:84ch"><span class="note">Выберите один ответ. После выбора появится объяснение.</span><span class="chip" data-score></span></div>`+
    Q.map((q,i)=>`<div class="q glass" data-i="${i}"><p>${i+1}. ${q[0]}</p><div class="opts">${order[i].map(k=>`<button type="button" data-k="${k}">${q[1][k]}</button>`).join('')}</div><div class="fb" hidden></div></div>`).join('');
  const show=(qd,i,k)=>{qd.querySelectorAll('button').forEach(x=>{x.disabled=true;if(+x.dataset.k===0)x.classList.add('ok')});
    if(k!==0)qd.querySelector(`[data-k="${k}"]`).classList.add('bad');const fb=qd.querySelector('.fb');fb.hidden=false;fb.textContent=(k===0?'Верно. ':'Неверно. ')+Q[i][2]};
  const score=()=>{const v=Object.values(saved);host.querySelector('[data-score]').textContent=`${v.filter(x=>x===0).length} из ${Q.length}`};
  host.querySelectorAll('.q').forEach(qd=>{const i=+qd.dataset.i;if(i in saved)show(qd,i,saved[i])});
  host.addEventListener('click',e=>{const b=e.target.closest('.opts button');if(!b||b.disabled)return;const qd=b.closest('.q'),i=+qd.dataset.i,k=+b.dataset.k;saved[i]=k;FP.store.put(key,saved);show(qd,i,k);score()});
  score();
  return ()=>{FP.store.del(key)};
};

/* ---------- страница темы ----------
   cfg = {topic:'t1', n:1, title, sections:[{id,n,title,rpd,f,tabs:{theory,model,flight,quiz},mount:{model(el),flight(el)},quiz:[...]}]} */
const TAB_NAMES={theory:'Теория',model:'Модель',flight:'В полёте',quiz:'Проверь себя'};
FP.topic = cfg=>{
  const stKey='fp-meteo-state', state=FP.store.json(stKey,{}), visKey='fp-meteo-visited', visited=new Set(FP.store.json(visKey,[]));
  const app=document.createElement('div');app.className='app';
  app.innerHTML=`<aside class="side glass" aria-label="Разделы темы"><div class="side-head">${FP.brand('index.html')}<br><a class="back" href="../">← Формула полёта</a> &nbsp; <a class="back" href="index.html">Все темы</a></div>
    <div class="side-body"><p class="ttl">Раздел ${cfg.n}<b>${cfg.title}</b></p><ul class="snav" id="snav"></ul><p class="side-foot">© 2026 М.&nbsp;Д.&nbsp;Назаркин</p></div></aside>
    <main class="work"><div class="whead"><div><div class="kick" id="sKick"></div><h1 id="sTitle"></h1></div><div class="fbox glass" id="sF"></div></div>
    <p class="rpd" id="sRpd"></p><div id="views"></div><div class="pager" id="pager"></div>${FP.footer()}</main>`;
  document.body.appendChild(app);
  const views={}, secs=cfg.sections;
  function build(sec){
    const st=state[sec.id]||{}, v=document.createElement('div');v.className='sec-view';
    const tabs=Object.keys(sec.tabs);
    v.innerHTML=`<div class="row"><div class="tabs glass" role="tablist">${tabs.map(t=>`<button class="tab" role="tab" data-t="${t}" type="button">${TAB_NAMES[t]}</button>`).join('')}</div>${sec.mount&&(sec.mount.model||sec.mount.flight)?'<button class="reset" type="button">Сбросить параметры</button>':''}</div>`+
      tabs.map(t=>`<div class="pane" data-p="${t}">${sec.tabs[t]}</div>`).join('');
    // восстановить ползунки до запуска моделей
    v.querySelectorAll('input[type=range]').forEach(r=>{if(st[r.id]!=null)r.value=st[r.id]});
    v.addEventListener('input',e=>{if(e.target.type==='range'){(state[sec.id]=state[sec.id]||{})[e.target.id]=e.target.value;FP.store.put(stKey,state)}});
    const pick=t=>{v.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===t));v.querySelectorAll('.pane').forEach(p=>p.hidden=p.dataset.p!==t);(state[sec.id]=state[sec.id]||{}).tab=t;FP.store.put(stKey,state)};
    v.querySelector('.tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(b)pick(b.dataset.t)});
    pick(st.tab&&tabs.includes(st.tab)?st.tab:tabs[0]);
    let clearQuiz=null;
    if(sec.mount)Object.keys(sec.mount).forEach(t=>sec.mount[t](v.querySelector(`[data-p="${t}"]`)));
    if(sec.quiz)clearQuiz=FP.quiz(v.querySelector('[data-p="quiz"] .quiz-host'),sec.id,sec.quiz);
    const rb=v.querySelector('.reset');
    if(rb)rb.onclick=()=>{const tab=(state[sec.id]||{}).tab;state[sec.id]={tab};FP.store.put(stKey,state);v.remove();delete views[sec.id];show(sec.id)};
    FP.$('#views').appendChild(v);FP.typeset(v);
    return v;
  }
  function nav(cur){
    FP.$('#snav').innerHTML=secs.map(s=>`<li><a href="#${s.id}" ${s.id===cur?'aria-current="page"':''}><span class="num">${s.n}</span><span class="${s.stub?'soon':''}">${s.title}</span><span class="dot ${visited.has(s.id)?'done':''}"></span></a></li>`).join('');
  }
  function show(id){
    const sec=secs.find(s=>s.id===id)||secs[0];
    visited.add(sec.id);FP.store.put(visKey,[...visited]);
    Object.values(views).forEach(x=>x.hidden=true);
    if(!views[sec.id])views[sec.id]=build(sec);
    views[sec.id].hidden=false;
    FP.$('#sKick').textContent=`${sec.n} ${sec.short||sec.title}`;FP.$('#sTitle').innerHTML=sec.h1||sec.title;
    FP.$('#sRpd').textContent='По рабочей программе дисциплины: '+sec.rpd;
    const f=FP.$('#sF');f.hidden=!sec.f;f.innerHTML=sec.f||'';FP.typeset(f);
    nav(sec.id);
    const i=secs.indexOf(sec),pr=secs[i-1],nx=secs[i+1];
    FP.$('#pager').innerHTML=(pr?`<a class="btn" href="#${pr.id}">← ${pr.n} ${pr.title}</a>`:`<a class="btn" href="index.html">← Все темы</a>`)+(nx?`<a class="btn lime" href="#${nx.id}">${nx.n} ${nx.title} →</a>`:(cfg.next?`<a class="btn lime" href="${cfg.next[0]}">${cfg.next[1]} →</a>`:`<a class="btn lime" href="index.html">К списку тем →</a>`));
    window.scrollTo(0,0);
  }
  const route=()=>show(location.hash.slice(1)||secs[0].id);
  addEventListener('hashchange',route);route();
  document.addEventListener('fp-theme',()=>{Object.values(views).forEach(v=>v.dispatchEvent(new Event('rerender')))});
};
FP.slider=(id,label,min,max,step,val)=>`<div class="ctl"><div class="top"><label for="${id}">${label}</label><output id="o-${id}"></output></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
FP.vals=(el,ids)=>ids.map(i=>+el.querySelector('#'+i).value);
FP.out=(el,id,txt)=>{el.querySelector('#o-'+id).textContent=txt};
FP.bind=(el,fn)=>{el.addEventListener('input',e=>{if(e.target.type==='range')fn()});fn()};
})();
