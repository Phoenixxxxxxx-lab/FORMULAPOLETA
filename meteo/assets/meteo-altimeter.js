/* «Формула полёта. Авиационная метеорология» – модель барометрического высотомера (собственная реконструкция).
   Рисуется на canvas: корпус с винтами, металлический ободок, шкала 0–9 (сотни футов), три стрелки
   (100, 1000 и 10 000 ft), окно шкалы давления, флажок малой высоты, кремальера BARO и блик стекла.
   FPAltimeter(canvas, {baro:1013}) → {draw(altFt)} */
(function(){
'use strict';
window.FPAltimeter = function(cv,opt){
  opt=opt||{};const main=cv.getContext('2d');let ctx=main;const TAU=Math.PI*2;let bg=null,fg=null,key='';
  const screws=[.3,1.9,4.1];
  function size(){const r=cv.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);const w=Math.round(r.width*d),h=Math.round(r.height*d);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}return {S:Math.min(r.width,r.height),d}}
  function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
  function screw(x,y,r,a){const g=ctx.createRadialGradient(x-r*.35,y-r*.35,r*.1,x,y,r);g.addColorStop(0,'#c9ccd2');g.addColorStop(.6,'#5d6066');g.addColorStop(1,'#1d1e21');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.strokeStyle='rgba(10,10,12,.85)';ctx.lineWidth=r*.28;ctx.beginPath();ctx.moveTo(-r*.7,0);ctx.lineTo(r*.7,0);ctx.stroke();ctx.restore()}
  /* тень стрелки – смещённая полупрозрачная копия (без размытия, это намного быстрее) */
  function needle(a,draw){ctx.save();ctx.translate(ctx.__u*5,ctx.__u*8);ctx.rotate(a);ctx.globalAlpha=.4;ctx.__sh=true;draw();ctx.__sh=false;ctx.restore();ctx.save();ctx.rotate(a);draw();ctx.restore()}
  const layer=()=>{const c=document.createElement('canvas');c.width=cv.width;c.height=cv.height;return c};
  function draw(alt){
    const {S,d}=size();const u=S/600;const W=cv.width/d,H=cv.height/d;
    const c=W/2,cy=H/2,R=S*.435,Rd=S*.385,k=S*.405;
    const kk=cv.width+'x'+cv.height+(document.fonts&&document.fonts.status);
    if(kk!==key){key=kk;bg=layer();fg=layer();
      ctx=bg.getContext('2d');ctx.__u=u;ctx.setTransform(d,0,0,d,0,0);staticPart(c,cy,R,Rd,S,u,k);
      ctx=fg.getContext('2d');ctx.__u=u;ctx.setTransform(d,0,0,d,0,0);glassPart(c,cy,Rd,u);ctx=main}
    ctx=main;ctx.__u=u;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.drawImage(bg,0,0);
    ctx.setTransform(d,0,0,d,0,0);dynamicPart(alt,c,cy,Rd,u);ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(fg,0,0);
  }
  function staticPart(c,cy,R,Rd,S,u,k){
    /* корпус */
    const cs=S*.96,cx0=c-cs/2,cy0=cy-cs/2;
    let g=ctx.createLinearGradient(cx0,cy0,cx0+cs,cy0+cs);g.addColorStop(0,'#34373c');g.addColorStop(.5,'#16171a');g.addColorStop(1,'#08090a');
    ctx.fillStyle=g;rr(cx0,cy0,cs,cs,S*.09);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1.2*u;ctx.stroke();
    g=ctx.createLinearGradient(cx0,cy0,cx0,cy0+cs);g.addColorStop(0,'rgba(255,255,255,.07)');g.addColorStop(1,'rgba(0,0,0,.35)');
    ctx.fillStyle=g;rr(cx0+S*.015,cy0+S*.015,cs-S*.03,cs-S*.03,S*.08);ctx.fill();
    screw(c-k,cy-k,S*.022,screws[0]);screw(c+k,cy-k,S*.022,screws[1]);screw(c+k,cy+k,S*.022,screws[2]);
    /* ободок */
    if(ctx.createConicGradient){g=ctx.createConicGradient(-.6,c,cy);[['#2c2e32',0],['#d5d8dc',.12],['#4b4e53',.26],['#f1f2f3',.4],['#3a3c40',.55],['#babdc2',.7],['#2a2c30',.85],['#2c2e32',1]].forEach(s=>g.addColorStop(s[1],s[0]))}
    else{g=ctx.createRadialGradient(c,cy,Rd,c,cy,R);g.addColorStop(0,'#555');g.addColorStop(1,'#bbb')}
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(c,cy,R,0,TAU);ctx.fill();
    g=ctx.createRadialGradient(c,cy,Rd*.98,c,cy,R);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(.3,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.35)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(c,cy,R,0,TAU);ctx.fill();
    /* циферблат */
    g=ctx.createRadialGradient(c-Rd*.25,cy-Rd*.35,Rd*.05,c,cy,Rd);g.addColorStop(0,'#212328');g.addColorStop(1,'#050506');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(c,cy,Rd,0,TAU);ctx.fill();
    ctx.save();ctx.translate(c,cy);
    /* деления: 50 штук, крупные через 100 ft */
    for(let i=0;i<50;i++){const a=i/50*TAU,maj=i%5===0;ctx.save();ctx.rotate(a);ctx.strokeStyle=maj?'#f4f5f6':'#c9ccd0';ctx.lineWidth=(maj?5.2:2.2)*u;ctx.lineCap='butt';
      ctx.beginPath();ctx.moveTo(0,-Rd*(maj?.78:.87));ctx.lineTo(0,-Rd*.965);ctx.stroke();ctx.restore()}
    ctx.fillStyle='#f4f5f6';ctx.font=`600 ${Math.round(Rd*.2)}px "Unbounded"`;ctx.textAlign='center';ctx.textBaseline='middle';
    for(let i=0;i<10;i++){const a=i/10*TAU-Math.PI/2;ctx.fillText(String(i),Math.cos(a)*Rd*.6,Math.sin(a)*Rd*.6+Rd*.01)}
    ctx.fillStyle='#b9bcc1';ctx.font=`600 ${Math.round(Rd*.075)}px "Unbounded"`;ctx.fillText('ALT',0,-Rd*.36);
    ctx.font=`500 ${Math.round(Rd*.05)}px "Unbounded"`;ctx.fillStyle='#8d9096';ctx.fillText('100 FEET',0,Rd*.3);ctx.fillText('1000 FEET',0,Rd*.38);
    /* окно шкалы давления: уровень отсчёта, при наборе не меняется */
    const kx=Rd*.2,kw=Rd*.33,kh=Rd*.13;g=ctx.createLinearGradient(0,-kh/2,0,kh/2);g.addColorStop(0,'#000');g.addColorStop(.5,'#151618');g.addColorStop(1,'#000');
    ctx.fillStyle=g;rr(kx,-kh/2,kw,kh,kh*.18);ctx.fill();ctx.strokeStyle='rgba(198,244,50,.85)';ctx.lineWidth=1.6*u;ctx.stroke();
    ctx.fillStyle='#f4f5f6';ctx.font=`600 ${Math.round(kh*.66)}px "Unbounded"`;ctx.fillText(String(opt.baro||1013),kx+kw/2,kh*.04);
    ctx.fillStyle='#C6F432';ctx.font=`600 ${Math.round(Rd*.048)}px "Unbounded"`;ctx.fillText('hPa',kx+kw/2,kh*.95);
    ctx.restore();
    /* кремальера BARO */
    const bx=c-k,by=cy+k,br=S*.058;
    ctx.save();ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=12*u;ctx.shadowOffsetY=6*u;
    g=ctx.createRadialGradient(bx-br*.3,by-br*.3,br*.1,bx,by,br);g.addColorStop(0,'#5a5d63');g.addColorStop(1,'#141517');ctx.fillStyle=g;ctx.beginPath();ctx.arc(bx,by,br,0,TAU);ctx.fill();ctx.restore();
    ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1.2*u;for(let i=0;i<40;i++){const a=i/40*TAU;ctx.beginPath();ctx.moveTo(bx+Math.cos(a)*br*.78,by+Math.sin(a)*br*.78);ctx.lineTo(bx+Math.cos(a)*br*.98,by+Math.sin(a)*br*.98);ctx.stroke()}
    g=ctx.createRadialGradient(bx-br*.2,by-br*.25,0,bx,by,br*.7);g.addColorStop(0,'#8c9096');g.addColorStop(1,'#25262a');ctx.fillStyle=g;ctx.beginPath();ctx.arc(bx,by,br*.66,0,TAU);ctx.fill();
    ctx.fillStyle='#8d9096';ctx.font=`600 ${Math.round(S*.022)}px "Unbounded"`;ctx.textAlign='center';ctx.fillText('BARO',bx,by-br*1.35);
  }
  function glassPart(c,cy,Rd,u){
    let g;
    /* стекло: внутренняя тень у края, блик и отражение */
    ctx.save();ctx.beginPath();ctx.arc(c,cy,Rd,0,TAU);ctx.clip();
    g=ctx.createRadialGradient(c,cy,Rd*.8,c,cy,Rd);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.6)');ctx.fillStyle=g;ctx.fillRect(c-Rd,cy-Rd,Rd*2,Rd*2);
    g=ctx.createLinearGradient(c-Rd,cy-Rd,c+Rd*.2,cy+Rd*.1);g.addColorStop(0,'rgba(255,255,255,.17)');g.addColorStop(.45,'rgba(255,255,255,.04)');g.addColorStop(.46,'rgba(255,255,255,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(c-Rd*.18,cy-Rd*.3,Rd*1.05,Rd*.62,-.55,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=3*u;ctx.beginPath();ctx.arc(c,cy,Rd*.93,Math.PI*1.08,Math.PI*1.42);ctx.stroke();
    ctx.restore();
  }
  function dynamicPart(alt,c,cy,Rd,u){
    let g;
    ctx.save();ctx.translate(c,cy);ctx.textAlign='center';ctx.textBaseline='middle';
    /* флажок малой высоты (виден ниже 10 000 ft) */
    const fw=Rd*.3,fh=Rd*.085,fy=-Rd*.25;ctx.save();ctx.beginPath();rr(-fw/2,fy-fh/2,fw,fh,fh*.15);ctx.clip();
    ctx.fillStyle='#f1f1f1';ctx.fillRect(-fw/2,fy-fh/2,fw,fh);ctx.strokeStyle='#0a0a0a';ctx.lineWidth=fh*.32;
    for(let x=-fw;x<fw;x+=fh*.75){ctx.beginPath();ctx.moveTo(x,fy+fh);ctx.lineTo(x+fh*1.6,fy-fh);ctx.stroke()}
    const cover=Math.min(1,Math.max(0,alt/10000));ctx.fillStyle='#0b0b0c';ctx.fillRect(-fw/2,fy-fh/2,fw*cover,fh);ctx.restore();
    ctx.strokeStyle='rgba(0,0,0,.9)';ctx.lineWidth=2*u;rr(-fw/2,fy-fh/2,fw,fh,fh*.15);ctx.stroke();
    /* стрелки */
    const a100=(alt%1000)/1000*TAU,a1000=(alt%10000)/10000*TAU,a10k=(alt%100000)/100000*TAU;
    needle(a10k,()=>{ctx.fillStyle=ctx.__sh?'#000':'#e9eaec';ctx.fillRect(-1.6*u,-Rd*.86,3.2*u,Rd*.86);ctx.beginPath();ctx.moveTo(0,-Rd*.97);ctx.lineTo(-Rd*.045,-Rd*.83);ctx.lineTo(Rd*.045,-Rd*.83);ctx.closePath();ctx.fill()});
    needle(a1000,()=>{const gg=ctx.createLinearGradient(-Rd*.06,0,Rd*.06,0);gg.addColorStop(0,'#d9dbde');gg.addColorStop(.5,'#ffffff');gg.addColorStop(1,'#bfc2c6');ctx.fillStyle=ctx.__sh?'#000':gg;
      ctx.beginPath();ctx.moveTo(0,-Rd*.58);ctx.lineTo(-Rd*.055,-Rd*.44);ctx.lineTo(-Rd*.045,Rd*.06);ctx.lineTo(Rd*.045,Rd*.06);ctx.lineTo(Rd*.055,-Rd*.44);ctx.closePath();ctx.fill();
      if(!ctx.__sh){ctx.fillStyle='#1a1b1d';ctx.fillRect(-1.2*u,-Rd*.46,2.4*u,Rd*.38)}});
    needle(a100,()=>{const gg=ctx.createLinearGradient(-Rd*.03,0,Rd*.03,0);gg.addColorStop(0,'#dfe1e4');gg.addColorStop(.5,'#ffffff');gg.addColorStop(1,'#c4c7cb');ctx.fillStyle=ctx.__sh?'#000':gg;
      ctx.beginPath();ctx.moveTo(0,-Rd*.93);ctx.lineTo(-Rd*.028,-Rd*.7);ctx.lineTo(-Rd*.034,Rd*.1);ctx.lineTo(Rd*.034,Rd*.1);ctx.lineTo(Rd*.028,-Rd*.7);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.arc(0,Rd*.2,Rd*.065,0,TAU);ctx.fill();if(!ctx.__sh){ctx.fillStyle='#C6F432';ctx.fillRect(-1.4*u,-Rd*.93,2.8*u,Rd*.14)}});
    /* ось */
    g=ctx.createRadialGradient(-Rd*.02,-Rd*.02,0,0,0,Rd*.075);g.addColorStop(0,'#f3f4f5');g.addColorStop(.6,'#7c7f85');g.addColorStop(1,'#26272a');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,Rd*.075,0,TAU);ctx.fill();ctx.strokeStyle='rgba(198,244,50,.9)';ctx.lineWidth=1.6*u;ctx.beginPath();ctx.arc(0,0,Rd*.075,0,TAU);ctx.stroke();
    ctx.restore();
  }
  return {draw};
};
})();
