import test from 'node:test';
import assert from 'node:assert/strict';
import {games} from '../src/catalog.js';
import {mockCanvas,testInput,assertFiniteState} from './arcade-harness.js';

for(const meta of games)test(`${meta.name}: seeded input, finite drawing, one terminal event`,async()=>{
 const {default:createGame}=await import(`../src/games/${meta.id}.js`);
 const original=Math.random;let seed=8937;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 try{
  let finishes=0;const api={width:960,height:600,score(value){assert.ok(Number.isFinite(value)&&value>=0,`${meta.id}: valid score`);},finish(){finishes++;assert.ok(finishes<=1,`${meta.id}: one finish`);},sound(){},burst(){}};
  const game=createGame(api),ctx=mockCanvas();assert.equal(typeof game.update,'function');assert.equal(typeof game.draw,'function');assert.equal(typeof game.inspect,'function',meta.id);
  game.draw(ctx,0);
  const directions=['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'];
  for(let frame=0;frame<1800;frame++){
   const dir=directions[Math.floor(frame/90)%4];const held=[dir,...(frame%60<30?['Space']:[])];
   const pressed=frame%30===0?[dir,'Space']:[];
   if(frame%180===0)pressed.push(`Digit${frame/180%9+1}`);
   game.update(1/60,testInput(held,pressed));
   if(frame%30===0){game.draw(ctx,frame/60);assertFiniteState(game.inspect());}
  }
  game.draw(ctx,30);assertFiniteState(game.inspect());game.destroy?.();
 }finally{Math.random=original;}
});
