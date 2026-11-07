const KEY='geach-arcade-v1';
export function loadData(storage){
 try{storage??=globalThis.localStorage;const raw=JSON.parse(storage.getItem(KEY)||'{}');const records={};for(const [id,r] of Object.entries(raw.records||{})){if(r&&Number.isFinite(r.best)&&r.best>=0)records[id]={best:Math.floor(r.best),plays:Number.isFinite(r.plays)?Math.max(0,Math.floor(r.plays)):0};}return {records,favorites:Array.isArray(raw.favorites)?raw.favorites.filter(x=>typeof x==='string'):[],sound:raw.sound===true};}catch{return {records:{},favorites:[],sound:false};}
}
export function saveData(data,storage){try{storage??=globalThis.localStorage;storage.setItem(KEY,JSON.stringify(data));return true;}catch{return false;}}
export const formatScore=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString('en-US');
