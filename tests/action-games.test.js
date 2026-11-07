import test from 'node:test';
import assert from 'node:assert/strict';
import crossing from '../src/games/crossing.js';
import racer from '../src/games/racer.js';
import hopper from '../src/games/hopper.js';
const dt=1/60;
function setup(factory){const scores=[],finishes=[];const game=factory({width:960,height:600,score:v=>scores.push(v),finish:v=>finishes.push(v),sound(){},burst(){}});return {game,scores,finishes};}
function input(keys=[],pressed=[],pointer={}){return {held:k=>keys.includes(k),pressed:k=>pressed.includes(k),pointer:{x:480,y:300,down:false,pressed:false,released:false,active:false,...pointer}};}
const idle=input();
function frames(game,count,keys=[]){for(let i=0;i<count;i++)game.update(dt,input(keys));}

test('Lily Leap respects the riverbanks and keeps idle players safe on the starting bank',()=>{const {game,finishes}=setup(crossing);frames(game,180,['ArrowLeft']);const state=game.inspect();assert.equal(state.row,9);assert.ok(state.x>=75&&state.x<=885);assert.equal(state.lives,3);assert.equal(finishes.length,0);});
test('Lily Leap awards forward progress only once per crossing',()=>{const {game}=setup(crossing);game.update(dt,input([],['ArrowUp']));assert.equal(game.inspect().score,10);frames(game,10);game.update(dt,input([],['ArrowDown']));frames(game,10);game.update(dt,input([],['ArrowUp']));assert.equal(game.inspect().score,10);});
test('Lily Leap handles timeout with one lost life and a fresh safe respawn',()=>{const {game,finishes}=setup(crossing);frames(game,3060);const state=game.inspect();assert.equal(state.lives,2);assert.equal(state.row,9);assert.ok(state.clock>49&&state.clock<=50);assert.equal(finishes.length,0);});
test('Lily Leap resumes movement after death and ends after the third lost life',()=>{const {game,finishes}=setup(crossing);frames(game,3060);game.update(dt,input([],['ArrowLeft']));assert.ok(game.inspect().x<480);frames(game,6200);assert.equal(game.inspect().lives,0);assert.equal(game.inspect().over,true);assert.equal(finishes.length,1);});
test('Night Drive clamps steering and accepts pointer steering',()=>{const {game}=setup(racer);frames(game,120,['ArrowLeft']);assert.ok(game.inspect().x>=282);game.update(dt,input([],[],{active:true,down:true,x:678}));frames(game,30,['ArrowRight']);assert.ok(game.inspect().x>282);assert.ok(game.inspect().x<=678);});
test('Night Drive measures distance, manages finite boost and survives long frame sequences',()=>{const {game,scores}=setup(racer);frames(game,90,['Space']);const boosted=game.inspect();assert.ok(boosted.speed>300);assert.ok(boosted.energy<100&&boosted.energy>=0);frames(game,60);const state=game.inspect();assert.ok(state.energy>boosted.energy);assert.ok(state.score>0);assert.ok(scores.every(Number.isFinite));assert.ok(Number.isFinite(state.x)&&Number.isFinite(state.speed));});
test('Cloud Hop waits safely for the first flap',()=>{const {game,finishes}=setup(hopper);frames(game,3600);const state=game.inspect();assert.equal(state.started,false);assert.equal(state.over,false);assert.equal(state.gates.length,0);assert.equal(finishes.length,0);});
test('Cloud Hop supports keyboard and pointer flaps and emits game over only once',()=>{const {game,finishes}=setup(hopper);game.update(dt,input([],[],{pressed:true,active:true}));assert.equal(game.inspect().started,true);assert.ok(game.inspect().vy<0);frames(game,120);assert.equal(game.inspect().over,true);assert.equal(finishes.length,1);frames(game,120);assert.equal(finishes.length,1);});
test('Cloud Hop generates passable gates during an automated steady flight',()=>{const {game}=setup(hopper);game.update(dt,input([],['Space']));for(let i=0;i<1800&&!game.inspect().over;i++){const state=game.inspect();const gate=state.gates.find(g=>g.x+g.w>265-13);const target=gate?gate.center:290;game.update(dt,input([],state.y>target+12&&state.vy>0?['Space']:[]));}const state=game.inspect();assert.equal(state.over,false);assert.ok(state.score>=8);assert.ok(state.gates.every(g=>g.gap>=172&&g.center-g.gap/2>60&&g.center+g.gap/2<548));});

test('Night Drive has no permanently safe lane midpoint or road-edge parking spot',()=>{
  const originalRandom=Math.random;
  try {
    for(const parkedX of [282,405,555,678]) {
      let seed=9371;
      Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      const {game}=setup(racer);
      const parked=input([],[],{active:true,down:true,x:parkedX});
      // Traffic appears after steering settles. Within four minutes every formerly
      // safe fixed position must encounter a car drifting naturally inside a lane.
      for(let frame=0;frame<60*240&&game.inspect().lives===3;frame++)game.update(dt,parked);
      const state=game.inspect();
      assert.ok(Math.abs(state.x-parkedX)<1,`steering reached ${parkedX}`);
      assert.ok(state.lives<3,`${parkedX} must not provide permanent collision immunity`);
    }
  } finally {Math.random=originalRandom;}
});
