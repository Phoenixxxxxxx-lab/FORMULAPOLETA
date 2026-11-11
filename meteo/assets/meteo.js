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

/* ---------- темы по рабочей программе дисциплины (2 и 3 семестры) ---------- */
FP.TOPICS=[
 {sem:'2 семестр',items:[
  {n:1,t:'Введение в дисциплину. Состав и строение атмосферы',href:'t1.html',secs:[['1.1','Общие сведения','s11'],['1.2','Газовый состав','s12'],['1.3','Строение атмосферы','s13'],['1.4','Стандартная атмосфера','s14'],['1.5','Реальная атмосфера','s15']]},
  {n:2,t:'Физические характеристики атмосферы',href:'t2.html',secs:[['2.1','Параметры атмосферы','s21'],['2.2','Практика 01','s22'],['2.3','Измерения','s23'],['2.4','Влияние на полёт','s24'],['2.5','Барометрическая высота','s25'],['2.6','Барическое поле','s26'],['2.7','Практика 02','s27']]},
  {n:3,t:'Динамика атмосферы. Ветер и его влияние на полёт',plan:['характеристики ветра и его измерение','ветер на картах погоды','ветер в барических системах','изменение ветра с высотой','опасные явления, связанные с ветром']},
  {n:4,t:'Термодинамические процессы в атмосфере',plan:['адиабатические процессы','сухо- и влажноадиабатический градиенты','вертикальные движения воздуха','устойчивость атмосферы','температурно-ветровое зондирование']},
  {n:5,t:'Туманы, облака, осадки. Видимость',plan:['конденсация и сублимация','туманы и дымки','облака и их классификация','осадки','видимость, минимумы погоды']}]},
 {sem:'3 семестр',items:[
  {n:6,t:'Наблюдения за фактической погодой в аэропортах',plan:['метеорологические органы и наблюдения','MET REPORT и SPECIAL','METAR и SPECI','предупреждения по аэродрому и о сдвиге ветра']},
  {n:7,t:'Синоптические процессы. Карты погоды. Прогноз погоды. Авиационные прогнозы',plan:['воздушные массы и фронты','циклоны и антициклоны','приземные и высотные карты','авиационные прогнозы, GAMET']},
  {n:8,t:'Опасные для авиации явления погоды',plan:['турбулентность и болтанка','обледенение','грозы и микропорыв','статическое электричество','сдвиг ветра']},
  {n:9,t:'Основы метеорологического обеспечения полётов',plan:['принципы метеообеспечения','виды и источники метеоинформации','сроки и формы предоставления','автоматизированные системы']}]}];

/* боковая панель со всеми темами, как в тренажёре по аэродинамике.
   cur – номер открытой темы (0 – главная). На странице темы её подразделы заполняет FP.topic в #snav */
FP.side = (cur)=>{
  const top=cur?`<a class="back" href="index.html">← Главная метеорологии</a>`:`<a class="back" href="../">← Формула полёта</a>`;
  const item=tp=>{
    const on=tp.n===cur, ready=!!tp.href;
    const head=ready?`<a class="tp-h" href="${on?'#':tp.href}" data-intro><span class="tn">${tp.n}</span><span class="tt">${tp.t}</span></a>`
                    :`<div class="tp-h"><span class="tn">${tp.n}</span><span class="tt">${tp.t}</span></div>`;
    let body='';
    if(on) body='<ul class="snav" id="snav"></ul>';
    else if(ready&&!cur) body=`<ul class="snav sub">${tp.secs.map(x=>`<li><a href="${tp.href}#${x[2]}" data-intro><span class="num">${x[0]}</span><span>${x[1]}</span><span class="dot"></span></a></li>`).join('')}</ul>`;
    else if(!ready) body='<span class="soon-tag">в разработке</span>';
    return `<div class="tp ${on?'cur':''} ${ready?'':'off'}">${head}${body}</div>`;
  };
  return `<aside class="side glass" id="fpSide" aria-label="Темы дисциплины">
  <div class="side-head">${FP.brand('index.html')}<div class="side-links">${top}</div></div>
  <div class="side-body">
    <a class="side-home ${cur?'':'cur'}" href="index.html"><span class="tn">0</span><span>О тренажёре</span></a>
    <button class="side-intro" type="button" onclick="FP.intro()"><span class="pl"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></span><span><b>Предисловие</b><small>видео о дисциплине, 3,5 мин</small></span></button>
    ${FP.TOPICS.map(g=>`<div class="sem"><div class="sem-h">${g.sem}</div>${g.items.map(item).join('')}</div>`).join('')}
    <p class="side-foot">© 2026 М.&nbsp;Д.&nbsp;Назаркин</p>
  </div></aside>`;
};

/* ---------- каркас страницы: фон, верхняя панель, плашка, подвал ----------
   opts.lecture – кнопка «Режим лекции» (на страницах тем); на главной её нет */
FP.chrome = (opts={})=>{
  const lecture=opts.lecture!==false;
  document.body.insertAdjacentHTML('afterbegin','<div class="fp-bg" aria-hidden="true"><i></i><i></i><i></i><b></b></div>');
  document.body.insertAdjacentHTML('beforeend',`
<div class="topbar" role="toolbar" aria-label="Вид страницы">
  <button class="pill side-btn" id="sideBtn" type="button" aria-label="Темы дисциплины"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>Темы</span></button>
  <button class="pill to-top" id="toTop" type="button" aria-label="Вернуться в начало страницы" title="Вернуться в начало"><svg viewBox="0 0 24 24"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg><span>В начало</span></button>
  ${lecture?'<button class="pill lec" id="lecBtn" type="button" aria-pressed="false" title="Крупный шрифт, без меню и служебной информации"><svg class="scr" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg><svg class="x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg><span>Режим лекции</span></button>':''}
  <button class="pill theme-sw" id="themeBtn" type="button" aria-label="Сменить оформление: светлое или тёмное" title="Сменить оформление"></button>
</div>
<div class="side-veil" id="sideVeil"></div>
<div class="alpha" role="note">АЛЬФА версия 1</div>`);
  FP.$('#themeBtn').onclick=()=>{const l=root.dataset.theme!=='light';if(l)root.dataset.theme='light';else delete root.dataset.theme;FP.store.set('fp-theme',l?'light':'dark');document.dispatchEvent(new Event('fp-theme'))};
  if(lecture){let t; const lb=FP.$('#lecBtn');
    lb.onclick=()=>{const on=root.classList.toggle('lecture');lb.setAttribute('aria-pressed',on);lb.classList.remove('mini');clearTimeout(t);if(on)t=setTimeout(()=>lb.classList.add('mini'),3000)};}
  /* «В начало» появляется после прокрутки */
  const tt=()=>root.classList.toggle('tt-show',scrollY>innerHeight*.8);
  addEventListener('scroll',tt,{passive:true});tt();
  FP.$('#toTop').onclick=()=>scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  /* на узком экране боковая панель выезжает по кнопке «Темы» */
  const close=()=>root.classList.remove('side-open');
  FP.$('#sideBtn').onclick=()=>root.classList.toggle('side-open');
  FP.$('#sideVeil').onclick=close;
  document.addEventListener('click',e=>{if(e.target.closest('#fpSide a'))close()});
  /* плавное появление страницы и плавный уход при переходе между страницами тренажёра */
  root.classList.add('fp-enter');requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('fp-in')));
  addEventListener('pageshow',e=>{if(e.persisted)root.classList.remove('fp-leave')});
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||a.target)return;
    const u=new URL(a.href,location.href);if(u.origin!==location.origin)return;
    if(a.hasAttribute('data-intro')&&FP.introPending()){e.preventDefault();FP.intro({then:u.href});return}
    if(u.pathname===location.pathname&&(u.hash||a.getAttribute('href')==='#'))return;
    e.preventDefault();root.classList.add('fp-leave');setTimeout(()=>{location.href=u.href},380);
  });
  FP.reveal(document);
};

/* ---------- видео-предисловие ----------
   Открывается поверх страницы. Звук включается сразу, если переход начат нажатием (так разрешают браузеры).
   Если браузер запретил звук (например, страницу открыли по ссылке), видео идёт без звука и крупная кнопка
   предлагает включить звук. После просмотра – плавный переход к темам. */
const INTRO_KEY='fp-meteo-intro-seen';
FP.introPending=()=>FP.store.get(INTRO_KEY)!=='1';
FP.intro=(o={})=>{
  if(document.getElementById('fpIntro'))return;
  const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.insertAdjacentHTML('beforeend',`<div class="intro" id="fpIntro" role="dialog" aria-modal="true" aria-label="Предисловие к курсу">
  <div class="intro-box">
    <div class="intro-head"><div><span class="kick">Предисловие к курсу</span><b>Авиационная метеорология</b></div>
      <button class="btn intro-skip" type="button">${o.label||(o.then?'Перейти к темам →':'Закрыть')}</button></div>
    <div class="intro-frame"><video id="fpIntroV" src="assets/video/predislovie.mp4" poster="assets/video/predislovie.jpg" playsinline preload="auto" controls></video>
      <button class="intro-sound" type="button" hidden><svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg><span>Включить звук</span></button></div>
  </div></div>`);
  const m=document.getElementById('fpIntro'),v=m.querySelector('video'),snd=m.querySelector('.intro-sound');
  document.body.style.overflow='hidden';
  requestAnimationFrame(()=>requestAnimationFrame(()=>m.classList.add('on')));
  const go=()=>{v.muted=false;v.play().then(()=>{snd.hidden=true}).catch(()=>{v.muted=true;v.play().catch(()=>{});snd.hidden=false})};
  go();
  snd.onclick=()=>{v.muted=false;v.currentTime=v.currentTime<2?0:v.currentTime;v.play();snd.hidden=true};
  const done=()=>{FP.store.set(INTRO_KEY,'1');v.pause();m.classList.remove('on');m.classList.add('off');
    setTimeout(()=>{m.remove();document.body.style.overflow='';
      if(!o.then)return;const u=new URL(o.then,location.href);
      if(u.pathname===location.pathname){const t=u.hash&&document.querySelector(u.hash);if(t)t.scrollIntoView({behavior:RM?'auto':'smooth'});}
      else{root.classList.add('fp-leave');setTimeout(()=>{location.href=u.href},380)}},RM?0:750)};
  v.addEventListener('ended',done);
  m.querySelector('.intro-skip').onclick=done;
  addEventListener('keydown',function k(e){if(e.key==='Escape'&&document.getElementById('fpIntro')){removeEventListener('keydown',k);done()}});
};

FP.reveal = el=>{
  const items=el.querySelectorAll('.rv:not(.in)');
  if(!('IntersectionObserver' in window)){items.forEach(x=>x.classList.add('in'));return}
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
  items.forEach(x=>io.observe(x));
};
FP.LEGAL = `
<h3><span>01</span>Назначение тренажёра</h3>
<p>«Формула полёта. Авиационная метеорология» – вспомогательное учебное средство для самостоятельной работы обучающихся и для методической поддержки преподавателей. Тренажёр не заменяет учебную литературу, лекции и практические занятия.</p>
<h3><span>02</span>Ограничение ответственности</h3>
<p>Примеры из лётной практики, включая сведения о самолёте DA&nbsp;40&nbsp;NG и воздушных судах с высокой степенью автоматизации, приведены в иллюстративных целях и <b>не являются эксплуатационной документацией</b>. Модели и расчёты учебные и содержат упрощения. При подготовке и выполнении полётов используются только руководство по лётной эксплуатации (AFM), сборники аэронавигационной информации, метеорологическая информация уполномоченных органов и действующие нормативные документы. Авторы не несут ответственности за использование материалов тренажёра в практической лётной работе.</p>
<h3><span>03</span>Авторы и исключительное право</h3>
<p><b>Авторы:</b> Назаркин Максим Дмитриевич – руководитель проекта, программный код, интерактивные модели и оформление; Тимофеев Вадим Иванович – научное содержание.</p>
<p>© 2026 М.&nbsp;Д.&nbsp;Назаркин. Тексты, интерактивные модели, программный код и оформление тренажёра являются объектами авторских прав (ст.&nbsp;1259 ГК РФ). Программа для ЭВМ охраняется как литературное произведение (ст.&nbsp;1261 ГК РФ); правовая охрана возникает в силу создания и не требует регистрации. Произведение создано в соавторстве (ст.&nbsp;1258 ГК РФ); исключительное право принадлежит Назаркину М.&nbsp;Д. (ст.&nbsp;1270 ГК РФ) на основании соглашения соавторов. Знак охраны авторского права – ст.&nbsp;1271 ГК РФ.</p>
<p>Цитирование в учебных и научных целях допускается с указанием авторов и источника (ст.&nbsp;1274 ГК РФ). Копирование, изменение и распространение программного кода, моделей и оформления без письменного согласия правообладателя не допускаются.</p>
<h3><span>04</span>Наименования воздушных судов и оборудования</h3>
<p>Наименования DA&nbsp;40&nbsp;NG, Garmin G1000 и SSJ&nbsp;100 используются только для обозначения типа воздушного судна или оборудования; соответствующие обозначения принадлежат их правообладателям. Тренажёр не связан с Diamond Aircraft Industries, Garmin и разработчиками SSJ&nbsp;100 и не одобрен ими. Изображения приборов – собственная упрощённая реконструкция. Обращения правообладателей: Milleinelium@yandex.ru.</p>
<h3><span>05</span>Персональные данные</h3>
<p>Тренажёр не собирает и не передаёт персональные данные, не использует файлы cookie и счётчики посещений. Выбранная тема оформления, положения ползунков и ответы самопроверки хранятся только в браузере на Вашем устройстве и не покидают его; удалить их можно очисткой данных сайта в браузере. Сайт размещён на GitHub Pages: при обращении к странице хостинг может обрабатывать технические данные (например, IP-адрес) по своим правилам.</p>
<h3><span>06</span>Шрифты и сторонние компоненты</h3>
<p>Шрифты Unbounded, Cormorant Garamond, Golos Text и JetBrains Mono – лицензия SIL Open Font License 1.1. Формулы набраны с помощью MathJax (лицензия Apache 2.0). Анимации интерфейса – библиотеки Motion (лицензия MIT) и GSAP с модулями ScrollTrigger и SplitText (стандартная бесплатная лицензия GreenSock). Объёмные облака, графика истории «от парты до кабины», модель высотомера и остальные модели – собственный программный код и графика.</p>
<h3><span>07</span>Рабочая программа дисциплины</h3>
<p>Содержание тренажёра соотнесено с рабочей программой дисциплины «Авиационная метеорология» образовательной программы 25.03.03 «Аэронавигация», направленность «Лётная эксплуатация гражданских воздушных судов», и курсом лекций.</p>
<h3><span>08</span>Статус тренажёра</h3>
<p>«Формула полёта» – инициативная разработка авторов. Тренажёр не является официальным ресурсом университета и не размещается университетом. Альфа-версия: возможны неточности, сообщения о них принимаются по почте.</p>
<h3><span>09</span>Связь с авторами</h3>
<p>Назаркин Максим Дмитриевич, Milleinelium@yandex.ru.</p>`;
FP.legal = ()=>{let m=document.getElementById('fpLegal');
  if(!m){document.body.insertAdjacentHTML('beforeend',`<div class="legal" id="fpLegal" role="dialog" aria-modal="true" aria-labelledby="fpLegalT" hidden><div class="legal-box glass"><div class="legal-head"><h2 id="fpLegalT">Правовая информация</h2><button class="legal-x" type="button" aria-label="Закрыть">×</button></div><div class="legal-body">${FP.LEGAL}</div></div></div>`);
    m=document.getElementById('fpLegal');const close=()=>{m.hidden=true;document.body.style.overflow=''};
    m.querySelector('.legal-x').onclick=close;m.addEventListener('click',e=>{if(e.target===m)close()});addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.hidden)close()})}
  m.hidden=false;document.body.style.overflow='hidden';m.querySelector('.legal-x').focus()};
FP.footer = ()=>`<footer class="foot">
  <div class="row"><b style="color:var(--ink);font-family:var(--f-brand);font-size:.85rem">Формула полёта</b><span>Авиационная метеорология</span><button class="back" type="button" onclick="FP.legal()">Правовая информация</button><span style="margin-left:auto">© 2026 М.&nbsp;Д.&nbsp;Назаркин</span></div></footer>`;

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
  app.innerHTML=FP.side(cfg.n)+`
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
  if(FP.introPending())setTimeout(()=>FP.intro({label:'К теме →'}),500);
  document.addEventListener('fp-theme',()=>{Object.values(views).forEach(v=>v.dispatchEvent(new Event('rerender')))});
};
FP.slider=(id,label,min,max,step,val)=>`<div class="ctl"><div class="top"><label for="${id}">${label}</label><output id="o-${id}"></output></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
FP.vals=(el,ids)=>ids.map(i=>+el.querySelector('#'+i).value);
FP.out=(el,id,txt)=>{el.querySelector('#o-'+id).textContent=txt};
FP.bind=(el,fn)=>{el.addEventListener('input',e=>{if(e.target.type==='range')fn()});fn()};
})();
