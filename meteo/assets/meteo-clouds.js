/* «Формула полёта. Авиационная метеорология» – объёмные облака на WebGL.
   Облака рассчитываются в шейдере из трёхмерного шума (трассировка лучей через объём),
   подсвечиваются лаймовым светом снизу и сзади, поэтому края светятся.
   Качество подстраивается под видеокарту: разрешение расчёта меняется так, чтобы держать плавные 60 кадров. */
(function(){
'use strict';
const VS='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FS=`precision highp float;
uniform vec2 uRes;uniform float uTime,uScroll,uIntro,uLightTh;
uniform vec3 uL1;uniform vec3 uL2;uniform vec4 uT[24];
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
  mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p,const int o){float a=.5,s=0.;for(int i=0;i<6;i++){if(i>=o)break;s+=a*noise(p);p=p*2.02+vec3(1.7,9.2,3.1);a*=.5;}return s;}
float ease(float x){return 1.-pow(1.-clamp(x,0.,1.),3.);}
/* форма облачного поля: гряды у левого и правого края экрана */
float field(vec2 s,float py,out float side){
 side=s.x<.5?-1.:1.;
 float e=abs(s.x-.5)*2.;
 float c=fbm(vec3(side*4.3,py*1.25,uTime*.012),3);
 float reach=.40+.46*smoothstep(.3,.7,c);
 float yv=1.-s.y;
 float push=.25*smoothstep(.55,1.05,yv)+(1.-ease(uIntro))*1.1;
 return smoothstep(1.-reach,1.-reach+.22,e-push)*smoothstep(.34,.47,c);
}
float dens(vec3 q,float m){
 vec3 w=q+.3*vec3(noise(q*.9+uTime*.02),0.,0.);
 float b=fbm(w*1.9+vec3(0.,0.,uTime*.035),4);
 float d=b*m-abs(q.z-.5)*.7;
 return clamp((d-.27)*5.,0.,1.);
}
/* разрез облаков курсором: след из 24 точек, разрез сначала тонкий, затем куски расходятся и облако затягивается */
float cutAt(vec2 p,out vec2 push){
 float c=1.;push=vec2(0.);
 for(int i=0;i<23;i++){
  vec4 A=uT[i],B=uT[i+1];
  if(A.w<.5||B.w<.5)continue;
  vec2 ab=B.xy-A.xy;float l2=max(dot(ab,ab),1e-6);float h=clamp(dot(p-A.xy,ab)/l2,0.,1.);
  vec2 cp=A.xy+ab*h;vec2 dv=p-cp;float d=length(dv);
  float age=mix(A.z,B.z,h);float k=1.-smoothstep(.62,1.,age);
  float j=(noise(vec3(p*38.,float(i)))-.5)*.012*(.4+age);
  float wd=mix(.012,.045,smoothstep(0.,.6,age));
  float m=smoothstep(wd*.3,wd*1.35,d+j);
  c=min(c,mix(1.,m,k));
  vec2 nrm=d>1e-4?dv/d:vec2(0.);
  push+=nrm*k*.09*smoothstep(0.,.4,age)*exp(-d/.09);
 }
 return c;
}
void main(){
 vec2 s=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;
 vec2 sp0=vec2(s.x*asp,1.-s.y);vec2 push;float cut=cutAt(sp0,push);
 float py=(1.-s.y)+uScroll*.65;
 /* туман, стелющийся по низу экрана */
 float fogK=(1.-smoothstep(.35,1.,uScroll))*smoothstep(.46,.0,s.y);
 float fogA=0.;vec3 fogC=vec3(0.);
 if(fogK>.001){
  vec2 fp=vec2(s.x*asp+push.x*.5,s.y);
  float fn=fbm(vec3(fp.x*1.7-uTime*.045,fp.y*5.5,uTime*.025),5);
  float fn2=fbm(vec3(fp.x*3.6+uTime*.03,fp.y*9.,uTime*.04+3.),3);
  fogA=clamp((fn*.8+fn2*.4-.4)*1.8,0.,1.)*fogK*.7*mix(1.,cut,.7);
  fogC=mix(vec3(.15,.17,.13),vec3(.93,.95,.9),uLightTh)+vec3(.776,.957,.196)*(.16*(1.-uLightTh))*smoothstep(.3,.0,s.y);
 }
 float side;float m=field(s,py,side)*cut;
 if(m<.01){gl_FragColor=vec4(fogC*fogA,fogA);return;}
 vec2 w=vec2((s.x-.5)*asp+push.x,py-push.y);
 float drift=side*uTime*.012-side*(1.-ease(uIntro))*.6;
 vec3 amb=mix(vec3(.022,.026,.018),vec3(.86,.89,.82),uLightTh);
 vec3 lime=vec3(.776,.957,.196);
 float acc=0.;vec3 col=vec3(0.);
 const int N=16;float dz=1./float(N);
 float ign=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));float z=ign*dz;
 for(int i=0;i<N;i++){
  vec3 q=vec3(w.x*1.5+drift,w.y*1.5,z);
  float d=dens(q,m);
  if(d>.001){
   vec2 sp=vec2(s.x,1.-s.y);
   vec3 L=vec3(0.);float sh=1.;
   for(int k=0;k<2;k++){
    vec3 l=k==0?uL1:uL2;vec2 dv=l.xy-sp;dv.x*=asp;float dist=length(dv);
    vec3 dir=normalize(vec3(dv.x,dv.y,.55));
    float dl=dens(q+dir*.1,m)*1.5;
    float T=exp(-dl*3.2);if(k==0)sh=T;
    float att=l.z/(1.+dist*dist*2.2);
    float edge=.55+1.6*(1.-d);
    L+=lime*att*T*edge;
   }
   vec3 top=mix(vec3(.05,.055,.05),vec3(1.),uLightTh)*(.25+.75*(1.-s.y))*.35;
   vec3 c=amb*mix(.75+.5*(1.-z),.62+.38*sh+.12*(1.-z),uLightTh)+top+L*mix(1.,.32,uLightTh);
   float a=d*.5;
   col+=(1.-acc)*a*c;acc+=(1.-acc)*a;
   if(acc>.97)break;
  }
  z+=dz;
 }
 float rim=smoothstep(.12,.5,cut)*(1.-smoothstep(.55,.97,cut));
 col+=lime*rim*acc*mix(.9,.45,uLightTh);
 col+=(1.-acc)*fogC*fogA;acc+=(1.-acc)*fogA;
 gl_FragColor=vec4(col,acc);
}`;

window.FPClouds = function(opts){
  const cv=document.createElement('canvas');
  cv.setAttribute('aria-hidden','true');
  cv.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:1;pointer-events:none';
  const gl=cv.getContext('webgl',{premultipliedAlpha:true,alpha:true,antialias:false,powerPreference:'high-performance'});
  if(!gl)return null;
  const sh=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
  let pr;
  try{pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr))}
  catch(e){console.warn('Облака WebGL недоступны:',e.message);return null}
  gl.useProgram(pr);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const al=gl.getAttribLocation(pr,'a');gl.enableVertexAttribArray(al);gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
  const U={};['uRes','uTime','uScroll','uIntro','uLightTh','uL1','uL2'].forEach(n=>U[n]=gl.getUniformLocation(pr,n));U.uT=gl.getUniformLocation(pr,'uT[0]');
  /* след курсора для разреза облаков */
  const TR=[],TA=new Float32Array(96);let LIFE=3.4;let lastP=null;
  addEventListener('pointermove',e=>{const a=innerWidth/innerHeight,p={x:e.clientX/innerWidth*a,y:e.clientY/innerHeight,t:performance.now()};
    if(lastP&&Math.hypot(p.x-lastP.x,p.y-lastP.y)<.006)return;
    if(lastP&&performance.now()-lastP.t>450)TR.push({gap:1});
    TR.push(p);lastP=p;while(TR.length>24)TR.shift()},{passive:true});
  (opts.before?opts.before.parentNode:document.body).insertBefore(cv,opts.before||document.body.firstChild);

  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const maxScale=.6;
  let scale=.45, t0=performance.now(), raf=0, frames=[], last=performance.now();
  function size(){const w=Math.max(1,Math.round(innerWidth*scale)),h=Math.max(1,Math.round(innerHeight*scale));if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}gl.viewport(0,0,cv.width,cv.height)}
  function frame(now){
    // подстройка качества: держим примерно 60 кадров в секунду
    const dt=now-last;last=now;frames.push(dt);
    if(frames.length>=30){const avg=frames.reduce((a,b)=>a+b,0)/frames.length;frames=[];
      if(avg>18&&scale>.22)scale=Math.max(.22,scale*.8);else if(avg<12&&scale<maxScale)scale=Math.min(maxScale,scale*1.08)}
    size();
    const t=(now-t0)/1000, intro=reduce?1:Math.min(1,t/2.4), L=opts.light?opts.light(t):[[.5,.7,1],[.5,1.15,.6]];
    gl.uniform2f(U.uRes,cv.width,cv.height);gl.uniform1f(U.uTime,reduce?20:t);gl.uniform1f(U.uScroll,scrollY/innerHeight);
    gl.uniform1f(U.uIntro,intro);gl.uniform1f(U.uLightTh,document.documentElement.dataset.theme==='light'?1:0);
    TA.fill(0);let j=0;const nowT=performance.now();for(let i=Math.max(0,TR.length-24);i<TR.length;i++,j++){const p=TR[i];if(p.gap)continue;const ag=(nowT-p.t)/1000/LIFE;if(ag>=1)continue;TA[j*4]=p.x;TA[j*4+1]=p.y;TA[j*4+2]=ag;TA[j*4+3]=1}
    gl.uniform4fv(U.uT,TA);
    gl.uniform3f(U.uL1,L[0][0],L[0][1],L[0][2]);gl.uniform3f(U.uL2,L[1][0],L[1][1],L[1][2]);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);
    if(!reduce&&!document.hidden)raf=requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);if(!document.hidden){last=performance.now();raf=requestAnimationFrame(frame)}});
  if(reduce){addEventListener('scroll',()=>requestAnimationFrame(frame),{passive:true});document.addEventListener('fp-theme',()=>requestAnimationFrame(frame));addEventListener('resize',()=>requestAnimationFrame(frame))}
  raf=requestAnimationFrame(frame);
  return cv;
};
})();
