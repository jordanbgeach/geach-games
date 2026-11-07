import {cp,mkdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true}); await mkdir('dist',{recursive:true});
for(const file of ['index.html','src','assets','.htaccess']) await cp(file,`dist/${file}`,{recursive:true});
console.log('Built dist/ — upload its contents to public_html/games/ on Hostinger.');
