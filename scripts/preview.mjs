import http from 'node:http';import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../assets/game.html',import.meta.url));
http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html)}).listen(4173,'0.0.0.0',()=>console.log('Browser test: http://localhost:4173 (bot and Supabase multiplayer)'));
