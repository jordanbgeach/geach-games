// Lily Leap — arrows / WASD move. Reach all five lily pads to clear a round.
const C={ink:'#101d2b',mint:'#9ee2ba',cream:'#f5edda',orange:'#ff9d64',pink:'#ef9fb5',water:'#173d4c'};
const rr=(c,x,y,w,h,r=8)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
export default function createCrossing(api){
  const W=api.width,H=api.height,left=60,cell=56,top=100,rh=48;
  const goals=[1,4,7,10,13],filled=new Set();
  let score=0,lives=3,round=1,px=left+7.5*cell,row=9,checkpoint=9,maxRow=9,clock=50,dead=0,over=false,moveWait=0,hop=0,fromX=px,fromY=top+9.5*rh,elapsed=0;
  const lanes=[
    {row:1,kind:'log',speed:40,objects:[{x:20,w:185},{x:285,w:185},{x:550,w:185},{x:815,w:185}]},
    {row:2,kind:'log',speed:-52,objects:[{x:-80,w:150},{x:160,w:150},{x:400,w:150},{x:640,w:150},{x:880,w:150}]},
    {row:3,kind:'log',speed:34,objects:[{x:-40,w:210},{x:250,w:210},{x:540,w:210},{x:830,w:210}]},
    {row:5,kind:'car',speed:-85,objects:[{x:100,w:75},{x:440,w:75},{x:780,w:75}]},
    {row:6,kind:'car',speed:108,objects:[{x:-60,w:64},{x:260,w:64},{x:580,w:64},{x:900,w:64}]},
    {row:7,kind:'car',speed:-68,objects:[{x:100,w:118},{x:550,w:118}]},
    {row:8,kind:'car',speed:72,objects:[{x:20,w:70},{x:370,w:70},{x:720,w:70}]}
  ];
  function setScore(value){score=value;api.score(score);}
  function respawn(){dead=0;px=left+7.5*cell;row=checkpoint;maxRow=Math.min(maxRow,row);clock=50;moveWait=.22;hop=0;}
  function die(reason){if(dead||over)return;lives--;dead=.65;api.sound('lose');api.burst(px,top+(row+.5)*rh,C.orange,18);if(lives<=0){over=true;api.finish({title:'One more crossing?',message:`${score} points · Round ${round}. ${reason}`});}}
  function move(dx,dy){if(dead||over)return;let nx=px+dx*cell,nr=row+dy;if(nx<left+15||nx>W-left-15||nr<0||nr>9)return;fromX=px;fromY=top+(row+.5)*rh;px=nx;row=nr;hop=.1;moveWait=.14;api.sound('move');if(row<maxRow){setScore(score+(maxRow-row)*10);maxRow=row;}if(row===4)checkpoint=4;
    if(row===0){let goal=goals.find(g=>Math.abs(px-(left+(g+.5)*cell))<25);if(goal===undefined||filled.has(goal)){die('Aim for an open lily pad.');return;}filled.add(goal);setScore(score+150+Math.floor(clock)*2);api.sound('score');api.burst(px,top+.5*rh,C.mint,24);checkpoint=9;maxRow=9;if(filled.size===5){round++;setScore(score+1000);filled.clear();api.sound('win');}respawn();}
  }
  return {
    update(dt,input){if(over)return;elapsed+=dt;hop=Math.max(0,hop-dt);moveWait=Math.max(0,moveWait-dt);const mult=1+Math.min(round-1,6)*.12;
      for(const lane of lanes)for(const obj of lane.objects){obj.x+=lane.speed*mult*dt;if(lane.speed>0&&obj.x>W+30)obj.x=-obj.w-30;if(lane.speed<0&&obj.x+obj.w< -30)obj.x=W+30;}
      if(dead){dead-=dt;if(dead<=0)respawn();return;}
      clock-=dt;if(clock<=0){die('The crossing clock ran out.');return;}
      if(moveWait<=0){if(input.pressed('ArrowUp')||input.pressed('KeyW')||input.held('ArrowUp')||input.held('KeyW'))move(0,-1);else if(input.pressed('ArrowDown')||input.pressed('KeyS')||input.held('ArrowDown')||input.held('KeyS'))move(0,1);else if(input.pressed('ArrowLeft')||input.pressed('KeyA')||input.held('ArrowLeft')||input.held('KeyA'))move(-1,0);else if(input.pressed('ArrowRight')||input.pressed('KeyD')||input.held('ArrowRight')||input.held('KeyD'))move(1,0);}
      if(dead||over)return;const lane=lanes.find(l=>l.row===row);if(lane?.kind==='car'){if(lane.objects.some(o=>px+13>o.x+5&&px-13<o.x+o.w-5))die('Watch for a gap in traffic.');}
      if(lane?.kind==='log'){const support=lane.objects.find(o=>px>=o.x+5&&px<=o.x+o.w-5);if(!support){die('Hop onto a floating log.');return;}px+=lane.speed*mult*dt;if(px<left+8||px>W-left-8)die('Stay inside the riverbanks.');}
    },
    draw(c){c.fillStyle=C.ink;c.fillRect(0,0,W,H);c.textBaseline='middle';c.font='600 13px monospace';c.fillStyle=C.mint;c.fillText('CROSSY CREEK',60,34);c.fillStyle=C.cream;c.fillText(`ROUND ${String(round).padStart(2,'0')}`,440,34);c.textAlign='right';c.fillText(`${'● '.repeat(Math.max(0,lives))}   ${Math.max(0,Math.ceil(clock))}s`,900,34);c.textAlign='left';
      c.fillStyle='#203c39';rr(c,left,top,W-left*2,rh,10);c.fillStyle=C.water;c.fillRect(left,top+rh,W-left*2,rh*3);c.fillStyle='#26433d';c.fillRect(left,top+4*rh,W-left*2,rh);c.fillStyle='#26313b';c.fillRect(left,top+5*rh,W-left*2,rh*4);c.fillStyle='#26433d';rr(c,left,top+9*rh,W-left*2,rh,8);
      c.save();c.beginPath();c.rect(left,top,W-left*2,rh*10);c.clip();
      // Slow river ripples and lane markings add movement without obscuring hazards.
      c.strokeStyle='#2b5460';c.lineWidth=2;for(let r=1;r<=3;r++)for(let k=0;k<14;k++){let x=left+((k*73+elapsed*(r%2?12:-12))%(W-left*2));let y=top+r*rh+12+(k%3)*10;c.beginPath();c.moveTo(x,y);c.lineTo(x+22,y);c.stroke();}
      c.strokeStyle='#52616a';c.setLineDash([20,24]);for(let r=6;r<=8;r++){c.beginPath();c.moveTo(left,top+r*rh);c.lineTo(W-left,top+r*rh);c.stroke();}c.setLineDash([]);
      for(const lane of lanes)for(const obj of lane.objects){const y=top+lane.row*rh;if(lane.kind==='log'){c.fillStyle='#9c7654';rr(c,obj.x,y+8,obj.w,32,10);c.fillStyle='#b99166';rr(c,obj.x+4,y+10,obj.w-8,7,4);c.strokeStyle='#694e3d';c.lineWidth=2;for(let i=18;i<obj.w-12;i+=36){c.beginPath();c.moveTo(obj.x+i,y+20);c.lineTo(obj.x+i+18,y+20);c.stroke();}c.fillStyle='#75573f';c.beginPath();c.ellipse(obj.x+obj.w-10,y+24,5,11,0,0,Math.PI*2);c.fill();}else{let col=lane.row%3===0?C.pink:lane.row%2?C.orange:C.mint;c.fillStyle='#141c26';rr(c,obj.x+9,y+3,obj.w-18,42,5);c.fillStyle=col;rr(c,obj.x,y+8,obj.w,32,7);c.fillStyle='#263c4c';let wind=lane.speed>0?obj.x+obj.w-27:obj.x+10;rr(c,wind,y+12,17,24,3);c.fillStyle='#fff0c5';c.fillRect(lane.speed>0?obj.x+obj.w-3:obj.x+1,y+12,3,6);c.fillRect(lane.speed>0?obj.x+obj.w-3:obj.x+1,y+30,3,6);}}
      for(const goal of goals){const x=left+(goal+.5)*cell,y=top+rh*.5;c.fillStyle=filled.has(goal)?C.mint:'#426655';c.beginPath();c.arc(x,y,21,.25,Math.PI*2-.25);c.lineTo(x,y);c.fill();if(filled.has(goal))frog(c,x,y,.65);else{c.fillStyle='#8cab88';c.beginPath();c.arc(x-4,y-4,4,0,Math.PI*2);c.fill();}}
      if(!dead){const t=hop/.1;const x=px+(fromX-px)*t,y=top+(row+.5)*rh+(fromY-(top+(row+.5)*rh))*t;frog(c,x,y-Math.sin((1-t)*Math.PI)*7,1);}c.restore();
      c.fillStyle='#a7bdb7';c.font='12px monospace';c.fillText('ARROWS / WASD  ·  FIVE PADS. ONE BRAVE LITTLE FROG.',60,76);c.fillStyle='#5e9b7a';c.fillRect(60,590,840*Math.max(0,clock)/50,3);
    },
    inspect:()=>({score,lives,round,row,x:px,checkpoint,clock,filled:[...filled],over,dead,lanes:lanes.map(l=>({row:l.row,kind:l.kind,speed:l.speed,objects:l.objects.map(o=>({...o}))}))})
  };
}
function frog(c,x,y,s){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='#75bc8b';for(const dx of [-15,15]){c.beginPath();c.ellipse(dx,8,7,5,dx<0?-.5:.5,0,Math.PI*2);c.fill();}c.fillStyle='#c0ed9e';rr(c,-13,-12,26,27,9);for(const dx of [-9,9]){c.fillStyle='#d9f6b7';c.beginPath();c.arc(dx,-11,7,0,Math.PI*2);c.fill();c.fillStyle='#142a2b';c.beginPath();c.arc(dx,-13,3,0,Math.PI*2);c.fill();}c.strokeStyle='#4e8b64';c.lineWidth=2;c.beginPath();c.arc(0,1,6,0,Math.PI);c.stroke();c.restore();}
