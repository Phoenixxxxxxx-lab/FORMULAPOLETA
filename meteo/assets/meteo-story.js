/* «Формула полёта. Авиационная метеорология» – история «от парты до кабины».
   Вся графика рисуется программно: Canvas 2D (сцены, свет, частицы) и WebGL (объёмное грозовое облако).
   Анимация по прокрутке – GSAP + ScrollTrigger + SplitText (стандартная бесплатная лицензия GSAP). */
(function(){
'use strict';
const W=1600,H=900,LIME='198,244,50';
const cl=(x,a=0,b=1)=>x<a?a:x>b?b:x, mix=(a,b,t)=>a+(b-a)*t;
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;

/* ================= WebGL: небо и кучево-дождевое облако ================= */
const VS='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FS=`precision highp float;
uniform vec2 uRes,uCss;uniform vec3 uCam;uniform float uTime,uStorm,uFlash;uniform vec2 uFP;
float cl01(float v){return clamp(v,0.,1.);}
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
  mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*noise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
float billow(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*abs(noise(p)*2.-1.);p=p*2.07+vec3(1.7,9.2,3.1);a*=.5;}return s;}
/* кучево-дождевое облако: башня, наковальня, купол; положительное значение – внутри */
float cb(vec3 p){
 float S=uStorm,x=p.x+1.75,y=p.y,top=.26+.7*S;
 float yt=cl01(y/top);float r=(.24+.36*S)*(.8+.25*yt+1.1*smoothstep(.62,1.,yt)*S);
 float tower=min(r-length(vec2(x,p.z*1.15)),min(y+.02,top-y));
 float aw=.2+1.35*S,ax=x-.38*S,k=cl01(abs(ax)/aw);
 float th=.05+.15*S*(1.-pow(k,1.4));
 float anvil=min(min(aw-abs(ax),th-abs(y-top+.01)),.5-abs(p.z));
 float dome=.13*S+.02-length(vec3(x+.02,(y-top)*1.5,p.z));
 return max(max(tower,anvil),dome);
}
float dens(vec3 p){
 float v=cb(p);if(v<-.25)return 0.;
 float b=billow(p*2.3+vec3(0.,-uTime*.03,uTime*.015));
 float f=billow(vec3(p.x*1.4,p.y*5.,p.z*2.2)+vec3(uTime*.02,0.,0.));
 float isAnvil=smoothstep(.0,.08,p.y-(.16+.7*uStorm));
 v+=mix(.34*(b-.42),.16*(f-.42),isAnvil);
 return cl01(v*mix(9.,5.,isAnvil));
}
void main(){
 vec2 css=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uRes*uCss;
 vec2 wp=(css-uCss*.5)/uCam.z+uCam.xy;
 vec2 q=vec2((wp.x-800.)/150.,(420.-wp.y)/150.);
 float hz=q.y;
 vec3 sky=mix(vec3(.06,.075,.075),vec3(.006,.009,.013),cl01(hz*.9));
 sky+=vec3(.5,.56,.26)*.3*exp(-hz*hz*40.)*(1.-.5*uStorm)+vec3(.1,.14,.16)*.5*exp(-hz*hz*6.);
 {vec2 g=floor(css*.5);float st=step(.9992,hash(vec3(g,1.)))*cl01(hz*2.-.6);sky+=vec3(st*.35);}
 sky+=vec3(.75,.8,1.)*uFlash*.25*exp(-length(q-uFP)*.8);
 if(hz<0.){float dd=-hz;vec2 u=vec2(q.x/(dd*6.+.05),dd);float c=billow(vec3(u.x*.6,u.y*14.,uTime*.01));
  sky=mix(vec3(.035,.04,.048),vec3(.2,.215,.24),cl01(c*1.3))*(1.-.6*cl01(dd*1.2))+vec3(.4,.46,.2)*.2*exp(-dd*30.)*(1.-.5*uStorm);
  sky+=vec3(.7,.75,.95)*uFlash*.18*exp(-length(q-uFP)*1.2);}
 vec3 col=vec3(0.);float acc=0.;
 vec3 L=normalize(vec3(-.65,.55,.35));
 const int N=18;float dz=1.2/float(N);
 float z=-.6+dz*fract(52.98*fract(dot(gl_FragCoord.xy,vec2(.0671,.00584))));
 for(int i=0;i<N;i++){
  vec3 p=vec3(q,z);float d=dens(p);
  if(d>.002){
   float sh=exp(-dens(p+L*.07)*1.8-dens(p+L*.16)*1.2);
   float h=cl01(p.y*.8+.2);
   vec3 c=mix(vec3(.17,.18,.2),vec3(.9,.9,.9),sh*.85)*(.55+.45*h)*(1.-.4*uStorm);
   c+=vec3(.7,.8,.3)*.5*sh*(1.-d)*cl01(-p.x*1.5+.4)*(1.-.45*uStorm);
   c+=vec3(.8,.86,1.)*uFlash*3.*exp(-length(p.xy-uFP)*2.4)*(.4+.6*(1.-d));
   float a=d*.85;col+=(1.-acc)*a*c;acc+=(1.-acc)*a;if(acc>.98)break;
  }
  z+=dz;
 }
 gl_FragColor=vec4(sky*(1.-acc)+col,1.);
}`;

function makeGL(cv){
  const gl=cv.getContext('webgl',{antialias:false,alpha:false,powerPreference:'high-performance'});if(!gl)return null;
  const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o};
  let pr;try{pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr))}catch(e){console.warn(e.message);return null}
  gl.useProgram(pr);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const al=gl.getAttribLocation(pr,'a');gl.enableVertexAttribArray(al);gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
  const U={};['uRes','uCss','uCam','uTime','uStorm','uFlash','uFP'].forEach(n=>U[n]=gl.getUniformLocation(pr,n));
  return {draw(cw,ch,cam,t,storm,flash,fp){
    gl.viewport(0,0,cv.width,cv.height);gl.uniform2f(U.uRes,cv.width,cv.height);gl.uniform2f(U.uCss,cw,ch);gl.uniform3f(U.uCam,cam[0],cam[1],cam[2]);
    gl.uniform1f(U.uTime,t);gl.uniform1f(U.uStorm,storm);gl.uniform1f(U.uFlash,flash);gl.uniform2f(U.uFP,(fp[0]-800)/150,(420-fp[1])/150);
    gl.drawArrays(gl.TRIANGLES,0,3)}};
}

/* ================= общие помощники ================= */
const glowSprite=(rgb,sz=64)=>{const c=document.createElement('canvas');c.width=c.height=sz;const x=c.getContext('2d');
  const g=x.createRadialGradient(sz/2,sz/2,0,sz/2,sz/2,sz/2);g.addColorStop(0,`rgba(${rgb},1)`);g.addColorStop(.18,`rgba(${rgb},.55)`);g.addColorStop(.5,`rgba(${rgb},.12)`);g.addColorStop(1,`rgba(${rgb},0)`);
  x.fillStyle=g;x.fillRect(0,0,sz,sz);return c};
const rr=(x,X,Y,w,h,r)=>{x.beginPath();x.roundRect?x.roundRect(X,Y,w,h,r):x.rect(X,Y,w,h)};
const poly=(x,pts)=>{x.beginPath();x.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)x.lineTo(pts[i],pts[i+1]);x.closePath()};

/* трубка вдоль квадратичной кривой со скруглёнными концами (рука, предплечье) */
function tube(p0,c,p1,w0,w1){const N=18,L=[],R=[];let n0,n1;
  for(let i=0;i<=N;i++){const t=i/N,u=1-t,P=[u*u*p0[0]+2*u*t*c[0]+t*t*p1[0],u*u*p0[1]+2*u*t*c[1]+t*t*p1[1]],T=[2*u*(c[0]-p0[0])+2*t*(p1[0]-c[0]),2*u*(c[1]-p0[1])+2*t*(p1[1]-c[1])],l=Math.hypot(...T)||1,n=[-T[1]/l,T[0]/l],w=mix(w0,w1,t)/2;
    L.push([P[0]+n[0]*w,P[1]+n[1]*w]);R.push([P[0]-n[0]*w,P[1]-n[1]*w]);if(!i)n0=n;if(i===N)n1=n}
  const p=new Path2D();p.moveTo(...L[0]);L.forEach(q=>p.lineTo(...q));const a1=Math.atan2(n1[1],n1[0]);p.arc(p1[0],p1[1],w1/2,a1,a1-Math.PI,true);
  R.reverse().forEach(q=>p.lineTo(...q));const a0=Math.atan2(n0[1],n0[0]);p.arc(p0[0],p0[1],w0/2,a0+Math.PI,a0,true);p.closePath();return p}
let dpr0=1;
/* ================= 1. ПАРТА ================= */
const LAMP=[505,470];
const HEADP='M960 415 C975 400 990 365 985 330 C985 280 950 248 905 250 C870 252 850 272 848 300 L842 318 C838 330 826 342 826 352 L838 361 C834 366 842 372 840 382 C836 392 845 404 858 405 C875 410 890 414 900 412 C905 420 903 432 905 440 C880 452 840 466 812 488 C790 505 770 540 765 572 L1095 572 C1092 520 1078 478 1048 462 C1012 446 978 432 960 415 Z';
const BODYM=()=>new DOMMatrix().translate(905,440).rotate(-9).translate(-905,-440).translate(-55,38);
const BODY=(()=>{const p=new Path2D();p.addPath(new Path2D(HEADP),BODYM());return p})();
const HEADC=(()=>{const m=BODYM();const q=m.transformPoint(new DOMPoint(900,335));return[q.x,q.y]})();
const SHO=(()=>{const m=BODYM(),a=m.transformPoint(new DOMPoint(800,500)),b=m.transformPoint(new DOMPoint(880,470));return[[a.x,a.y],[b.x,b.y]]})();
const PAGE={o:[520,604],ex:[318,-6],ey:[-26,58]};
const pageP=(u,v)=>[PAGE.o[0]+PAGE.ex[0]*u+PAGE.ey[0]*v,PAGE.o[1]+PAGE.ex[1]*u+PAGE.ey[1]*v];
const dust=Array.from({length:90},()=>({u:rnd(),v:rnd(),s:.5+rnd()*1.6,ph:rnd()*6.3,sp:.2+rnd()*.6}));
const lampLight=(x,r,a)=>{const g=x.createRadialGradient(LAMP[0],LAMP[1],0,LAMP[0],LAMP[1],r);g.addColorStop(0,`rgba(232,255,170,${a})`);g.addColorStop(.35,`rgba(${LIME},${a*.45})`);g.addColorStop(1,`rgba(${LIME},0)`);return g};
/* мягкий контровой свет по краю силуэта: размытая обводка внутри формы */
function softRim(x,path,r,a,Q){x.save();x.clip(path);x.shadowColor=`rgba(225,255,160,${a})`;x.shadowBlur=r*Q;x.lineWidth=1.1;x.strokeStyle=lampLight(x,640,a);x.stroke(path);x.shadowBlur=r*Q*.35;x.stroke(path);x.restore()}
function deskLayer(){const Q=2,c=document.createElement('canvas');c.width=W*Q;c.height=H*Q;const x=c.getContext('2d');x.scale(Q,Q);
  let g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#080a07');g.addColorStop(.6,'#0c0f0a');g.addColorStop(1,'#040504');x.fillStyle=g;x.fillRect(0,0,W,H);
  seed=11;for(let X=-20;X<W;X+=18+rnd()*34){const w=30+rnd()*80,a=.018+rnd()*.03;const f=x.createLinearGradient(X,0,X+w,0);
    f.addColorStop(0,'rgba(255,255,255,0)');f.addColorStop(.5,`rgba(240,255,220,${a})`);f.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=f;x.fillRect(X,0,w,620)}
  x.globalCompositeOperation='lighter';x.fillStyle=lampLight(x,820,.16);x.fillRect(0,0,W,H);x.globalCompositeOperation='source-over';
  g=x.createLinearGradient(0,350,0,600);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.55)');x.fillStyle=g;x.fillRect(0,350,W,250);
  /* тень курсанта на шторе */
  x.save();x.filter='blur(26px)';x.globalAlpha=.55;x.translate(150,-40);x.scale(1.12,1.12);x.fillStyle='#000';x.fill(BODY);x.restore();
  /* книги */
  [[1150,508,200,30,'#18200f'],[1165,478,170,30,'#251a12'],[1142,454,185,24,'#121619']].forEach(([X,Y,w,h,col])=>{x.fillStyle=col;x.fillRect(X,Y,w,h);x.fillStyle='rgba(255,255,255,.05)';x.fillRect(X,Y,w,2);x.fillStyle='rgba(0,0,0,.35)';x.fillRect(X+w-30,Y,30,h)});
  /* курсант */
  g=x.createLinearGradient(700,250,1050,580);g.addColorStop(0,'#1a2216');g.addColorStop(.5,'#0c100b');g.addColorStop(1,'#060708');x.fillStyle=g;x.fill(BODY);
  x.save();x.clip(BODY);x.globalCompositeOperation='lighter';x.fillStyle=lampLight(x,430,.22);x.fillRect(600,200,520,420);x.restore();
  softRim(x,BODY,24,.75,Q);
  /* стол */
  poly(x,[60,560,1540,560,1600,720,0,720]);g=x.createLinearGradient(0,560,0,720);g.addColorStop(0,'#17140d');g.addColorStop(1,'#0b0907');x.fillStyle=g;x.fill();
  x.save();x.clip();seed=3;x.strokeStyle='rgba(255,230,180,.03)';x.lineWidth=1.3;
  for(let i=0;i<26;i++){const y=563+i*6+rnd()*4;x.beginPath();x.moveTo(0,y);x.bezierCurveTo(500,y+rnd()*6-3,1000,y+rnd()*6-3,W,y);x.stroke()}
  x.globalCompositeOperation='lighter';g=x.createRadialGradient(560,615,0,560,615,460);g.addColorStop(0,'rgba(225,245,160,.45)');g.addColorStop(.45,'rgba(150,185,70,.10)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,540,W,200);x.restore();
  x.fillStyle='#050404';x.fillRect(0,720,W,180);g=x.createLinearGradient(0,720,0,760);g.addColorStop(0,'rgba(255,240,200,.08)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,720,W,40);
  /* тетрадь с тенью */
  const P=[pageP(0,0),pageP(1,0),pageP(1,1),pageP(0,1)];
  x.save();x.filter='blur(5px)';poly(x,P.map((p,i)=>[p[0]+(i>1?6:10),p[1]+5]).flat());x.fillStyle='rgba(0,0,0,.6)';x.fill();x.restore();
  poly(x,P.flat());g=x.createLinearGradient(P[0][0],0,P[1][0],0);g.addColorStop(0,'#e7ecd6');g.addColorStop(.6,'#c3c8b2');g.addColorStop(1,'#8d917f');x.fillStyle=g;x.fill();
  x.save();x.clip();x.strokeStyle='rgba(60,90,150,.26)';x.lineWidth=.8;for(let i=1;i<6;i++){const a=pageP(0,i/6),b=pageP(1,i/6);x.beginPath();x.moveTo(...a);x.lineTo(...b);x.stroke()}
  x.strokeStyle='rgba(190,60,60,.25)';const r1=pageP(.04,0),r2=pageP(.04,1);x.beginPath();x.moveTo(...r1);x.lineTo(...r2);x.stroke();
  g=x.createLinearGradient(pageP(.5,0)[0]-14,0,pageP(.5,0)[0]+14,0);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.5,'rgba(0,0,0,.22)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(pageP(.5,0)[0]-20,590,40,80);x.restore();
  /* лампа: латунь и зелёное стекло */
  x.save();x.filter='blur(6px)';x.fillStyle='rgba(0,0,0,.6)';x.beginPath();x.ellipse(520,612,90,14,0,0,6.3);x.fill();x.restore();
  const brass=x.createLinearGradient(430,0,585,0);brass.addColorStop(0,'#2c240e');brass.addColorStop(.3,'#b49a4a');brass.addColorStop(.42,'#f1dc94');brass.addColorStop(.6,'#7a6528');brass.addColorStop(1,'#231d0b');
  x.beginPath();x.ellipse(505,604,76,14,0,0,6.3);x.fillStyle=brass;x.fill();x.beginPath();x.ellipse(505,598,52,9,0,0,6.3);x.fill();
  x.lineCap='round';x.lineWidth=8;x.strokeStyle=brass;x.beginPath();x.moveTo(505,596);x.bezierCurveTo(505,560,470,520,496,486);x.stroke();
  x.beginPath();x.moveTo(372,474);x.lineTo(396,428);x.quadraticCurveTo(505,396,614,428);x.lineTo(638,474);x.quadraticCurveTo(505,494,372,474);x.closePath();
  g=x.createLinearGradient(0,400,0,480);g.addColorStop(0,'#0e3a10');g.addColorStop(.35,'#1f6a17');g.addColorStop(.7,'#2f8d1e');g.addColorStop(1,'#123d0b');x.fillStyle=g;x.fill();
  x.save();x.clip();g=x.createLinearGradient(380,0,630,0);g.addColorStop(0,'rgba(0,0,0,.45)');g.addColorStop(.3,'rgba(0,0,0,0)');g.addColorStop(.7,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.5)');x.fillStyle=g;x.fillRect(370,390,280,110);
  x.globalCompositeOperation='lighter';x.fillStyle='rgba(220,255,170,.5)';x.filter='blur(3px)';x.beginPath();x.moveTo(420,432);x.quadraticCurveTo(505,410,590,432);x.lineTo(588,440);x.quadraticCurveTo(505,420,422,440);x.fill();x.restore();
  x.strokeStyle=brass;x.lineWidth=3;x.beginPath();x.moveTo(372,474);x.quadraticCurveTo(505,494,638,474);x.stroke();
  return c}

function drawDesk(x,t,S,layer){
  const fl=1+.03*Math.sin(t*7.3)*Math.sin(t*2.1);
  x.drawImage(layer,0,0,W,H);
  x.globalCompositeOperation='lighter';
  /* световой конус и пыль */
  poly(x,[400,480,610,480,830,650,200,650]);let g=x.createLinearGradient(0,480,0,650);g.addColorStop(0,`rgba(215,250,150,${.13*fl})`);g.addColorStop(1,'rgba(215,250,150,0)');x.fillStyle=g;x.fill();
  dust.forEach(d=>{const v=(d.v+t*d.sp*.02)%1,u=d.u+Math.sin(t*.3+d.ph)*.03,y=482+v*165,hw=105+v*210,X=505+(u-.5)*2*hw;
    x.fillStyle=`rgba(235,255,180,${(.2+.4*Math.sin(t*1.7+d.ph)**2)*(1-v)})`;x.fillRect(X,y,d.s,d.s)});
  g=x.createRadialGradient(505,482,0,505,482,120);g.addColorStop(0,`rgba(250,255,225,${.9*fl})`);g.addColorStop(.25,'rgba(205,245,110,.32)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(380,400,250,200);
  x.globalCompositeOperation='source-over';
  /* формула пишется */
  const w=S.write,p1=cl(w*2),p2=cl(w*2-1);
  x.save();x.transform(PAGE.ex[0]/300,PAGE.ex[1]/300,PAGE.ey[0]/60,PAGE.ey[1]/60,PAGE.o[0],PAGE.o[1]);
  x.fillStyle='#1b2852';x.font='italic 600 15px "Cormorant Garamond",Georgia,serif';
  x.save();x.beginPath();x.rect(16,4,p1*130,22);x.clip();x.fillText('T = T₀ − 0,0065 H',20,20);x.restore();
  x.save();x.beginPath();x.rect(16,28,p2*168,26);x.clip();x.fillText('p = p₀ (1 − 0,0065 H / T₀)',20,46);x.font='italic 600 10px "Cormorant Garamond",Georgia,serif';x.fillText('5,256',175,38);x.restore();
  x.restore();
  /* рука: предплечье лежит на столе, кисть с ручкой идёт вдоль строки */
  const fu=p2>0?20+p2*164:20+p1*126,fv=p2>0?44:18,pen=pageP(fu/300,fv/60);
  const PD=[.74,-.67],wr=[pen[0]+44,pen[1]+2],el=[806,648],sh=[846,516];
  x.save();x.filter='blur(8px)';x.fillStyle='rgba(0,0,0,.55)';x.fill(tube([el[0]+6,el[1]+8],[(el[0]+wr[0])/2+6,(el[1]+wr[1])/2+14],[wr[0]-6,wr[1]+10],34,26));x.restore();
  const UA=tube(sh,[852,596],el,44,38),FA=tube(el,[(el[0]+wr[0])/2,(el[1]+wr[1])/2+6],wr,40,27);
  [UA,FA].forEach((p,i)=>{x.fillStyle=lin(x,[700,520],[900,660],'#141b14','#090b0a');x.fill(p);
    x.save();x.clip(p);x.globalCompositeOperation='lighter';x.fillStyle=lampLight(x,520,.13);x.fillRect(600,480,320,220);
    if(i){x.shadowColor='rgba(220,255,160,.6)';x.shadowBlur=10*dpr0;x.lineWidth=1.2;x.strokeStyle=lampLight(x,520,.5);x.stroke(p)}x.restore()});
  /* манжета */
  x.save();x.clip(FA);x.strokeStyle='rgba(255,255,255,.08)';x.lineWidth=2;x.beginPath();x.moveTo(wr[0]+16,wr[1]-16);x.lineTo(wr[0]+12,wr[1]+14);x.stroke();x.restore();
  /* кисть */
  const ang=Math.atan2(pen[1]-wr[1],pen[0]-wr[0]);
  const skin=lin(x,[pen[0]-10,pen[1]-24],[wr[0]+8,wr[1]+12],'#d2b08c','#4a3426');
  x.save();x.translate((wr[0]+pen[0])/2+6,(wr[1]+pen[1])/2-5);x.rotate(ang);
  x.beginPath();x.ellipse(0,0,24,14,0,0,6.3);x.fillStyle=skin;x.fill();
  x.beginPath();x.ellipse(-6,10,14,6,.1,0,6.3);x.fillStyle='#3c2a1f';x.fill();x.restore();
  /* ручка */
  const pe=[pen[0]+PD[0]*74,pen[1]+PD[1]*74];x.lineCap='round';
  x.lineWidth=5.5;x.strokeStyle=lin(x,pen,pe,'#1b1d27','#0b0c12');x.beginPath();x.moveTo(pen[0]+PD[0]*7,pen[1]+PD[1]*7);x.lineTo(...pe);x.stroke();
  x.lineWidth=1.1;x.strokeStyle='rgba(255,255,255,.55)';x.beginPath();x.moveTo(pen[0]+PD[0]*12-1.5,pen[1]+PD[1]*12-1.5);x.lineTo(pe[0]-1.5,pe[1]-1.5);x.stroke();
  x.lineWidth=3;x.strokeStyle='#c9ccd0';x.beginPath();x.moveTo(...pen);x.lineTo(pen[0]+PD[0]*8,pen[1]+PD[1]*8);x.stroke();
  /* пальцы поверх ручки */
  x.lineWidth=8.5;x.strokeStyle=skin;x.beginPath();x.moveTo(pen[0]+PD[0]*34+4,pen[1]+PD[1]*34+8);x.quadraticCurveTo(pen[0]+8,pen[1]-4,pen[0]+PD[0]*12+2,pen[1]+PD[1]*12+2);x.stroke();
  x.lineWidth=7;x.strokeStyle='#b8946f';x.beginPath();x.moveTo(pen[0]+PD[0]*38-8,pen[1]+PD[1]*38-2);x.quadraticCurveTo(pen[0]+PD[0]*22-8,pen[1]+PD[1]*22-6,pen[0]+PD[0]*16-2,pen[1]+PD[1]*16-3);x.stroke();
  if(w>0&&w<1){x.globalCompositeOperation='lighter';x.drawImage(SPR.lime,pen[0]-7,pen[1]-7,14,14);x.globalCompositeOperation='source-over'}
  if(S.think>0){x.globalCompositeOperation='lighter';g=x.createRadialGradient(HEADC[0],HEADC[1],0,HEADC[0],HEADC[1],140);g.addColorStop(0,`rgba(${LIME},${.55*S.think})`);g.addColorStop(1,`rgba(${LIME},0)`);x.fillStyle=g;x.fillRect(HEADC[0]-150,HEADC[1]-150,300,300);x.globalCompositeOperation='source-over'}
}

/* ================= 2. МОЗГ: нейронная сеть в 3D ================= */
const NEU=[],EDG=[],SIG=[];
(function(){seed=5;while(NEU.length<640){const p=[rnd()*2-1,rnd()*2-1,rnd()*2-1];const x=p[0]*1.3,y=p[1]*.9,z=p[2]*1.05;
  if(p[0]*p[0]+p[1]*p[1]+p[2]*p[2]>1||y<-.6||(Math.abs(x)<.06&&y>.1))continue;NEU.push([x,y,z])}
  const key=new Set();NEU.forEach((a,i)=>{const d=NEU.map((b,j)=>[(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2,j]).sort((u,v)=>u[0]-v[0]);
    for(let k=1;k<4;k++){const j=d[k][1],h=i<j?i+'_'+j:j+'_'+i;if(!key.has(h)){key.add(h);EDG.push([i,j])}}});
  for(let i=0;i<70;i++)SIG.push({e:Math.floor(rnd()*EDG.length),t:rnd(),v:.35+rnd()*.8})})();
const WORDS=[['p = ρ R T',[-.7,.35,.2]],['T₀ = 288,15 K',[.6,.4,-.3]],['p₀ = 1013,25 гПа',[-.2,-.1,.7]],['dT/dH = −0,0065 K/м',[.5,-.25,.4]],['МСА',[0,.6,0]],['ρ₀ = 1,225 кг/м³',[-.75,-.3,-.4]],['H = 11 000 м',[.8,.05,.1]],['QNH 1013',[-.3,.25,-.75]]];
function drawBrain(x,t,S,cw,ch){
  const g=x.createRadialGradient(W/2,H/2,0,W/2,H/2,900);g.addColorStop(0,'#0d1407');g.addColorStop(1,'#020302');x.fillStyle=g;x.fillRect(0,0,W,H);
  const ry=t*.12+S.fly*1.1,rx=-.18+S.fly*.25,cy=Math.cos(ry),sy=Math.sin(ry),cx=Math.cos(rx),sx=Math.sin(rx);
  const D=mix(4.4,.55,S.fly**1.3),F=950,P=NEU.map(([X,Y,Z])=>{const x1=X*cy+Z*sy,z1=-X*sy+Z*cy,y1=Y*cx-z1*sx,z2=Y*sx+z1*cx;const zz=z2+D;return zz>.08?[W/2+x1*F/zz,H/2-y1*F/zz,zz]:null});
  const fog=z=>cl(1.25-z/(D+1.2))*cl((z-.08)*3);
  x.globalCompositeOperation='lighter';x.lineWidth=1;
  {const r=Math.min(1400,F*1.6/D),h=x.createRadialGradient(W/2,H/2,0,W/2,H/2,r);h.addColorStop(0,`rgba(${LIME},.16)`);h.addColorStop(.5,`rgba(${LIME},.05)`);h.addColorStop(1,`rgba(${LIME},0)`);x.fillStyle=h;x.fillRect(0,0,W,H)}
  for(let b=0;b<4;b++){x.beginPath();EDG.forEach(([i,j])=>{const a=P[i],c=P[j];if(!a||!c)return;const f=fog((a[2]+c[2])/2);if(Math.min(3,Math.floor(f*4))!==b)return;x.moveTo(a[0],a[1]);x.lineTo(c[0],c[1])});
    x.strokeStyle=`rgba(${LIME},${.05+b*.09})`;x.stroke()}
  P.forEach((p,i)=>{if(!p)return;const f=fog(p[2]);if(f<.02)return;const s=Math.min(90,26*F/p[2]/F*3.2)*(.7+.3*Math.sin(t*2+i));x.globalAlpha=f;x.drawImage(SPR.lime,p[0]-s/2,p[1]-s/2,s,s)});
  SIG.forEach(s=>{s.t+=s.v*.012;if(s.t>1){s.t=0;s.e=Math.floor(Math.random()*EDG.length)}const[i,j]=EDG[s.e],a=P[i],c=P[j];if(!a||!c)return;
    const X=mix(a[0],c[0],s.t),Y=mix(a[1],c[1],s.t),z=mix(a[2],c[2],s.t),f=fog(z),sz=Math.min(70,40/z);x.globalAlpha=f;x.drawImage(SPR.white,X-sz/2,Y-sz/2,sz,sz)});
  x.globalAlpha=1;x.globalCompositeOperation='source-over';
  x.textAlign='center';WORDS.forEach(([w,[X,Y,Z]],k)=>{const x1=X*cy+Z*sy,z1=-X*sy+Z*cy,y1=Y*cx-z1*sx,z2=Y*sx+z1*cx,zz=z2+D;if(zz<.25)return;
    const f=fog(zz)*cl((S.fly*3-k*.25));if(f<.02)return;x.globalAlpha=f;x.font=`italic 600 ${Math.min(52,22*F/zz/300*3)}px "Cormorant Garamond",Georgia,serif`;x.shadowColor='rgba(198,244,50,.55)';x.shadowBlur=14*dpr0;x.fillStyle='#F4FFD9';x.fillText(w,W/2+x1*F/zz,H/2-y1*F/zz);x.shadowBlur=0});
  x.globalAlpha=1;x.textAlign='start';
}

/* ================= 3–5. КАБИНА (по компоновке кабины узкофюзеляжного лайнера) ================= */
const AV='"Golos Text",system-ui,sans-serif';
const bl=(Q,u,v)=>{const a0=mix(Q[0][0],Q[1][0],u),a1=mix(Q[0][1],Q[1][1],u),b0=mix(Q[3][0],Q[2][0],u),b1=mix(Q[3][1],Q[2][1],u);return[mix(a0,b0,v),mix(a1,b1,v)]};
function rpoly(x,pts,r){const n=pts.length;if(x.beginPath)x.beginPath();for(let i=0;i<n;i++){const p0=pts[(i+n-1)%n],p1=pts[i],p2=pts[(i+1)%n];
  if(!i)x.moveTo((p0[0]+p1[0])/2,(p0[1]+p1[1])/2);x.arcTo(p1[0],p1[1],(p1[0]+p2[0])/2,(p1[1]+p2[1])/2,r)}x.closePath()}
const mir=p=>p.map(([a,b])=>[W-a,b]);
const WL=[[268,292],[788,288],[788,432],[282,440]],WSL=[[0,214],[236,290],[250,452],[0,560]];
const WINS=[WL,mir(WL).reverse(),WSL,mir(WSL).reverse()];
const OV=[[392,0],[1208,0],[1030,288],[570,288]];
const SCR=[[506,494,84,80,'pfd'],[600,494,84,80,'nd'],[758,488,84,78,'ewd'],[758,572,84,66,'sd'],[916,494,84,80,'nd'],[1010,494,84,80,'pfd'],[700,500,46,46,'isis']];
const lin=(x,a,b,c0,c1)=>{const g=x.createLinearGradient(...a,...b);g.addColorStop(0,c0);g.addColorStop(1,c1);return g};
function knob(x,X,Y,r){const g=x.createRadialGradient(X-r*.35,Y-r*.4,r*.1,X,Y,r);g.addColorStop(0,'#5b6266');g.addColorStop(.6,'#2a2f32');g.addColorStop(1,'#111416');
  x.beginPath();x.arc(X,Y,r,0,6.3);x.fillStyle=g;x.fill();x.strokeStyle='rgba(0,0,0,.6)';x.lineWidth=Math.max(.6,r*.12);x.stroke();
  x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=Math.max(.6,r*.14);x.beginPath();x.moveTo(X,Y-r*.2);x.lineTo(X,Y-r*.85);x.stroke()}
function pbtn(x,pts,lit){rpoly(x,pts,1.6);x.fillStyle='#14181a';x.fill();x.strokeStyle='rgba(255,255,255,.10)';x.lineWidth=.7;x.stroke();
  if(lit){const a=pts[3],b=pts[2],c=[mix(pts[0][0],a[0],.55),mix(pts[0][1],a[1],.55)],d=[mix(pts[1][0],b[0],.55),mix(pts[1][1],b[1],.55)];
    rpoly(x,[c,d,[mix(d[0],b[0],.5),mix(d[1],b[1],.5)],[mix(c[0],a[0],.5),mix(c[1],a[1],.5)]],1);x.fillStyle=lit;x.fill()}}
/* левая половина кабины; правая – зеркально */
function cockSide(x){
  /* потолок и стойки */
  rpoly(x,[[-10,-10],[392,-10],[570,290],[268,292],[0,214]],18);x.fillStyle=lin(x,[0,0],[500,300],'#2a3034','#171b1e');x.fill();
  x.save();x.clip();for(let i=0;i<6;i++){x.strokeStyle='rgba(255,255,255,.035)';x.lineWidth=2;x.beginPath();x.moveTo(30+i*70,0);x.lineTo(150+i*80,260);x.stroke()}x.restore();
  rpoly(x,[[372,-10],[412,-10],[588,292],[548,292]],10);x.fillStyle=lin(x,[372,0],[412,0],'#121517','#262b2f');x.fill();
  /* боковое окно: рама, ручка форточки */
  rpoly(x,[[-20,200],[250,280],[266,462],[-20,576]],22);x.strokeStyle='#1b1f22';x.lineWidth=26;x.stroke();x.strokeStyle='rgba(255,255,255,.06)';x.lineWidth=2;x.stroke();
  rpoly(x,[[150,420],[214,402],[220,436],[156,452]],8);x.fillStyle='#2b3033';x.fill();x.fillStyle='#0e1011';rpoly(x,[[166,422],[204,412],[206,428],[168,438]],5);x.fill();
  knob(x,120,300,14);rpoly(x,[[96,330],[142,322],[146,352],[100,360]],6);x.fillStyle='#202528';x.fill();
  /* боковой пульт с ручкой управления */
  rpoly(x,[[150,560],[330,610],[420,700],[380,760],[60,760]],26);x.fillStyle=lin(x,[0,560],[0,760],'#262b2e','#121416');x.fill();x.strokeStyle='rgba(255,255,255,.07)';x.lineWidth=2;x.stroke();
  x.save();x.filter='blur(6px)';x.fillStyle='rgba(0,0,0,.6)';x.beginPath();x.ellipse(300,700,34,12,0,0,6.3);x.fill();x.restore();
  x.beginPath();x.ellipse(296,694,30,11,0,0,6.3);x.fillStyle='#08090a';x.fill();
  x.save();x.translate(296,692);x.rotate(-.12);rr(x,-11,-78,22,80,11);x.fillStyle=lin(x,[-11,0],[11,0],'#3b4246','#121517');x.fill();
  rr(x,-14,-104,28,40,13);x.fillStyle=lin(x,[-14,0],[14,0],'#4a5257','#15181a');x.fill();x.beginPath();x.arc(-3,-98,4,0,6.3);x.fillStyle='#b02a22';x.fill();x.restore();
  knob(x,214,700,13);
  /* педали */
  [[452,646],[500,646]].forEach(([X,Y])=>{rpoly(x,[[X,Y],[X+36,Y],[X+44,Y+96],[X-6,Y+96]],7);x.fillStyle='#16191b';x.fill();x.strokeStyle='rgba(255,255,255,.06)';x.lineWidth=1;
    for(let i=1;i<12;i++){x.beginPath();x.moveTo(X-i*.5+2,Y+i*8);x.lineTo(X+36+i*.7-2,Y+i*8);x.stroke()}});
  /* громкоговоритель */
  x.beginPath();x.arc(468,560,15,0,6.3);x.fillStyle='#14171a';x.fill();x.fillStyle='rgba(255,255,255,.18)';for(let a=0;a<6.28;a+=.7)for(let r=4;r<13;r+=4){x.beginPath();x.arc(468+Math.cos(a+r)*r,560+Math.sin(a+r)*r,.9,0,6.3);x.fill()}
  /* кресло: подголовник и спинка с прострочкой */
  x.save();x.filter='blur(14px)';x.fillStyle='rgba(0,0,0,.7)';x.beginPath();x.moveTo(-20,560);x.bezierCurveTo(140,520,300,540,350,610);x.lineTo(360,900);x.lineTo(-20,900);x.fill();x.restore();
  const seat=new Path2D('M-10 540 C80 500 250 505 312 560 C352 600 350 700 332 790 L322 905 L-10 905 Z');
  x.fillStyle=lin(x,[0,520],[340,860],'#2a3034','#0b0d0e');x.fill(seat);
  x.save();x.clip(seat);let g=x.createRadialGradient(200,560,10,200,560,240);g.addColorStop(0,'rgba(255,255,255,.10)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,500,360,400);
  x.setLineDash([4,5]);x.strokeStyle='rgba(255,255,255,.14)';x.lineWidth=1.2;x.beginPath();x.moveTo(10,575);x.bezierCurveTo(90,542,236,546,288,590);x.bezierCurveTo(318,620,318,700,304,780);x.stroke();
  x.beginPath();x.moveTo(20,700);x.bezierCurveTo(120,680,220,690,300,712);x.stroke();x.setLineDash([]);x.restore();
  x.strokeStyle='rgba(255,255,255,.10)';x.lineWidth=2;x.stroke(seat);
  rpoly(x,[[330,800],[600,780],[612,905],[318,905]],30);x.fillStyle=lin(x,[0,780],[0,900],'#22272a','#0c0d0f');x.fill();
  x.save();x.clip();x.strokeStyle='rgba(255,255,255,.06)';x.lineWidth=1;for(let i=-10;i<20;i++){x.beginPath();x.moveTo(330+i*22,780);x.lineTo(330+i*22+80,905);x.stroke();x.beginPath();x.moveTo(330+i*22+80,780);x.lineTo(330+i*22,905);x.stroke()}x.restore();
}
function cockLayer(){const Q=2,c=document.createElement('canvas');c.width=W*Q;c.height=H*Q;const x=c.getContext('2d');x.scale(Q,Q);
  x.fillStyle=lin(x,[0,0],[0,H],'#1a1f22','#060708');x.fillRect(0,0,W,H);
  cockSide(x);x.save();x.translate(W,0);x.scale(-1,1);cockSide(x);x.restore();
  /* окна */
  x.globalCompositeOperation='destination-out';x.fillStyle='#000';WINS.forEach(w=>{rpoly(x,w,16);x.fill()});x.globalCompositeOperation='source-over';
  WINS.slice(0,2).forEach(w=>{rpoly(x,w,16);x.strokeStyle='#1c2023';x.lineWidth=12;x.stroke();x.strokeStyle='rgba(255,255,255,.08)';x.lineWidth=1.5;x.stroke()});
  rr(x,784,284,32,152,10);x.fillStyle=lin(x,[784,0],[816,0],'#101315','#252a2e');x.fill();
  rr(x,786,292,28,30,6);x.fillStyle='#0b0c0d';x.fill();x.fillStyle='rgba(255,255,255,.5)';x.font=`600 9px ${AV}`;x.fillText('N  3',790,311);
  /* противосолнечный козырёк */
  rpoly(x,[[300,300],[412,298],[414,388],[304,392]],12);x.fillStyle='rgba(22,30,20,.72)';x.fill();x.strokeStyle='#2a2f33';x.lineWidth=4;x.stroke();
  x.strokeStyle='#2a2f33';x.lineWidth=6;x.beginPath();x.moveTo(356,298);x.lineTo(380,250);x.stroke();
  /* верхний пульт */
  rpoly(x,OV,10);x.fillStyle=lin(x,[0,0],[0,290],'#2a3135','#1b2023');x.fill();x.strokeStyle='#0d0f10';x.lineWidth=5;x.stroke();
  seed=21;const rows=9;
  for(let r=0;r<rows;r++){const v0=.03+r/rows*.95,v1=v0+.95/rows*.84;
    const a=bl(OV,0,v0),b=bl(OV,1,v0);x.strokeStyle='rgba(255,255,255,.08)';x.lineWidth=1;x.beginPath();x.moveTo(...bl(OV,.02,v0-.01));x.lineTo(...bl(OV,.98,v0-.01));x.stroke();
    let u=.04;while(u<.95){const n=2+Math.floor(rnd()*3),mw=.016+.01*rnd();
      for(let i=0;i<n;i++){const u0=u+i*mw*1.7,pts=[bl(OV,u0,v0+.02),bl(OV,u0+mw,v0+.02),bl(OV,u0+mw,v1),bl(OV,u0,v1)];
        const q=rnd(),lit=q<.03?'rgba(255,175,40,.6)':q<.09?'rgba(230,240,235,.35)':null;pbtn(x,pts,lit)}
      u+=n*mw*1.7+.012;if(rnd()<.35&&u<.93){const p=bl(OV,u+.012,(v0+v1)/2),s=Math.hypot(...bl(OV,1,v0).map((t,i)=>t-bl(OV,0,v0)[i]));knob(x,p[0],p[1],s*.011);u+=.032}
      x.fillStyle='rgba(255,255,255,.22)';const lp=bl(OV,u-.02,v0+.01);x.fillRect(lp[0],lp[1],6,1)}}
  x.fillStyle=lin(x,[0,250],[0,292],'rgba(0,0,0,0)','rgba(0,0,0,.35)');rpoly(x,OV,10);x.fill();
  /* козырёк приборной доски: FCU, EFIS, сигнализация */
  const gs=new Path2D('M200 446 C420 428 1180 428 1400 446 Q1414 448 1410 462 L1396 486 Q1390 492 1380 492 L220 492 Q210 492 204 486 L190 462 Q186 448 200 446 Z');
  x.fillStyle=lin(x,[0,430],[0,492],'#191d20','#08090a');x.fill(gs);x.strokeStyle='rgba(255,255,255,.12)';x.lineWidth=1.5;x.beginPath();x.moveTo(200,446);x.bezierCurveTo(420,428,1180,428,1400,446);x.stroke();
  [[392,448,206,32],[1002,448,206,32],[636,446,328,36]].forEach(([X,Y,w,h])=>{rr(x,X,Y,w,h,7);x.fillStyle=lin(x,[0,Y],[0,Y+h],'#30373b','#1d2225');x.fill();x.strokeStyle='rgba(0,0,0,.6)';x.lineWidth=1.5;x.stroke()});
  [[420,464],[470,464],[560,464],[1040,464],[1130,464],[1180,464]].forEach(([X,Y])=>knob(x,X,Y,8));
  for(let i=0;i<4;i++){pbtn(x,[[500+i*14,456],[510+i*14,456],[510+i*14,470],[500+i*14,470]],i==1?'rgba(120,230,120,.8)':null);pbtn(x,[[1072+i*14,456],[1082+i*14,456],[1082+i*14,470],[1072+i*14,470]],null)}
  [668,742,846,920].forEach(X=>knob(x,X,474,7.5));
  [[352,452,'#7a1712'],[352,472,'#6b4a0c'],[1234,452,'#7a1712'],[1234,472,'#6b4a0c']].forEach(([X,Y,c0])=>{rr(x,X,Y,16,14,3);x.fillStyle=c0;x.fill()});
  /* приборная доска */
  rpoly(x,[[226,492],[1374,492],[1330,640],[270,640]],18);x.fillStyle=lin(x,[0,492],[0,640],'#2a3034','#171a1d');x.fill();
  x.strokeStyle='rgba(255,255,255,.06)';x.lineWidth=1.5;x.stroke();
  SCR.forEach(([X,Y,w,h])=>{rr(x,X-7,Y-7,w+14,h+14,8);x.fillStyle=lin(x,[0,Y-7],[0,Y+h+7],'#1d2225','#111416');x.fill();x.strokeStyle='rgba(255,255,255,.08)';x.lineWidth=1;x.stroke();
    x.fillStyle='rgba(255,255,255,.18)';[[X-3,Y-3],[X+w+3,Y-3],[X-3,Y+h+3],[X+w+3,Y+h+3]].forEach(([a,b])=>{x.beginPath();x.arc(a,b,1.2,0,6.3);x.fill()})});
  rr(x,700,552,46,30,6);x.fillStyle='#0a0b0c';x.fill();
  /* рычаг шасси */
  rr(x,858,502,40,70,8);x.fillStyle='#202528';x.fill();rr(x,872,510,12,48,6);x.fillStyle='#0b0c0d';x.fill();
  x.beginPath();x.arc(878,514,10,0,6.3);x.fillStyle=lin(x,[868,504],[888,524],'#d9dcdf','#6b7176');x.fill();
  [[330,560],[1270,560]].forEach(([X,Y])=>{for(let i=0;i<3;i++)pbtn(x,[[X+i*18,Y],[X+i*18+13,Y],[X+i*18+13,Y+12],[X+i*18,Y+12]],i==0?'rgba(230,240,235,.5)':null)});
  [[300,600,420],[880,600,420]].forEach(([X,Y,w])=>{rr(x,X,Y,w,18,9);x.fillStyle=lin(x,[0,Y],[0,Y+18],'#363d42','#1b1f22');x.fill();rr(x,X+w/2-40,Y+5,80,7,3.5);x.fillStyle='#0c0e0f';x.fill()});
  /* центральный пульт: MCDU, РУД, механизация */
  rpoly(x,[[648,640],[952,640],[1012,905],[588,905]],22);x.fillStyle=lin(x,[0,640],[0,900],'#242a2e','#0d0f10');x.fill();x.strokeStyle='rgba(255,255,255,.07)';x.stroke();
  [[662,650],[814,650]].forEach(([X,Y])=>{rr(x,X,Y,124,96,8);x.fillStyle='#1c2124';x.fill();rr(x,X+12,Y+7,100,40,4);x.fillStyle='#030405';x.fill();
    [['#3bd16f',.8],['#ffffff',.6],['#5ccfff',.7],['#ffffff',.5],['#3bd16f',.6]].forEach(([c0,w],i)=>{x.fillStyle=c0;x.globalAlpha=.75;x.fillRect(X+16,Y+12+i*7,88*w,2.4);x.globalAlpha=1});
    for(let r=0;r<4;r++)for(let i=0;i<8;i++){rr(x,X+8+i*14,Y+52+r*10,11,7,2);x.fillStyle=r<1?'#3a4145':'#2a3033';x.fill()}});
  rr(x,768,752,64,96,14);x.fillStyle='#08090a';x.fill();
  [[778,742],[804,742]].forEach(([X,Y])=>{rr(x,X,Y,18,78,9);x.fillStyle=lin(x,[X,0],[X+18,0],'#3e464b','#15181a');x.fill();rr(x,X-4,Y-6,26,22,9);x.fillStyle=lin(x,[X,0],[X+22,0],'#6a7378','#22272a');x.fill()});
  for(let i=0;i<6;i++){x.fillStyle='rgba(255,255,255,.25)';x.fillRect(758,760+i*14,6,1.2);x.fillRect(836,760+i*14,6,1.2)}
  rr(x,722,770,14,52,7);x.fillStyle='#2b3134';x.fill();rr(x,718,762,22,16,6);x.fillStyle='#8a9196';x.fill();
  rr(x,866,770,14,52,7);x.fillStyle='#2b3134';x.fill();rr(x,860,760,26,18,6);x.fillStyle='#c9ccce';x.fill();
  [780,820].forEach(X=>knob(x,X,870,11));
  return c}
function drawScreen(x,X,Y,w,h,k,t,S){
  x.save();rr(x,X,Y,w,h,4);x.clip();x.fillStyle='#020304';x.fillRect(X,Y,w,h);x.translate(X,Y);x.scale(w/190,h/160);
  const turb=S.storm*Math.sin(t*6.1)*Math.sin(t*2.3),F=s=>`600 ${s}px ${AV}`;
  if(k==='pfd'||k==='isis'){
    x.save();rr(x,34,18,122,110,8);x.clip();x.translate(95,72);x.rotate((Math.sin(t*.4)*2+turb*3)*Math.PI/180);const pp=8+turb*5;
    x.fillStyle=lin(x,[0,-160],[0,pp],'#1b56b8','#3f8ae6');x.fillRect(-140,-170+pp,280,170);x.fillStyle=lin(x,[0,pp],[0,160],'#8a5a2a','#4a2e14');x.fillRect(-140,pp,280,170);x.fillStyle='#fff';x.fillRect(-140,pp-1,280,2);
    x.strokeStyle='rgba(255,255,255,.9)';x.lineWidth=1.2;x.fillStyle='#fff';x.font=F(8);for(let i=-3;i<=3;i++){if(!i)continue;const y=pp-i*14,l=i%2?12:24;x.beginPath();x.moveTo(-l,y);x.lineTo(l,y);x.stroke();if(!(i%2))x.fillText(Math.abs(i*5),l+3,y+3)}x.restore();
    x.fillStyle='#000';x.strokeStyle='#f5d000';x.lineWidth=2.4;x.beginPath();x.moveTo(56,72);x.lineTo(82,72);x.lineTo(82,79);x.moveTo(134,72);x.lineTo(108,72);x.lineTo(108,79);x.stroke();rr(x,91,68,8,8,1.5);x.stroke();
    if(k==='pfd'){x.fillStyle='#3a4148';rr(x,2,18,28,110,3);x.fill();rr(x,160,18,28,110,3);x.fill();x.fillStyle='#fff';x.font=F(9);
      const spd=280+turb*6,alt=35000+turb*40;for(let i=-3;i<=3;i++){x.fillText(String(Math.round(spd/10)*10+i*10),5,76-i*17+(spd%10)*1.7);x.fillText(String(Math.round(alt/100)*100+i*100),162,76-i*17+(alt%100)*.17)}
      x.fillStyle='#000';rr(x,1,64,30,15,2);x.fill();rr(x,158,64,32,15,2);x.fill();x.strokeStyle='#f5d000';x.lineWidth=1.2;rr(x,1,64,30,15,2);x.stroke();rr(x,158,64,32,15,2);x.stroke();
      x.fillStyle='#fff';x.fillText(Math.round(spd),4,75);x.fillText(Math.round(alt),160,75);
      x.fillStyle='#35d06a';x.font=F(9);x.fillText('SPEED',36,12);x.fillText('HDG',86,12);x.fillText('ALT',126,12);x.fillStyle='#fff';x.font=F(10);x.fillText('045',86,148);
      x.strokeStyle='rgba(255,255,255,.6)';x.beginPath();x.arc(95,215,72,Math.PI*1.27,Math.PI*1.73);x.stroke()}
  }else if(k==='nd'){
    x.strokeStyle='rgba(255,255,255,.75)';x.lineWidth=1.2;x.beginPath();x.arc(95,150,122,Math.PI*1.18,Math.PI*1.82);x.stroke();x.setLineDash([3,4]);x.beginPath();x.arc(95,150,62,Math.PI*1.1,Math.PI*1.9);x.stroke();x.setLineDash([]);
    for(let a=-50;a<=50;a+=10){const r=a*Math.PI/180;x.beginPath();x.moveTo(95+Math.sin(r)*122,150-Math.cos(r)*122);x.lineTo(95+Math.sin(r)*113,150-Math.cos(r)*113);x.stroke()}
    const wx=.25+S.storm*.95;[['#1fae3a',1],['#e8d41a',.62],['#e32a1e',.32],['#c7339b',.14*S.storm]].forEach(([c0,f])=>{x.fillStyle=c0;x.beginPath();
      for(let i=0;i<=28;i++){const a=i/28*6.283,r=(30*f*wx)*(1+.22*Math.sin(a*3+t*.3)+.12*Math.sin(a*5-t*.2));x[i?'lineTo':'moveTo'](72+Math.cos(a)*r*1.5,58+Math.sin(a)*r*.8)}x.closePath();x.fill()});
    x.strokeStyle='#e04ee0';x.lineWidth=1.6;x.beginPath();x.moveTo(95,140);x.lineTo(100,20);x.stroke();
    x.fillStyle='#f5d000';x.beginPath();x.moveTo(95,134);x.lineTo(87,152);x.lineTo(95,147);x.lineTo(103,152);x.closePath();x.fill();
    x.font=F(9);x.fillStyle='#38c8ff';x.fillText('WXR 40',6,13);x.fillStyle='#fff';x.fillText('GS 482',138,13);x.fillStyle='#35d06a';x.fillText('TAS 486',138,25);
  }else if(k==='ewd'){
    [[50,48],[140,48]].forEach(([cx,cy],i)=>{x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.arc(cx,cy,32,Math.PI*.8,Math.PI*2.05);x.stroke();x.strokeStyle='#e32a1e';x.beginPath();x.arc(cx,cy,32,Math.PI*1.9,Math.PI*2.05);x.stroke();
      const v=.86+(i?.004:-.003)+turb*.01,a=Math.PI*.8+v*Math.PI*1.25;x.strokeStyle='#35d06a';x.lineWidth=2.4;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*29,cy+Math.sin(a)*29);x.stroke();
      x.fillStyle='#35d06a';x.font=F(12);x.fillText((v*100).toFixed(1),cx-15,cy+22)});
    x.fillStyle='#fff';x.font=F(9);x.fillText('N1  %',80,96);x.fillStyle='#38c8ff';x.fillText('EGT °C',80,110);x.fillStyle='#35d06a';x.fillText('612',30,110);x.fillText('618',135,110);
    x.fillStyle='#fff';x.fillText('FOB  9 800 KG',18,134);x.fillStyle='#35d06a';x.fillText('FLAP',128,134);x.fillText('S',150,148);
  }else{
    x.strokeStyle='#35d06a';x.lineWidth=2;x.fillStyle='#fff';x.font=F(10);x.fillText('CRUISE',66,16);
    [[40,'ENG'],[95,'AIR'],[150,'FUEL']].forEach(([cx,s])=>{x.strokeStyle='rgba(255,255,255,.75)';x.lineWidth=1.2;rr(x,cx-22,32,44,44,6);x.stroke();x.fillStyle='#35d06a';x.font=F(9);x.fillText(s,cx-11,58)});
    x.fillStyle='#fff';x.font=F(9);x.fillText('TAT −38 °C',10,104);x.fillText('SAT −54 °C',10,118);x.fillText('GW 62 400 KG',102,104);x.fillStyle='#38c8ff';x.fillText('ΔP 8,1 PSI',102,118);
    x.fillStyle='#35d06a';x.fillText('CAB ALT 2 400 M',10,142);
  }
  x.restore();
  x.globalCompositeOperation='lighter';const g=x.createRadialGradient(X+w/2,Y+h/2,0,X+w/2,Y+h/2,w*.95);g.addColorStop(0,'rgba(140,180,220,.12)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(X-w*.5,Y-h*.5,w*2,h*2);x.globalCompositeOperation='source-over';
}
function drawFCU(x){[[650,'SPD','280'],[724,'HDG','045'],[810,'ALT','35000'],[892,'V/S','−−−−']].forEach(([X,l,v])=>{rr(x,X,452,v.length>3?66:50,16,4);x.fillStyle='#050606';x.fill();
  x.fillStyle=`rgba(${LIME},.95)`;x.font=`600 11px ${AV}`;x.fillText(v,X+6,464);x.fillStyle='rgba(255,255,255,.55)';x.font=`600 6px ${AV}`;x.fillText(l,X+2,449)})}
function bolt(x0,y0,y1){seed=Math.floor(x0*13+y0);const pts=[[x0,y0]];let X=x0,Y=y0;while(Y<y1){Y+=8+rnd()*16;X+=(rnd()-.5)*26;pts.push([X,Y])}
  const br=[];for(let i=2;i<pts.length-3;i+=3+Math.floor(rnd()*4)){let[X,Y]=pts[i];const b=[[X,Y]],dir=rnd()<.5?-1:1;for(let k=0;k<5+rnd()*6;k++){Y+=6+rnd()*12;X+=dir*(4+rnd()*14);b.push([X,Y])}br.push(b)}return[pts,...br]}
function drawBolt(x,L,a){x.globalCompositeOperation='lighter';x.lineJoin='round';
  L.forEach((p,i)=>{[[9,.08],[4,.25],[1.6,1]].forEach(([lw,al])=>{x.lineWidth=i?lw*.5:lw;x.strokeStyle=`rgba(225,235,255,${al*a*(i?.6:1)})`;x.beginPath();p.forEach(([X,Y],k)=>x[k?'lineTo':'moveTo'](X,Y));x.stroke()})});
  x.globalCompositeOperation='source-over'}

/* ================= главный модуль ================= */
const SPR={};
window.FPStory=function(root){
  if(!window.gsap||!window.ScrollTrigger)return false;
  gsap.registerPlugin(ScrollTrigger);if(window.SplitText)gsap.registerPlugin(SplitText);
  const stage=root.querySelector('.st-stage'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cg=document.createElement('canvas'),c2=document.createElement('canvas');cg.className='st-gl';c2.className='st-2d';[cg,c2].forEach(c=>c.setAttribute('aria-hidden','true'));
  stage.prepend(c2);stage.prepend(cg);
  const x=c2.getContext('2d');let GL=null;try{GL=makeGL(cg)}catch(e){}
  SPR.lime=glowSprite(LIME);SPR.white=glowSprite('235,255,200');
  let desk=null,cock=null;
  const S={dx:660,dy:560,ds:1.9,write:0,think:0,desk:1,brain:0,fly:0,cock:0,kx:548,ky:534,ks:4.4,storm:.12,dim:0,rain:0};
  let cw=1,ch=1,dpr=1,k=1,glq=.5;
  const resize=()=>{const r=stage.getBoundingClientRect();cw=r.width;ch=r.height;dpr=Math.min(devicePixelRatio||1,1.6)*(document.documentElement.classList.contains('fp-lite')?.7:1);
    c2.width=Math.round(cw*dpr);c2.height=Math.round(ch*dpr);cg.width=Math.max(2,Math.round(cw*glq));cg.height=Math.max(2,Math.round(ch*glq));k=Math.max(cw/W,ch/H);dpr0=dpr*k};
  resize();addEventListener('resize',resize);
  const cam=(X,Y,s)=>x.setTransform(dpr*k*s,0,0,dpr*k*s,dpr*(cw/2-X*k*s),dpr*(ch/2-Y*k*s));
  let fl={t0:-9,next:2,L:null,fp:[800,300]},ft=[];
  function frame(){
    const t=performance.now()/1000;
    x.setTransform(1,0,0,1,0,0);x.fillStyle='#030403';x.fillRect(0,0,c2.width,c2.height);
    if(S.desk>.003){cam(S.dx,S.dy,S.ds);x.globalAlpha=S.desk;if(!desk)desk=deskLayer();drawDesk(x,t,S,desk);x.globalAlpha=1}
    if(S.brain>.003){x.globalAlpha=S.brain;cam(W/2,H/2,1);drawBrain(x,t,S,cw,ch);x.globalAlpha=1}
    let flash=0;
    if(S.cock>.003){
      if(!cock)cock=cockLayer();
      if(t>fl.next&&S.storm>.3){fl.t0=t;fl.next=t+1.3+Math.random()*2.6/(S.storm+.2);const X=420+Math.random()*280,Y=330+Math.random()*50;fl.fp=[X,Y];fl.L=Math.random()<.75?bolt(X,Y,418+Math.random()*12):null}
      const dt=t-fl.t0;flash=dt<.7?(Math.exp(-dt*11)+.75*Math.exp(-Math.abs(dt-.17)*30)+.4*Math.exp(-Math.abs(dt-.33)*30))*cl(S.storm*1.4-.3):0;
      if(GL){cg.style.opacity=S.cock;GL.draw(cw,ch,[S.kx,S.ky,k*S.ks],t,S.storm,flash,fl.fp);x.clearRect(0,0,c2.width,c2.height)}
      cam(S.kx,S.ky,S.ks);
      if(!GL){const g=x.createLinearGradient(0,0,0,430);g.addColorStop(0,'#030405');g.addColorStop(1,'#1b2212');x.fillStyle=g;x.fillRect(0,0,W,450)}
            x.save();const wp=new Path2D();WINS.forEach(w=>{const q=new Path2D();rpoly(q,w,16);wp.addPath(q)});x.clip(wp);
      if(fl.L&&flash>.05)drawBolt(x,fl.L,cl(flash));
      if(S.rain>0){x.strokeStyle=`rgba(200,215,230,${.2*S.rain})`;x.lineWidth=1.2;x.beginPath();for(let i=0;i<150;i++){const X=((i*97.3+t*(260+i%7*40))%1700)-50,Y=((i*53.1+t*(900+i%5*120))%440)+200;x.moveTo(X,Y);x.lineTo(X-10,Y+26)}x.stroke();
        x.fillStyle=`rgba(220,230,240,${.25*S.rain})`;for(let i=0;i<110;i++){const X=(i*173.7)%1600,Y=220+(i*91.3)%320,r=1+(i%3);x.beginPath();x.arc(X,Y+((t*8*(i%4))%30),r,0,6.3);x.fill()}}
      x.restore();
      x.drawImage(cock,0,0,W,H);
      if(flash>.02){x.globalCompositeOperation='lighter';const g=x.createLinearGradient(0,200,0,800);g.addColorStop(0,`rgba(200,215,255,${.26*flash})`);g.addColorStop(1,'rgba(200,215,255,0)');x.fillStyle=g;x.fillRect(0,0,W,H);x.globalCompositeOperation='source-over'}
      SCR.forEach(([X,Y,w,h,kd])=>drawScreen(x,X,Y,w,h,kd,t,S));drawFCU(x);
      if(S.cock<1){x.setTransform(1,0,0,1,0,0);x.globalAlpha=1-S.cock;x.fillStyle='#030403';x.fillRect(0,0,c2.width,c2.height);x.globalAlpha=1}
    }else cg.style.opacity=0;
    x.setTransform(1,0,0,1,0,0);
    const v=x.createRadialGradient(c2.width/2,c2.height/2,c2.height*.35,c2.width/2,c2.height/2,c2.width*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.65)');x.fillStyle=v;x.fillRect(0,0,c2.width,c2.height);
    if(S.dim>0){x.fillStyle=`rgba(3,4,3,${S.dim})`;x.fillRect(0,0,c2.width,c2.height)}
    /* подстройка качества */
    ft.push(t);if(ft.length>40){const avg=(t-ft.shift())/40;if(avg>.024&&glq>.28){glq*=.85;resize()}else if(avg<.0145&&glq<.55){glq=Math.min(.55,glq*1.06);resize()}}
  }
  let on=false;const tick=()=>{try{frame()}catch(e){if(!tick.err){tick.err=1;console.error('FPStory',e)}}};
  ScrollTrigger.create({trigger:root,start:'top bottom',end:'bottom top',onToggle:s=>{if(s.isActive&&!on){on=true;gsap.ticker.add(tick)}else if(!s.isActive&&on){on=false;gsap.ticker.remove(tick)}}});
  frame();

  const split=el=>window.SplitText?new SplitText(el,{type:'words'}).words:[el];
  const caps=[...root.querySelectorAll('.cap')].map(c=>({el:c,w:split(c.querySelectorAll('h2,p,.kick'))}));
  const tl=gsap.timeline({defaults:{ease:'power2.out'},scrollTrigger:{trigger:root,start:'top top',end:'bottom bottom',scrub:reduce?true:1}});
  const capIn=(i,at,len)=>{const c=caps[i];tl.fromTo(c.el,{autoAlpha:0},{autoAlpha:1,duration:.4},at)
    .from(c.w,{opacity:0,y:28,duration:2.4,stagger:.12},at).to(c.el,{autoAlpha:0,y:-30,duration:2.2},at+len)};
  /* 1. парта: от тетради – общий план */
  tl.to(S,{write:1,duration:12,ease:'none'},0).to(S,{dx:800,dy:505,ds:1.02,duration:14,ease:'power2.inOut'},2);
  capIn(0,1,15);
  /* 2. камера в голову – внутрь мысли */
  tl.to(S,{dx:HEADC[0],dy:HEADC[1],ds:9,duration:12,ease:'power3.in'},18).to(S,{think:1,duration:6},20)
    .to(S,{desk:0,duration:3,ease:'power1.in'},27).fromTo(S,{brain:0},{brain:1,duration:4,immediateRender:false},26)
    .to(S,{fly:1,duration:20,ease:'none'},26);
  capIn(1,32,12);
  /* 3. вспышка – кабина: от экрана PFD к общему плану */
  tl.to('#stWhite',{opacity:1,duration:2,ease:'power1.in'},45).set(S,{brain:0,cock:1},47)
    .to('#stWhite',{opacity:0,duration:4},47).to(S,{kx:800,ky:470,ks:1,duration:14,ease:'power3.inOut'},47);
  capIn(2,54,9);
  /* 4. гроза растёт впереди */
  tl.to(S,{storm:1,duration:20,ease:'power1.inOut'},61).to(S,{rain:1,duration:10},68).to(S,{kx:800,ky:400,ks:1.3,duration:18,ease:'power1.inOut'},62);
  capIn(3,68,13);
  /* 5. главная мысль */
  tl.to(S,{dim:.62,duration:6},84).to(S,{ks:1.1,ky:380,duration:10},84);
  const c=caps[4];tl.fromTo(c.el,{autoAlpha:0},{autoAlpha:1,duration:.4},86).from(c.w,{opacity:0,y:40,scale:.92,duration:3,stagger:.18},86)
    .to(S,{dim:1,duration:7,ease:'power1.in'},94).to(c.el,{autoAlpha:0,y:-50,duration:5,ease:'power1.in'},97).to({},{duration:2});
  return true;
};
})();
