// Night Drive — left/right or A/D steer; up/Space boosts, down/S brakes.
// Drag horizontally on the canvas to steer on touch screens.
const C={ink:'#111e2d',cream:'#f4ecd9',mint:'#abe6c1',orange:'#ff9b66',pink:'#eea4bf'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rr=(c,x,y,w,h,r=8)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
export default function createRacer(api){
  const W=api.width,H=api.height,roadLeft=255,roadRight=705,lanes=[330,480,630],py=480;
  let x=480,vx=0,speed=230,distance=0,score=0,lives=3,energy=100,invuln=0,spawn=1.5,elapsed=0,over=false,boosting=false,traffic=[],lastLane=-1;
  function addTraffic(){const possible=[0,1,2].filter(l=>l!==lastLane);const lane=possible[Math.floor(Math.random()*possible.length)];lastLane=lane;const colors=[C.pink,C.mint,C.orange,'#a5b8ef'];traffic.push({x:lanes[lane],baseX:lanes[lane],age:0,phase:Math.random()*Math.PI*2,sway:35+Math.random()*7,y:-100,w:49,h:88,speed:55+Math.random()*55,color:colors[Math.floor(Math.random()*colors.length)]});
    // Later pairs always leave a full lane open; a single row never blocks the road.
    if(distance>1800&&Math.random()<.22){let other=(lane+1+Math.floor(Math.random()*2))%3;traffic.push({x:lanes[other],baseX:lanes[other],age:0,phase:Math.random()*Math.PI*2,sway:35+Math.random()*7,y:-100,w:49,h:88,speed:traffic[traffic.length-1].speed,color:C.orange});}
  }
  return {
    update(dt,input){if(over)return;elapsed+=dt;invuln=Math.max(0,invuln-dt);boosting=(input.held('ArrowUp')||input.held('KeyW')||input.held('Space'))&&energy>1;let braking=input.held('ArrowDown')||input.held('KeyS');const target=braking?150:boosting?390:245+Math.min(distance/150,65);speed+=(target-speed)*Math.min(1,dt*3);energy=clamp(energy+(boosting?-25:15)*dt,0,100);
      let direction=Number(input.held('ArrowRight')||input.held('KeyD'))-Number(input.held('ArrowLeft')||input.held('KeyA'));let targetV=direction*330;
      if(input.pointer.down&&input.pointer.active){targetV=clamp((clamp(input.pointer.x,roadLeft+27,roadRight-27)-x)*9,-460,460);}
      vx+=(targetV-vx)*Math.min(1,dt*11);x=clamp(x+vx*dt,roadLeft+27,roadRight-27);
      distance+=speed*dt*.16;const next=Math.floor(distance);if(next!==score){score=next;api.score(score);}spawn-=dt;
      if(spawn<=0){addTraffic();spawn=Math.max(.82,1.7-distance/3000)+(Math.random()*.35);}
      for(const car of traffic){car.age+=dt;car.x=car.baseX+Math.sin(car.age*.85+car.phase)*car.sway;car.y+=(speed-car.speed)*dt;if(invuln===0&&Math.abs(car.x-x)<(car.w+48)*.5-8&&Math.abs(car.y-py)<(car.h+82)*.5-12){lives--;invuln=1.4;api.sound('hit');api.burst(x,py,C.orange,24);car.y=H+150;speed*=.55;if(lives<=0){over=true;api.sound('lose');api.finish({title:'A good run.',message:`${score} meters on the night shift. Find your line and try again.`});return;}}}
      traffic=traffic.filter(car=>car.y<H+130);
    },
    draw(c){c.fillStyle=C.ink;c.fillRect(0,0,W,H);const scroll=distance*6.25;c.fillStyle='#1d3538';c.fillRect(0,0,roadLeft-18,H);c.fillRect(roadRight+18,0,W-roadRight-18,H);
      // Repeating scenery is tied to distance, so braking and boosting feel physical.
      for(let side=0;side<2;side++){for(let i=0;i<8;i++){let sy=((i*110+scroll*.65)%820)-110,sx=side?795+(i%2)*45:130-(i%2)*45;tree(c,sx,sy,1+(i%3)*.13);}c.fillStyle='#38564b';c.fillRect(side?roadRight+33:roadLeft-37,0,4,H);}
      c.fillStyle='#303d48';c.fillRect(roadLeft,0,roadRight-roadLeft,H);c.fillStyle='#202c39';c.fillRect(roadLeft+7,0,roadRight-roadLeft-14,H);c.fillStyle=C.cream;for(let side=0;side<2;side++){let xx=side?roadRight-7:roadLeft;c.fillRect(xx,0,7,H);for(let i=0;i<15;i++){let y=((i*60+scroll)%900)-90;c.fillStyle=i%2?C.orange:C.cream;c.fillRect(side?roadRight:roadLeft-13,y,13,30);}}
      c.fillStyle='#8b9a9d';for(let lane=1;lane<3;lane++)for(let i=0;i<12;i++){let y=((i*90+scroll)%1080)-100;c.fillRect(roadLeft+150*lane-2,y,4,43);}
      for(const car of traffic)vehicle(c,car.x,car.y,car.color,false);
      c.save();if(invuln>0)c.globalAlpha=.62;vehicle(c,x,py,C.cream,true);if(boosting){c.fillStyle=C.orange;c.beginPath();c.moveTo(x-12,py+45);c.lineTo(x,py+75+Math.sin(elapsed*30)*8);c.lineTo(x+12,py+45);c.fill();c.fillStyle='#fff0bc';c.beginPath();c.moveTo(x-6,py+45);c.lineTo(x,py+62);c.lineTo(x+6,py+45);c.fill();}c.restore();
      c.fillStyle='#111e2def';rr(c,22,22,194,112,12);c.font='600 12px monospace';c.fillStyle=C.mint;c.fillText('MIDNIGHT DRIVE',38,48);c.fillStyle=C.cream;c.font='700 30px monospace';c.fillText(`${Math.floor(speed*.45)}`,38,85);c.font='12px monospace';c.fillStyle='#a4b6bd';c.fillText('KM/H',112,84);c.fillStyle=C.orange;c.fillText('● '.repeat(Math.max(0,lives)),38,113);
      c.fillStyle='#111e2def';rr(c,744,22,194,112,12);c.fillStyle=C.mint;c.font='600 12px monospace';c.fillText('DISTANCE',760,48);c.fillStyle=C.cream;c.font='700 27px monospace';c.fillText(`${score} m`,760,85);c.font='11px monospace';c.fillStyle='#a4b6bd';c.fillText('KEEP YOUR LINE',760,112);
      c.fillStyle='#111e2def';rr(c,22,477,194,101,12);c.fillStyle=C.mint;c.font='600 12px monospace';c.fillText('BOOST',38,502);c.fillStyle='#34434a';rr(c,38,514,160,8,4);c.fillStyle=boosting?C.orange:C.mint;rr(c,38,514,Math.max(1,160*energy/100),8,4);c.fillStyle='#a4b6bd';c.font='11px monospace';c.fillText('↑ / SPACE  ·  BOOST',38,547);c.fillText('↓ / S      ·  BRAKE',38,564);
      c.fillStyle=C.cream;c.font='12px monospace';c.textAlign='center';c.fillText('←  STEER  →',W/2,35);c.textAlign='left';
    },
    inspect:()=>({x,vx,speed,distance,score,lives,energy,invuln,over,traffic:traffic.map(t=>({...t}))})
  };
}
function tree(c,x,y,s){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='#142c31';c.beginPath();c.ellipse(4,18,26,18,0,0,Math.PI*2);c.fill();c.fillStyle='#314f43';c.beginPath();c.moveTo(0,-34);c.lineTo(25,17);c.lineTo(-25,17);c.closePath();c.fill();c.fillStyle='#426652';c.beginPath();c.moveTo(0,-34);c.lineTo(0,17);c.lineTo(-25,17);c.closePath();c.fill();c.restore();}
function vehicle(c,x,y,color,player){c.save();c.translate(x,y);c.fillStyle='#10172277';rr(c,-26+5,-43+7,52,86,10);c.fillStyle='#0b1720';for(const xx of [-28,20]){rr(c,xx,-28,8,18,2);rr(c,xx,18,8,18,2);}c.fillStyle=color;rr(c,-24,-43,48,86,9);c.fillStyle='#253f50';rr(c,-18,-20,36,23,5);c.fillStyle='#375e71';c.beginPath();c.moveTo(-15,-18);c.lineTo(14,-18);c.lineTo(-12,-2);c.closePath();c.fill();c.fillStyle='#456172';rr(c,-17,18,34,13,4);c.fillStyle=player?C.orange:'#f1e5bb';rr(c,-18,-39,10,5,2);rr(c,8,-39,10,5,2);c.fillStyle='#e27b69';rr(c,-18,36,9,4,2);rr(c,9,36,9,4,2);if(player){c.fillStyle=C.orange;c.fillRect(-3,-41,6,19);c.fillRect(-3,5,6,12);c.fillRect(-3,32,6,10);}c.restore();}
