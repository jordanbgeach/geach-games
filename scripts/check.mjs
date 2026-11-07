import {readdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){let p=dir+'/'+e.name;if(e.isDirectory()) await walk(p); else if(p.endsWith('.js')||p.endsWith('.mjs')) execFileSync(process.execPath,['--check',p],{stdio:'inherit'});}}
await walk('src');await walk('scripts');
const html=await readFile('index.html','utf8');if(!html.includes('src="./src/app.js"')) throw Error('Entry path must support subdirectory hosting');
console.log('All JavaScript syntax and relative entry paths passed.');
