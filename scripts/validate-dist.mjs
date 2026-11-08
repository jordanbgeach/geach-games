import {readFile,stat,readdir} from 'node:fs/promises';
import {resolve,dirname,sep,extname} from 'node:path';
export async function validateDist(directory='dist'){
 const root=resolve(directory),html=await readFile(resolve(root,'index.html'),'utf8');let checked=0;
 async function exists(base,reference){
  if(!reference||reference.includes('${')||reference.startsWith('data:')||reference.startsWith('#'))return;
  if(/^(https?:)?\/\//.test(reference))throw Error(`Production asset must be local: ${reference}`);
  const file=resolve(base,reference.split(/[?#]/)[0]);
  if(!file.startsWith(root+sep))throw Error(`Asset escapes build directory: ${reference}`);
  if(!(await stat(file)).isFile())throw Error(`Missing production file: ${file}`);checked++;
 }
 for(const m of html.matchAll(/<(?:script|img)\b[^>]*\bsrc="([^"]+)"|<link\b[^>]*\bhref="([^"]+)"/g))await exists(root,m[1]||m[2]);
 async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=resolve(dir,entry.name);if(entry.isDirectory()){await walk(file);continue;}const extension=extname(file);if(!['.js','.css'].includes(extension))continue;const source=await readFile(file,'utf8');if(extension==='.js'){for(const m of source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)(['"`])([^'"`]+)\1/g))if(m[2].startsWith('.'))await exists(dirname(file),m[2]);}else{for(const m of source.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g))await exists(dirname(file),m[1]);}}}
 await walk(root);
 const {games}=await import('../src/catalog.js');
 const match=html.match(/src="\.\/(releases\/[^/]+)\/src\/app\.js"/);if(!match)throw Error('Build must reference versioned production assets.');
 for(const game of games)await exists(root,`${match[1]}/src/games/${game.id}.js`);
 if(games.length!==40)throw Error('This release must contain forty games.');
 return {games:games.length,references:checked};
}
