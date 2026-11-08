const W=960,H=600,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export default function createJetpack(api){
  const player={x:220,y:310,vy:0};let time=0,distance=0,score=0,coins=0,lives=3,inv=1.5,over=false,spawn=1.8,jet=false,obstacles=[],tokens=[],nextCoin=0,hazards=0;
  function finish(won){if(over)return;over=true;api.sound(won?'win':'lose');api.finish({title:won?'Express delivery complete':'A little rocket science',message:`${Math.floor(distance)} m flown · ${coins} coins · ${score} points`,won});}
  return {
    update(dt,input){if(over)return;time+=dt;inv=Math.max(0,inv-dt);jet=input.held('Space')||input.held('ArrowUp')||input.held('KeyW')||input.pointer.down;player.vy+=((jet?-690:500)-player.vy*.65)*dt;player.vy=clamp(player.vy,-310,350);player.y+=player.vy*dt;
      if(player.y<82){player.y=82;player.vy=Math.max(0,player.vy);}if(player.y>510){player.y=510;player.vy=Math.min(0,player.vy);}
      const speed=215+Math.min(distance*.035,80);distance+=speed*dt*.13;score=Math.floor(distance)+coins*25;api.score(score);spawn-=dt;nextCoin-=dt;
      if(spawn<=0){const h=105+Math.random()*65,kind=hazards++%3,y=kind===0?532-h/2:kind===1?73+h/2:175+Math.random()*250;obstacles.push({x:W+70,y,h,w:22,phase:Math.random()*6,moving:kind===2&&distance>400&&Math.random()<.4});spawn=1.65+Math.random()*.55;}
      if(nextCoin<=0){const base=135+Math.random()*320;for(let i=0;i<7;i++)tokens.push({x:W+50+i*30,y:base+Math.sin(i/6*Math.PI)*35});nextCoin=2.6;}
      for(let i=obstacles.length-1;i>=0;i--){const o=obstacles[i];o.x-=speed*dt;const oy=o.y+(o.moving?Math.sin(time*1.6+o.phase)*55:0);if(inv<=0&&Math.abs(o.x-player.x)<o.w/2+17&&Math.abs(oy-player.y)<o.h/2+17){lives--;inv=1.8;api.sound('lose');api.burst(player.x,player.y,'#f0aa7d',20);if(lives===0){finish(false);return;}}if(o.x< -50)obstacles.splice(i,1);}
      for(let i=tokens.length-1;i>=0;i--){const t=tokens[i];t.x-=speed*dt;if(Math.hypot(t.x-player.x,t.y-player.y)<29){tokens.splice(i,1);coins++;api.sound('score');api.burst(t.x,t.y,'#ead189',4);}else if(t.x< -30)tokens.splice(i,1);}
      if(distance>=1800)finish(true);
    },
    draw(c){c.fillStyle='#142636';c.fillRect(0,0,W,H);const scroll=distance/.13;c.fillStyle='#203b49';for(let i=0;i<9;i++){const x=((i*160-scroll*.25)%1440+1440)%1440-160;c.fillRect(x,80,126,440);c.fillStyle='#294b55';c.fillRect(x+12,96,102,4);c.fillStyle='#203b49';}c.strokeStyle='#35535b';c.lineWidth=2;for(let i=0;i<8;i++){let x=((i*180-scroll*.55)%1440+1440)%1440-180;c.strokeRect(x,160,100,230);c.beginPath();c.moveTo(x+10,175);c.lineTo(x+90,375);c.stroke();}
      c.fillStyle='#435d58';c.fillRect(0,45,W,25);c.fillRect(0,532,W,68);c.fillStyle='#b6c49b';c.fillRect(0,69,W,4);c.fillRect(0,528,W,5);c.fillStyle='#263e43';for(let i=0;i<40;i++){let x=((i*42-scroll)%1680+1680)%1680-42;c.beginPath();c.moveTo(x,548);c.lineTo(x+15,548);c.lineTo(x-5,566);c.lineTo(x-20,566);c.fill();}
      for(const o of obstacles){const y=o.y+(o.moving?Math.sin(time*1.6+o.phase)*55:0);c.fillStyle='#da976f';c.beginPath();c.roundRect(o.x-11,y-o.h/2,22,o.h,6);c.fill();c.strokeStyle='#f4d393';c.lineWidth=3;c.beginPath();c.moveTo(o.x,y-o.h/2+12);for(let j=0;j<o.h-24;j+=12)c.lineTo(o.x+(j%24?5:-5),y-o.h/2+12+j);c.stroke();c.fillStyle='#58656b';for(const dy of [-o.h/2,o.h/2]){c.beginPath();c.roundRect(o.x-19,y+dy-8,38,16,5);c.fill();}}
      for(const t of tokens){c.fillStyle='#ead291';c.beginPath();c.ellipse(t.x,t.y,7+Math.abs(Math.cos(time*5+t.x*.02))*3,10,0,0,Math.PI*2);c.fill();c.strokeStyle='#a98e57';c.lineWidth=1;c.stroke();}
      c.save();c.translate(player.x,player.y);c.rotate(clamp(player.vy/1100,-.25,.3));c.globalAlpha=inv>0?.6:1;if(jet){c.fillStyle='#eead77';c.beginPath();c.moveTo(-19,10);c.lineTo(-37,36+Math.sin(time*55)*7);c.lineTo(-8,16);c.fill();c.fillStyle='#f0dda7';c.beginPath();c.moveTo(-18,15);c.lineTo(-27,30);c.lineTo(-12,17);c.fill();}c.fillStyle='#9faeb6';c.beginPath();c.roundRect(-23,-8,13,28,4);c.fill();c.fillStyle='#c4e3bd';c.beginPath();c.roundRect(-10,-4,25,31,6);c.fill();c.fillStyle='#e5d7b4';c.beginPath();c.arc(5,-13,15,0,Math.PI*2);c.fill();c.fillStyle='#426c7b';c.beginPath();c.roundRect(0,-20,18,12,5);c.fill();c.fillStyle='#b7cba5';c.fillRect(-7,22,8,12);c.fillRect(8,22,8,12);c.restore();
      c.fillStyle='#c6dac5';c.font='600 13px monospace';c.textAlign='left';c.fillText('♥ '.repeat(lives),25,30);c.textAlign='center';c.fillText(`COINS ${coins}`,480,30);c.textAlign='right';c.fillText(`${Math.floor(distance)} / 1800 m`,935,30);c.fillStyle='#1d353d';c.fillRect(25,579,910,5);c.fillStyle='#b5d89f';c.fillRect(25,579,910*Math.min(1,distance/1800),5);c.textAlign='left';
    },
    inspect:()=>({score,time,distance,coins,lives,inv,jet,over,player:{...player},obstacles:obstacles.map(o=>({...o})),tokens:tokens.map(t=>({...t}))})
  };
}
