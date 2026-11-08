import assert from 'node:assert/strict';
export function mockCanvas(){
 const cache=new Map();
 const checked=(name,fn=()=>{})=>(...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),`${name}: finite canvas argument`);if(name==='arc')assert.ok(args[2]>=0,'nonnegative arc radius');if(name==='ellipse')assert.ok(args[2]>=0&&args[3]>=0,'nonnegative ellipse radii');return fn(...args);};
 const gradient={addColorStop:checked('addColorStop')};
 const target={globalAlpha:1,lineWidth:1,shadowBlur:0,textAlign:'left',textBaseline:'alphabetic',canvas:{width:960,height:600},measureText:text=>({width:String(text).length*8}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0})};
 return new Proxy(target,{get(obj,key){if(key in obj)return obj[key];if(!cache.has(key))cache.set(key,checked(String(key)));return cache.get(key);},set(obj,key,value){if(typeof value==='number')assert.ok(Number.isFinite(value),`finite ${String(key)}`);obj[key]=value;return true;}});
}
export function testInput(held=[],pressed=[],pointer={}){return {held:key=>held.includes(key),pressed:key=>pressed.includes(key),pointer:{x:480,y:300,down:false,pressed:false,released:false,active:false,button:0,...pointer}};}
export function assertFiniteState(state,seen=new Set()){
 if(typeof state==='number')assert.ok(Number.isFinite(state),'finite game state');
 if(state&&typeof state==='object'&&!seen.has(state)){seen.add(state);for(const value of Object.values(state))assertFiniteState(value,seen);}
}
