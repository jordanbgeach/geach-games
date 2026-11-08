const W=960,H=600,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export default function createStarfighter(api){
  const ship={x:480,y:510,lives:3,inv:2};
  let score=0,wave=1,time=0,spawn=0,remaining=12,cool=0,transition=0,upgrade=0,kills=0,over=false;
  let enemies=[],shots=[],drops=[],trail=[];
  const stars=Array.from({length:85},(_,i)=>({x:(i*173+41)%W,y:(i*97)%H,r:i%9===0?2:1}));
  function finish(won){if(over)return;over=true;api.sound(won?'win':'lose');api.finish({title:won?'The stars are yours':'A brave little starfighter',message:`${score.toLocaleString()} points · ${kills} ships down · Wave ${wave}`,won});}
  function hit(){if(ship.inv>0)return;ship.lives--;ship.inv=2.3;api.sound('lose');api.burst(ship.x,ship.y,'#f3ad83',24);if(ship.lives===0)finish(false);}
  function fireEnemy(e){const angle=Math.atan2(ship.y-e.y,ship.x-e.x);for(let n=0;n<(e.boss?5:1);n++){const a=angle+(e.boss?(n-2)*.2:0);shots.push({x:e.x,y:e.y+18,vx:Math.cos(a)*(e.boss?165:145+wave*12),vy:Math.sin(a)*(e.boss?165:145+wave*12),enemy:true});}}
  return {
    update(dt,input){if(over)return;time+=dt;cool-=dt;ship.inv=Math.max(0,ship.inv-dt);upgrade=Math.max(0,upgrade-dt);
      const dx=Number(input.held('ArrowRight')||input.held('KeyD'))-Number(input.held('ArrowLeft')||input.held('KeyA'));
      const dy=Number(input.held('ArrowDown')||input.held('KeyS'))-Number(input.held('ArrowUp')||input.held('KeyW'));
      const norm=Math.hypot(dx,dy)||1;ship.x=clamp(ship.x+dx/norm*310*dt,25,W-25);ship.y=clamp(ship.y+dy/norm*280*dt,275,H-35);
      if(input.pointer.down&&input.pointer.active){ship.x+=clamp(input.pointer.x-ship.x,-390*dt,390*dt);ship.y+=clamp(input.pointer.y-ship.y,-330*dt,330*dt);ship.x=clamp(ship.x,25,W-25);ship.y=clamp(ship.y,275,H-35);}
      if((input.held('Space')||input.pointer.down)&&cool<=0){for(const vx of upgrade>0?[-110,0,110]:[0])shots.push({x:ship.x,y:ship.y-23,vx,vy:-650,enemy:false});cool=.17;api.sound('shoot');}
      if(transition>0){transition-=dt;if(transition<=0){wave++;remaining=wave===5?1:10+wave*2;spawn=.5;}}
      else if(remaining>0){spawn-=dt;if(spawn<=0){remaining--;const boss=wave===5;enemies.push({x:boss?480:100+Math.random()*760,y:boss?-70:-35,base:100+Math.random()*760,age:0,hp:boss?100:wave>=3?2:1,boss,fire:boss?1.4:1.7+Math.random()*1.8});spawn=.55+Math.random()*.3;}}
      for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];e.age+=dt;e.fire-=dt;if(e.boss){e.y=Math.min(105,e.y+45*dt);e.x=480+Math.sin(e.age*.65)*300;}else{e.y+=(60+wave*7)*dt;e.x=clamp(e.base+Math.sin(e.age*1.4)*80,28,W-28);}if(e.fire<=0&&e.y>20){fireEnemy(e);e.fire=e.boss?1.1:2.3+Math.random();}if(e.y>H+40){enemies.splice(i,1);continue;}if(Math.hypot(e.x-ship.x,e.y-ship.y)<(e.boss?54:25)+14)hit();}
      for(let i=shots.length-1;i>=0;i--){const b=shots[i];b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.y< -35||b.y>H+35||b.x< -30||b.x>W+30){shots.splice(i,1);continue;}if(b.enemy){if(Math.hypot(b.x-ship.x,b.y-ship.y)<15){shots.splice(i,1);hit();}}else{const index=enemies.findIndex(e=>Math.abs(e.x-b.x)<(e.boss?58:22)&&Math.abs(e.y-b.y)<(e.boss?35:22));if(index>=0){const e=enemies[index];e.hp--;shots.splice(i,1);api.burst(b.x,b.y,'#f6d78e',3);if(e.hp<=0){enemies.splice(index,1);kills++;score+=e.boss?2000:100;api.score(score);api.sound('hit');api.burst(e.x,e.y,e.boss?'#f3ad83':'#b9e3bc',e.boss?40:13);if(kills%7===0&&!e.boss)drops.push({x:e.x,y:e.y});}}}}
      for(let i=drops.length-1;i>=0;i--){const d=drops[i];d.y+=95*dt;if(Math.hypot(d.x-ship.x,d.y-ship.y)<27){upgrade=12;score+=100;api.score(score);api.sound('score');drops.splice(i,1);}else if(d.y>H+20)drops.splice(i,1);}
      if(!over&&!remaining&&!enemies.length&&transition<=0){if(wave===5)finish(true);else{transition=2;shots=shots.filter(b=>!b.enemy);api.sound('score');}}
      trail.push({x:ship.x,y:ship.y+24});if(trail.length>9)trail.shift();
    },
    draw(c){c.fillStyle='#101e2d';c.fillRect(0,0,W,H);for(const s of stars){c.fillStyle=s.r===2?'#8baea8':'#3b5867';c.fillRect(s.x,(s.y+time*(s.r===2?52:26))%H,s.r,s.r*2);}
      c.strokeStyle='#1d3444';c.lineWidth=1;for(let i=0;i<4;i++){c.beginPath();c.arc(480,300,110+i*100,0,Math.PI*2);c.stroke();}
      for(const e of enemies){c.save();c.translate(e.x,e.y);c.fillStyle=e.boss?'#eeab83':'#af9ed3';c.beginPath();if(e.boss){c.moveTo(-64,-20);c.lineTo(-30,-35);c.lineTo(0,-18);c.lineTo(30,-35);c.lineTo(64,-20);c.lineTo(43,28);c.lineTo(0,40);c.lineTo(-43,28);}else{c.moveTo(0,23);c.lineTo(-25,-15);c.lineTo(-10,-9);c.lineTo(0,-23);c.lineTo(10,-9);c.lineTo(25,-15);}c.closePath();c.fill();c.fillStyle='#273747';c.fillRect(-8,-7,16,15);if(e.boss){c.fillStyle='#344450';c.fillRect(-50,-46,100,4);c.fillStyle='#eeab83';c.fillRect(-50,-46,e.hp,4);}c.restore();}
      for(const b of shots){c.fillStyle=b.enemy?'#f2ad80':'#f4dda0';c.beginPath();c.roundRect(b.x-2,b.y-7,4,b.enemy?9:17,2);c.fill();}
      for(const d of drops){c.save();c.translate(d.x,d.y);c.rotate(time);c.strokeStyle='#b5e7ba';c.lineWidth=2;c.strokeRect(-10,-10,20,20);c.restore();c.fillStyle='#b5e7ba';c.font='bold 12px monospace';c.textAlign='center';c.fillText('+',d.x,d.y+4);}
      c.save();c.globalAlpha=ship.inv>0?.55:1;c.translate(ship.x,ship.y);c.fillStyle='#f3ad83';c.beginPath();c.moveTo(-7,18);c.lineTo(0,38+Math.sin(time*45)*7);c.lineTo(7,18);c.fill();c.fillStyle='#c6e9c7';c.beginPath();c.moveTo(0,-25);c.lineTo(10,-2);c.lineTo(29,19);c.lineTo(8,14);c.lineTo(0,20);c.lineTo(-8,14);c.lineTo(-29,19);c.lineTo(-10,-2);c.closePath();c.fill();c.fillStyle='#3c6777';c.beginPath();c.ellipse(0,-5,5,10,0,0,Math.PI*2);c.fill();if(ship.inv>0){c.strokeStyle='#b5e7ba';c.beginPath();c.arc(0,0,35,0,Math.PI*2);c.stroke();}c.restore();
      c.textAlign='left';c.fillStyle='#b9d0c4';c.font='600 13px monospace';c.fillText('♥ '.repeat(ship.lives),26,30);c.textAlign='right';c.fillText(wave===5?'FINAL FLAGSHIP':`WAVE ${wave} / 5`,934,30);if(upgrade>0){c.fillStyle='#e4d38d';c.fillText(`SPREAD ${Math.ceil(upgrade)}s`,934,55);}if(transition>0){c.textAlign='center';c.fillStyle='#c6e9c7';c.font='bold 26px monospace';c.fillText('SECTOR SECURED',480,285);}c.textAlign='left';
    },
    inspect:()=>({score,wave,over,kills,remaining,transition,upgrade,ship:{...ship},enemies:enemies.map(e=>({...e})),shots:shots.map(b=>({...b})),drops:drops.map(d=>({...d}))})
  };
}
