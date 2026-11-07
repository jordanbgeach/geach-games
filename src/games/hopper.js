// Cloud Hop — Space, Up / W, or click / tap the canvas to flap.
const C={ink:'#112435',mint:'#b8e5be',cream:'#f5ecda',orange:'#ffac72',pink:'#f0afc0'};
const rr=(c,x,y,w,h,r=8)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
export default function createHopper(api){
  const W=api.width,H=api.height,bx=265,ground=548,radius=13;
  let y=290,vy=-175,score=0,elapsed=0,distance=0,spawn=1.5,flapWait=0,over=false,gates=[],flapAnim=0,started=false;
  function flap(){if(flapWait>0)return;vy=-310;flapWait=.12;flapAnim=.22;started=true;api.sound('move');}
  function lose(){if(over)return;over=true;api.sound('lose');api.burst(bx,y,C.orange,20);api.finish({title:score?'A lovely little flight.':'Find your rhythm.',message:`${score} ${score===1?'gate':'gates'} cleared. Short, steady flaps are the secret.`});}
  return {
    update(dt,input){if(over)return;elapsed+=dt;flapWait=Math.max(0,flapWait-dt);flapAnim=Math.max(0,flapAnim-dt);
      if(input.pressed('Space')||input.pressed('ArrowUp')||input.pressed('KeyW')||input.pointer.pressed)flap();
      // The bird hovers until the first flap so a new player can get oriented.
      if(!started){y=290+Math.sin(elapsed*2.6)*6;return;}
      const speed=155+Math.min(score*2.2,65);distance+=speed*dt;vy=Math.min(vy+820*dt,460);y+=vy*dt;if(y<78){y=78;vy=Math.max(0,vy);}if(y+radius>ground){y=ground-radius;lose();return;}
      spawn-=dt;if(spawn<=0){let gap=Math.max(172,208-score*1.2);let prev=gates.length?gates[gates.length-1].center:290;let center=Math.max(185,Math.min(390,prev+(Math.random()-.5)*170));gates.push({x:W+20,w:76,center,gap,passed:false});spawn=305/speed;}
      for(const gate of gates){gate.x-=speed*dt;const top=gate.center-gate.gap/2,bottom=gate.center+gate.gap/2;if(bx+radius>gate.x+3&&bx-radius<gate.x+gate.w-3&&(y-radius<top-2||y+radius>bottom+2)){lose();return;}if(!gate.passed&&gate.x+gate.w<bx-radius){gate.passed=true;score++;api.score(score);api.sound('score');api.burst(bx,y,C.mint,6);}}
      gates=gates.filter(g=>g.x+g.w> -40);
    },
    draw(c){c.fillStyle=C.ink;c.fillRect(0,0,W,H);
      // Warm moon, drifting clouds and two layers of skyline form a calm night scene.
      c.fillStyle='#ead9b5';c.beginPath();c.arc(785,127,43,0,Math.PI*2);c.fill();c.fillStyle=C.ink;c.beginPath();c.arc(766,112,40,0,Math.PI*2);c.fill();
      for(let i=0;i<28;i++){let sx=(i*173+43)%W,sy=58+(i*67)%330;c.fillStyle=i%3?'#4e6875':'#aec2bb';c.fillRect(sx,sy,i%3?2:3,i%3?2:3);}
      for(let i=0;i<6;i++){let cx=((i*205-distance*.12)%1230+1230)%1230-140,cy=120+(i%3)*81;cloud(c,cx,cy,1+(i%2)*.25,'#233f4f');}
      for(let layer=0;layer<2;layer++)for(let i=0;i<15;i++){let bw=55+(i%4)*21,bh=45+((i*31)%110),xx=((i*111-distance*(layer?.27:.13))%1665+1665)%1665-110,base=layer?ground:ground-36;c.fillStyle=layer?'#244654':'#1c3647';c.fillRect(xx,base-bh,bw,bh+36);if(layer){c.fillStyle='#50766e';for(let wx=12;wx<bw-8;wx+=18)for(let wy=13;wy<bh-8;wy+=24)if((wx+wy+i)%4)c.fillRect(xx+wx,base-bh+wy,5,8);}}
      for(const gate of gates){const top=gate.center-gate.gap/2,bottom=gate.center+gate.gap/2;pipe(c,gate.x,54,gate.w,top-54,true);pipe(c,gate.x,bottom,gate.w,ground-bottom,false);}
      c.fillStyle='#456456';c.fillRect(0,ground,W,H-ground);c.fillStyle=C.mint;c.fillRect(0,ground,W,5);c.fillStyle='#1c393c';for(let i=0;i<40;i++){let xx=((i*36-distance)%1440+1440)%1440-36;c.beginPath();c.moveTo(xx,ground+12);c.lineTo(xx+12,ground+12);c.lineTo(xx+2,ground+24);c.lineTo(xx-10,ground+24);c.closePath();c.fill();}
      const angle=Math.max(-.42,Math.min(.85,vy/550));bird(c,bx,y,started?angle:Math.sin(elapsed*2)*.04,flapAnim>0?Math.sin((.22-flapAnim)/.22*Math.PI):Math.sin(elapsed*8)*.2);
      c.fillStyle='#112435e8';rr(c,28,20,188,48,10);c.fillStyle=C.mint;c.font='600 13px monospace';c.fillText('SKY HOPPER',45,49);c.textAlign='right';c.fillStyle=C.cream;c.font='700 28px monospace';c.fillText(String(score).padStart(2,'0'),W-37,54);c.textAlign='left';
      if(!started){c.fillStyle='#112435ed';rr(c,342,241,346,109,14);c.fillStyle=C.cream;c.font='700 24px monospace';c.textAlign='center';c.fillText('A LITTLE LIFT?',515,281);c.font='13px monospace';c.fillStyle=C.mint;c.fillText('SPACE / ↑ / TAP TO FLAP',515,316);c.textAlign='left';}
      c.fillStyle='#a1b8b7';c.font='12px monospace';c.fillText('SMALL FLAPS. BIG ADVENTURES.',29,H-18);
    },
    inspect:()=>({y,vy,score,elapsed,distance,over,started,gates:gates.map(g=>({...g}))})
  };
}
function cloud(c,x,y,s,color){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle=color;c.beginPath();c.arc(0,0,16,Math.PI,0);c.arc(25,-8,23,Math.PI,0);c.arc(52,0,16,Math.PI,0);c.lineTo(68,13);c.lineTo(-16,13);c.closePath();c.fill();c.restore();}
function pipe(c,x,y,w,h,top){if(h<=0)return;c.fillStyle='#0a1e2a66';c.fillRect(x+6,y+6,w,h);c.fillStyle='#548a7a';c.fillRect(x+6,y,w-12,h);c.fillStyle='#78ad91';c.fillRect(x+12,y,9,h);c.fillStyle='#355f59';c.fillRect(x+w-17,y,11,h);c.fillStyle='#abd4ae';rr(c,x,top?y+h-22:y,w,22,4);c.fillStyle='#d5e5b8';c.fillRect(x+6,top?y+h-19:y+3,w-12,4);c.fillStyle='#173d42';for(let k=0;k<3;k++)c.fillRect(x+w/2-10+k*9,top?y+h-13:y+10,5,4);}
function bird(c,x,y,a,flap){c.save();c.translate(x,y);c.rotate(a);c.fillStyle=C.orange;c.beginPath();c.moveTo(-17,-2);c.lineTo(-32,-9);c.lineTo(-29,9);c.lineTo(-14,9);c.fill();c.fillStyle=C.mint;c.beginPath();c.ellipse(0,0,22,18,0,0,Math.PI*2);c.fill();c.fillStyle='#80b999';c.beginPath();c.ellipse(-5,4+flap*6,13,7,-.4-flap*.6,0,Math.PI*2);c.fill();c.fillStyle=C.cream;c.beginPath();c.ellipse(10,-4,9,10,0,0,Math.PI*2);c.fill();c.fillStyle='#152b35';c.beginPath();c.arc(13,-5,3.5,0,Math.PI*2);c.fill();c.fillStyle=C.orange;c.beginPath();c.moveTo(18,1);c.lineTo(32,5);c.lineTo(18,10);c.closePath();c.fill();c.restore();}
