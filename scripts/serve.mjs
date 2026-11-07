import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.argv.includes('--dist')?'dist':'.');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.md':'text/plain','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
  try {
    let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(path==='/games') {res.writeHead(301,{Location:'/games/'});res.end();return;}
    if(path.startsWith('/games/')) path=path.slice(6);
    let file=resolve(root,'.'+path);
    if(file!==root&&!file.startsWith(root+sep)) {res.writeHead(403);res.end();return;}
    if((await stat(file)).isDirectory()) file=resolve(file,'index.html');
    const body=await readFile(file); res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body);
  } catch {res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
});
const port=Number(process.env.PORT)||4188;
server.listen(port,'127.0.0.1',()=>console.log(`Geach Games is ready at http://127.0.0.1:${port}/games/`));
