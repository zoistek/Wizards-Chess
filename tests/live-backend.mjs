import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';import config from '../config.json' with {type:'json'};
const tokens=[0,1,2].map(()=>randomBytes(32).toString('hex'));
const base=config.supabaseUrl+'/functions/v1/'+config.functionName+'/rooms';
async function call(path,who,body){const res=await fetch(base+path,{method:body?'POST':'GET',headers:{apikey:config.publishableKey,'Content-Type':'application/json','X-Wizard-Token':tokens[who]},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json()};}
const created=await call('',0,{name:'Test Creator',color:'w'});assert.equal(created.status,200,JSON.stringify(created));const code=created.data.room.code;assert.equal(created.data.color,'w');
const waiting=await call('/'+code+'/move',0,{seq:0,from:{r:6,c:4},to:{r:4,c:4}});assert.equal(waiting.status,409);
const [a,b]=await Promise.all([call('/'+code+'/join',1,{name:'Test Guest'}),call('/'+code+'/join',2,{name:'Test Watcher'})]);assert.deepEqual([a.data.color,b.data.color].sort(),['b','spectator']);const player=a.data.color==='b'?1:2,viewer=player===1?2:1;
const resumed=await call('/'+code+'/join',0,{name:'Test Creator'});assert.equal(resumed.data.color,'w');
const illegal=await call('/'+code+'/move',0,{seq:0,from:{r:6,c:4},to:{r:3,c:4}});assert.equal(illegal.status,400);
const white=await call('/'+code+'/move',0,{seq:0,from:{r:6,c:4},to:{r:4,c:4}});assert.equal(white.status,200,JSON.stringify(white));
const spectator=await call('/'+code+'/move',viewer,{seq:1,from:{r:1,c:4},to:{r:3,c:4}});assert.equal(spectator.status,403);
const black=await call('/'+code+'/move',player,{seq:1,from:{r:1,c:4},to:{r:3,c:4}});assert.equal(black.status,200,JSON.stringify(black));
const state=await call('/'+code+'/state',viewer);assert.equal(state.data.room.moves.length,2);assert.equal(JSON.stringify(state.data).includes('_hash'),false);
const duplicate=await call('/'+code+'/move',player,{seq:1,from:{r:1,c:4},to:{r:3,c:4}});assert.equal(duplicate.status,409);
console.log(JSON.stringify({passed:true,code,checks:['create','waiting for guest','concurrent joins assign one player and one spectator','reconnect','illegal move','white move','spectator rejected','black move','spectator receives both moves','duplicate rejected','seat credentials private']}));
