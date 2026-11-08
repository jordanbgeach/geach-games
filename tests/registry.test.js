import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {games,byId} from '../src/catalog.js';
import {artwork} from '../src/art.js';

test('the arcade registers forty distinct games with working controls and covers',async()=>{
 assert.equal(games.length,40);assert.equal(new Set(games.map(g=>g.id)).size,40);assert.equal(new Set(games.map(g=>g.name)).size,40);
 for(const g of games){
  assert.match(g.id,/^[a-z0-9]+$/);assert.equal(byId(g.id),g);
  for(const field of ['name','tagline','description','genre','label','difficulty','touch','tip'])assert.ok(typeof g[field]==='string'&&g[field].trim().length>1,`${g.id}: ${field}`);
  assert.ok(g.controls.length>0&&g.controls.every(c=>c.length===2&&c.every(x=>typeof x==='string')));
  if(g.pads)assert.ok(g.pads.every(k=>['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(k)),`${g.id}: supported touch controls`);
  assert.ok((await stat(new URL(`../src/games/${g.id}.js`,import.meta.url))).isFile());
  const module=await import(`../src/games/${g.id}.js`);assert.equal(typeof module.default,'function',g.id);
  const cover=artwork(g.id);assert.match(cover,/<svg/);assert.match(cover,/viewBox=["']0 0 640 390["']/);assert.ok(cover.length>200,g.id);assert.ok(!/NaN|undefined|Infinity/.test(cover),g.id);
 }
 assert.equal(byId('missing'),undefined);
});

test('all category filters refer to populated groups and existing ten-game records keep their IDs',()=>{
 for(const genre of ['Action','Classics','Puzzle','Strategy','Cards'])assert.ok(games.some(g=>g.genre===genre),genre);
 assert.deepEqual(games.slice(0,10).map(g=>g.id),['asteroids','breakout','snake','invaders','blocks','pong','crossing','racer','hopper','merge']);
});

test('source navigation advertises the expanded collection and keeps subdirectory-safe assets',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(!/\b[Tt]en\b|ALL 10 GAMES|01 \/ 10/.test(html));
 assert.ok(html.includes('./src/app.js'));assert.ok(html.includes('data-game-count>40'));
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 assert.ok(app.includes('meta.pads'));assert.ok(app.includes('meta.actionLabel'));
});
