const H=600,WORLD=3100,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PLATFORMS=[{x:0,y:510,w:365,h:90},{x:455,y:510,w:380,h:90},{x:935,y:510,w:365,h:90},{x:1410,y:510,w:420,h:90},{x:1940,y:510,w:370,h:90},{x:2420,y:510,w:680,h:90},{x:190,y:385,w:135,h:20},{x:560,y:370,w:155,h:20},{x:1035,y:375,w:145,h:20},{x:1510,y:380,w:145,h:20},{x:2050,y:365,w:155,h:20},{x:2570,y:380,w:180,h:20}];
const SPIKES=[{x:690,w:56},{x:1190,w:54},{x:1690,w:62},{x:2180,w:55},{x:2815,w:60}];
export default function createPlatform(api){
  const hero={x:65,y:470,vx:0,vy:0,ground:false};let score=0,lives=3,time=0,coins=0,checkpoint=60,coyote=0,jumpBuffer=0,inv=1.5,over=false,camera=0;
  const tokens=[];for(const p of PLATFORMS)for(let x=p.x+60;x<p.x+p.w-35;x+=70){if(SPIKES.some(s=>Math.abs(s.x+s.w/2-x)<55))continue;tokens.push({x,y:p.y-42,taken:false});}
  const foes=[{x:565,left:485,right:650},{x:1030,left:965,right:1150},{x:1515,left:1440,right:1660},{x:2020,left:1970,right:2135},{x:2630,left:2490,right:2760}].map(e=>({...e,dir:1,alive:true}));
  function finish(won){if(over)return;over=true;api.sound(won?'win':'lose');api.finish({title:won?'A little adventure, complete':'A good day for another go',message:`${coins} coins · ${score} points · ${Math.floor(hero.x)} meters into the meadow`,won});}
  function hit(){if(inv>0||over)return;lives--;api.sound('lose');api.burst(hero.x-camera,hero.y,'#f0a982',20);if(!lives){finish(false);return;}hero.x=checkpoint;hero.y=455;hero.vx=hero.vy=0;inv=2;coyote=0;}
  return {
    update(dt,input){if(over)return;time+=dt;inv=Math.max(0,inv-dt);jumpBuffer=Math.max(0,jumpBuffer-dt);coyote=Math.max(0,coyote-dt);
      if(input.pressed('Space')||input.pressed('ArrowUp')||input.pressed('KeyW')||input.pointer.pressed)jumpBuffer=.13;
      const axis=Number(input.held('ArrowRight')||input.held('KeyD'))-Number(input.held('ArrowLeft')||input.held('KeyA'));hero.vx+=(axis*285-hero.vx)*Math.min(1,dt*(hero.ground?15:8));if(hero.ground)coyote=.11;
      if(jumpBuffer>0&&coyote>0){hero.vy=-650;hero.ground=false;coyote=0;jumpBuffer=0;api.sound('move');}
      hero.vy=Math.min(700,hero.vy+1320*dt);const oldX=hero.x;hero.x=clamp(hero.x+hero.vx*dt,15,WORLD-20);
      for(const p of PLATFORMS)if(hero.x+14>p.x&&hero.x-14<p.x+p.w&&hero.y+19>p.y+1&&hero.y-19<p.y+p.h){hero.x=oldX;hero.vx=0;}
      const oldY=hero.y;hero.y+=hero.vy*dt;hero.ground=false;
      for(const p of PLATFORMS){if(hero.x+13<=p.x||hero.x-13>=p.x+p.w)continue;if(hero.vy>=0&&oldY+19<=p.y+1&&hero.y+19>=p.y){hero.y=p.y-19;hero.vy=0;hero.ground=true;}else if(hero.vy<0&&oldY-19>=p.y+p.h-1&&hero.y-19<=p.y+p.h){hero.y=p.y+p.h+19;hero.vy=0;}}
      for(const e of foes)if(e.alive){e.x+=e.dir*65*dt;if(e.x>e.right){e.x=e.right;e.dir=-1;}if(e.x<e.left){e.x=e.left;e.dir=1;}if(Math.abs(e.x-hero.x)<28&&Math.abs(495-hero.y)<30){if(hero.vy>80&&oldY+19<485){e.alive=false;hero.vy=-330;score+=150;api.score(score);api.sound('hit');api.burst(e.x-camera,493,'#bddeb1',10);}else hit();}}
      if(hero.y>H+60){inv=0;hit();}if(SPIKES.some(s=>hero.x+10>s.x&&hero.x-10<s.x+s.w&&hero.y+19>493&&hero.y-19<515))hit();
      for(const t of tokens)if(!t.taken&&Math.hypot(t.x-hero.x,t.y-hero.y)<27){t.taken=true;coins++;score+=25;api.score(score);api.sound('score');api.burst(t.x-camera,t.y,'#e9d18a',4);}
      for(const flag of [970,1975])if(hero.x>flag&&checkpoint<flag){checkpoint=flag;score+=200;api.score(score);api.sound('score');}
      if(hero.x>3025)finish(true);camera=clamp(hero.x-300,0,WORLD-960);
    },
    draw(c){c.fillStyle='#193043';c.fillRect(0,0,960,600);c.fillStyle='#e4d9b4';c.beginPath();c.arc(795-camera*.05,108,40,0,Math.PI*2);c.fill();for(let layer=0;layer<3;layer++){c.fillStyle=['#27474e','#315b58','#426b58'][layer];c.beginPath();c.moveTo(0,600);for(let x=-100;x<1100;x+=70)c.lineTo(x,300+layer*70+Math.sin((x+camera*(.12+layer*.1))*.006+layer*2)*65);c.lineTo(1100,600);c.fill();}
      c.save();c.translate(-camera,0);for(const p of PLATFORMS){c.fillStyle=p.h>25?'#536950':'#596e55';c.beginPath();c.roundRect(p.x,p.y,p.w,p.h,5);c.fill();c.fillStyle='#aac48a';c.fillRect(p.x,p.y,p.w,7);c.fillStyle='#3e554a';for(let i=15;i<p.w;i+=40)c.fillRect(p.x+i,p.y+18,15,5);}
      for(const s of SPIKES){c.fillStyle='#bec7b6';for(let x=s.x;x<s.x+s.w;x+=18){c.beginPath();c.moveTo(x,510);c.lineTo(x+9,488);c.lineTo(x+18,510);c.fill();}}
      for(const flag of [970,1975,3040]){c.strokeStyle='#d5d1a9';c.lineWidth=3;c.beginPath();c.moveTo(flag,510);c.lineTo(flag,405);c.stroke();c.fillStyle=checkpoint>=flag||flag===3040?'#c5df9b':'#d4ad82';c.beginPath();c.moveTo(flag,407);c.lineTo(flag+39,418);c.lineTo(flag,435);c.fill();}
      for(const t of tokens)if(!t.taken&&t.x>camera-30&&t.x<camera+990){c.fillStyle='#ebd292';c.beginPath();c.ellipse(t.x,t.y,6+Math.abs(Math.sin(time*4+t.x))*3,10,0,0,Math.PI*2);c.fill();c.fillStyle='#b3955b';c.fillRect(t.x-1,t.y-5,2,10);}
      for(const e of foes)if(e.alive){c.fillStyle='#ba9fbb';c.beginPath();c.ellipse(e.x,496,19,14,0,Math.PI,Math.PI*2);c.lineTo(e.x+19,510);c.lineTo(e.x-19,510);c.fill();c.fillStyle='#273e4b';c.fillRect(e.x-9,493,5,5);c.fillRect(e.x+5,493,5,5);}
      c.save();c.translate(hero.x,hero.y);c.globalAlpha=inv>0?.6:1;c.fillStyle='#bedcae';c.beginPath();c.roundRect(-11,-6,22,24,5);c.fill();c.fillStyle='#dfc49f';c.beginPath();c.arc(0,-10,12,0,Math.PI*2);c.fill();c.fillStyle='#e3b582';c.fillRect(-14,-20,28,8);c.fillStyle='#2e4a53';c.fillRect(hero.vx<0?-8:4,-12,4,4);c.fillStyle='#d7d5b0';const step=hero.ground?Math.sin(time*18)*4:3;c.fillRect(-10,14,7,7+step);c.fillRect(4,14,7,7-step);c.restore();c.restore();
      c.fillStyle='#132b38dc';c.beginPath();c.roundRect(18,16,924,42,9);c.fill();c.font='600 13px monospace';c.fillStyle='#c9ddbe';c.textAlign='left';c.fillText('♥ '.repeat(lives),33,43);c.textAlign='center';c.fillText(`COINS ${coins}`,480,43);c.textAlign='right';c.fillText('THE FLAG IS YOUR FINISH LINE →',925,43);c.textAlign='left';
    },
    inspect:()=>({score,lives,time,coins,checkpoint,coyote,jumpBuffer,inv,over,camera,hero:{...hero},tokens:tokens.map(t=>({...t})),foes:foes.map(e=>({...e}))})
  };
}
