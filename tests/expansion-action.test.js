import test from 'node:test';
import assert from 'node:assert/strict';
import starfighter from '../src/games/starfighter.js';
import missile from '../src/games/missile.js';
import lunar from '../src/games/lunar.js';
import arena from '../src/games/arena.js';
import jetpack from '../src/games/jetpack.js';
import dungeon from '../src/games/dungeon.js';
import bomber from '../src/games/bomber.js';
import platform from '../src/games/platform.js';
import digger from '../src/games/digger.js';
import centipede from '../src/games/centipede.js';
import {collection} from '../src/collections/action.js';
import {artwork} from '../src/collections/action-art.js';

const dt=1/60;
const input=(keys=[],press=[],pointer={})=>({held:k=>keys.includes(k),pressed:k=>press.includes(k),pointer:{x:480,y:300,down:false,pressed:false,released:false,active:false,...pointer}});
function harness(factory){let last=0;const scores=[],finishes=[];const game=factory({width:960,height:600,score(n){assert.ok(Number.isInteger(n)&&n>=last,`score must be finite, integral and monotonic: ${n} after ${last}`);last=n;scores.push(n);},finish(result){finishes.push(result);},sound(){},burst(x,y,color,count){assert.ok([x,y,count].every(Number.isFinite));}});return {game,scores,finishes};}
function frames(game,n,keys=[]){for(let i=0;i<n;i++)game.update(dt,input(keys));}
function seed(value,run){const old=Math.random;let n=value;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};try{return run();}finally{Math.random=old;}}
function pressMove(game,key){game.update(dt,input([key],[key]));frames(game,9);}

test('Star Patrol fires real projectiles, defeats ships, and advances a cleared wave',()=>seed(712,()=>{
  const {game}=harness(starfighter);const initial=game.inspect().remaining;
  for(let i=0;i<1500&&game.inspect().wave===1&&!game.inspect().over;i++){
    const s=game.inspect(),target=s.enemies[0],keys=['Space'];
    if(target){const lead=target.x+Math.cos(target.age*1.4)*112*Math.max(0,(s.ship.y-target.y)/650);if(Math.abs(lead-s.ship.x)>8)keys.push(lead>s.ship.x?'ArrowRight':'ArrowLeft');}
    game.update(dt,input(keys));
  }
  const s=game.inspect();assert.ok(s.kills>=initial);assert.equal(s.wave,2);assert.ok(s.score>=initial*100);assert.ok(s.ship.lives>0);
}));

test('Midnight Defense spends finite ammunition and a targeted explosion intercepts a threat',()=>seed(81,()=>{
  const {game}=harness(missile);frames(game,180);const threat=game.inspect().missiles[0];assert.ok(threat);
  game.update(dt,input([],[],{active:true,pressed:true,x:threat.x+threat.vx*.9,y:threat.y+threat.vy*.9}));
  assert.equal(game.inspect().batteries.reduce((n,b)=>n+b.ammo,0),35);assert.equal(game.inspect().rockets.length,1);
  frames(game,110);assert.ok(game.inspect().score>=25);assert.ok(game.inspect().cities.every(c=>c.alive));
  frames(game,600,['Space']);assert.ok(game.inspect().batteries.every(b=>b.ammo>=0));
}));

test('Lunar Post fuel and thrust oppose gravity and a gentle upright touchdown supplies a pad',()=>{
  const {game}=harness(lunar);frames(game,60);const coast=game.inspect().ship;frames(game,60,['Space']);const powered=game.inspect().ship;assert.ok(powered.fuel<coast.fuel);assert.ok(powered.vy<coast.vy);
  const landing=harness(lunar);
  for(let i=0;i<1200&&!landing.game.inspect().landings&&landing.game.inspect().lives===3;i++){const s=landing.game.inspect().ship;const thrust=s.vy>Math.sqrt(Math.max(0,2*60*(448-s.y)))*.8;landing.game.update(dt,input(thrust?['Space']:[]));}
  const s=landing.game.inspect();assert.equal(s.landings,1);assert.equal(s.lives,3);assert.equal(s.pads[0].done,true);assert.equal(s.ship.y,448);assert.ok(s.score>=500);assert.ok(s.pause>0);
});

test('Robot Recess auto-aim actually recycles robots and never moves through a pillar',()=>seed(31,()=>{
  const {game}=harness(arena);frames(game,900,['Space']);assert.ok(game.inspect().kills>=5);assert.ok(game.inspect().score>=250);
  frames(game,80,['ArrowLeft','ArrowUp','Space']);const s=game.inspect();for(const p of [{x:260,y:175},{x:700,y:175},{x:260,y:425},{x:700,y:425}])assert.ok(Math.hypot(s.player.x-p.x,s.player.y-p.y)>=43.99);
}));

test('Rocket Courier uses continuous held thrust, and floor parking cannot avoid every barrier',()=>seed(912,()=>{
  const {game}=harness(jetpack);frames(game,35,['Space']);const high=game.inspect().player;frames(game,35);const low=game.inspect().player;assert.ok(high.vy<0);assert.ok(low.vy>high.vy);assert.ok(game.inspect().distance>0);
  const idle=harness(jetpack);frames(idle.game,2400);assert.equal(idle.game.inspect().lives,0);assert.equal(idle.game.inspect().over,true);assert.equal(idle.finishes.length,1);
}));

test('Pocket Dungeon guards drop keys and all four room exits can be completed',()=>seed(114,()=>{
  const {game,finishes}=harness(dungeon);
  for(let room=1;room<=4;room++){
    for(let i=0;i<1800&&game.inspect().enemies.length&&!game.inspect().over;i++)game.update(dt,input(['Space']));
    assert.equal(game.inspect().enemies.length,0);assert.ok(game.inspect().keyItem);
    for(let i=0;i<300&&game.inspect().room===room&&!game.inspect().over;i++)game.update(dt,input(['Space','ArrowUp']));
    if(room<4){assert.equal(game.inspect().room,room+1);frames(game,100,['Space']);}
  }
  assert.equal(game.inspect().over,true);assert.equal(finishes.length,1);assert.equal(finishes[0].won,true);assert.ok(game.inspect().score>=4200);
}));

test('Secret Garden guarantees a safe corner escape and explosions destroy crates',()=>{
  const old=Math.random;Math.random=()=>.1;
  try{
    const {game}=harness(bomber);game.update(dt,input([],['Space']));frames(game,14);pressMove(game,'ArrowRight');pressMove(game,'ArrowRight');pressMove(game,'ArrowDown');
    assert.deepEqual([game.inspect().hero.x,game.inspect().hero.y],[3,2]);frames(game,150);assert.equal(game.inspect().lives,3);assert.equal(game.inspect().bombs.length,0);
    game.update(dt,input([],['Space']));frames(game,10);pressMove(game,'ArrowUp');pressMove(game,'ArrowLeft');pressMove(game,'ArrowLeft');frames(game,150);
    assert.equal(game.inspect().board[3][3],'.');assert.ok(game.inspect().score>=20);assert.equal(game.inspect().lives,3);
  }finally{Math.random=old;}
});

test('Secret Garden resumes normally after a nonterminal blast death',()=>seed(12,()=>{
  const {game,finishes}=harness(bomber);game.update(dt,input([],['Space']));frames(game,220);assert.equal(game.inspect().lives,2);assert.equal(game.inspect().dead,0);frames(game,15);pressMove(game,'ArrowRight');assert.equal(game.inspect().hero.x,2);assert.equal(finishes.length,0);
}));

test('Meadow Quest jumps high enough for its ledges and collects coins with contact',()=>{
  const {game}=harness(platform);frames(game,5);assert.ok(game.inspect().coins>0);frames(game,30);game.update(dt,input([],['Space']));let highest=game.inspect().hero.y;for(let i=0;i<55;i++){game.update(dt,input());highest=Math.min(highest,game.inspect().hero.y);}assert.ok(highest<340,'jump clears the tallest 145px ledges');assert.ok(game.inspect().lives===3);frames(game,50);assert.equal(game.inspect().hero.ground,true);
});

test('Gem Hollow awards gems, settles rocks, and has an attainable twelve-gem exit',()=>{
  const {game,finishes}=harness(digger);frames(game,22,['ArrowRight']);assert.equal(game.inspect().gems,1);assert.ok(game.inspect().score>=100);
  for(let step=0;step<250&&!game.inspect().over;step++){
    const s=game.inspect(),queue=[[s.hero.x,s.hero.y,[]]],seen=new Set([`${s.hero.x},${s.hero.y}`]);let route=null;
    while(queue.length){const [x,y,path]=queue.shift();if(s.map[y][x]==='*'||(s.gems>=12&&s.map[y][x]==='E')){route=path;break;}
      for(const [dx,dy,key]of [[0,-1,'ArrowUp'],[0,1,'ArrowDown'],[-1,0,'ArrowLeft'],[1,0,'ArrowRight']]){const nx=x+dx,ny=y+dy,t=s.map[ny]?.[nx],id=`${nx},${ny}`;if(!t||t==='#'||t==='O'||(t==='E'&&s.gems<12)||seen.has(id)||s.map[ny-1]?.[nx]==='O')continue;seen.add(id);queue.push([nx,ny,[...path,key]]);}}
    assert.ok(route?.length,'safe traversable route remains');game.update(dt,input([route[0]],[route[0]]));frames(game,8);
  }
  assert.ok(game.inspect().gems>=12);assert.equal(finishes.length,1);assert.equal(finishes[0].won,true);assert.ok(game.inspect().lives>0);
});

test('Garden Guardians starts with separated segments and progresses after real segment hits',()=>{
  const {game}=harness(centipede);const initial=game.inspect();assert.equal(new Set(initial.segments.map(s=>s.x)).size,initial.segments.length);assert.ok(initial.segments.every(s=>s.x>20));
  for(let i=0;i<1800&&game.inspect().wave===1&&!game.inspect().over;i++){const s=game.inspect(),target=s.segments.reduce((a,e)=>!a||e.y>a.y?e:a,null),keys=['Space'];if(target&&Math.abs(target.x-s.hero.x)>8)keys.push(target.x>s.hero.x?'ArrowRight':'ArrowLeft');game.update(dt,input(keys));}
  assert.equal(game.inspect().wave,2);assert.ok(game.inspect().score>=500);assert.ok(game.inspect().hero.lives>0);
});

test('Action catalog has ten unique complete entries and original standalone covers',()=>{
  assert.equal(collection.length,10);assert.equal(new Set(collection.map(g=>g.id)).size,10);
  for(const game of collection){assert.equal(game.genre,'Action');assert.ok(game.controls.length&&game.pads.length&&game.touch&&game.tip&&game.actionLabel);const svg=artwork(game.id);assert.ok(svg.startsWith('<svg '));assert.ok(svg.includes('viewBox="0 0 640 390"'));assert.ok(!svg.includes('https://'));}assert.equal(artwork('missing'),null);
});

function mockContext(){const gradient={addColorStop(){}};return new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,measureText:t=>({width:String(t).length*9})},{get(target,key){if(key in target)return target[key];return (...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),`non-finite ${String(key)} coordinate`);};},set(target,key,value){target[key]=value;return true;}});}
function finite(value){if(typeof value==='number')assert.ok(Number.isFinite(value));else if(Array.isArray(value))value.forEach(finite);else if(value&&typeof value==='object')Object.values(value).forEach(finite);}
for(const [name,factory]of Object.entries({starfighter,missile,lunar,arena,jetpack,dungeon,bomber,platform,digger,centipede})){
  test(`${name}: long variable-input simulation and Canvas rendering stay finite and finish at most once`,()=>seed(745,()=>{
    for(let run=0;run<3;run++){const {game,finishes}=harness(factory),ctx=mockContext();for(let i=0;i<4200;i++){const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].filter((k,n)=>Math.sin(i*.019+n*1.7+run)>0.25),press=i%17===0?keys:[];game.update(i%2?dt:dt/2,input(keys,press,{x:480+Math.sin(i*.013)*460,y:300+Math.cos(i*.017)*265,active:i%200<130,down:i%260<90,pressed:i%59===0}));if(i%60===0){game.draw(ctx,i/60);finite(game.inspect());}}assert.ok(finishes.length<=1);finite(game.inspect());}
  }));
}
