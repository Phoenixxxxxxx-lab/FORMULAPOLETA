/* «Формула полёта. Авиационная метеорология» – объёмные облака на WebGL.
   Облака рассчитываются в шейдере из трёхмерного шума (трассировка лучей через объём),
   подсвечиваются лаймовым светом снизу и сзади, поэтому края светятся.
   Качество подстраивается под видеокарту: разрешение расчёта меняется так, чтобы держать плавные 60 кадров. */
(function(){
'use strict';
const VS='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FS=`precision highp float;
uniform vec2 uRes;uniform float uTime,uScroll,uIntro,uLightTh;
uniform vec3 uL1;uniform vec3 uL2;
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
 float reach=.32+.42*smoothstep(.35,.7,c);
 float yv=1.-s.y;
 float push=.25*smoothstep(.55,1.05,yv)+(1.-ease(uIntro))*1.1;
 return smoothstep(1.-reach,1.-reach+.22,e-push)*smoothstep(.4,.5,c);
}
float dens(vec3 q,float m){
 vec3 w=q+.3*vec3(noise(q*.9+uTime*.02),0.,0.);
 float b=fbm(w*1.9+vec3(0.,0.,uTime*.035),4);
 float d=b*m-abs(q.z-.5)*.7;
 return clamp((d-.27)*5.,0.,1.);
}
void main(){
 vec2 s=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;
 float py=(1.-s.y)+uScroll*.65;
 float side;float m=field(s,py,side);
 if(m<.01){gl_FragColor=vec4(0.);return;}
 vec2 w=vec2((s.x-.5)*asp,py);
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
  const U={};['uRes','uTime','uScroll','uIntro','uLightTh','uL1','uL2'].forEach(n=>U[n]=gl.getUniformLocation(pr,n));
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
