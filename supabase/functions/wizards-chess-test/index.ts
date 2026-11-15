import { createClient } from '@supabase/supabase-js';
import { publicRoom, validatedMove, type Room } from './handler.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, apikey, x-wizard-token, authorization','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Cache-Control':'no-store'};
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async(req:Request)=>{
 const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 try{
  const token=req.headers.get('x-wizard-token')||'';
  if(!/^[a-f0-9]{64}$/.test(token))return json({message:'Invalid player token'},403);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
  const path=new URL(req.url).pathname.match(/\/rooms(?:\/([A-F0-9]{12}))?(?:\/(join|state|move))?\/?$/);
  if(!path)return json({message:'Route not found'},404);
  const code=path[1]||'',action=code?(path[2]||'state'):'create';
  if((action==='state'&&req.method!=='GET')||(action!=='state'&&req.method!=='POST'))return json({message:'Method not allowed'},405);
  if(Number(req.headers.get('content-length')||0)>4096)return json({message:'Request too large'},413);
  const text=req.method==='POST'?await req.text():'';if(text.length>4096)return json({message:'Request too large'},413);
  const body=text?JSON.parse(text):{};
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Invalid request');
  const name=String(body.name||'Player').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,24)||'Player';
  const params:Record<string,unknown>={p_action:action,p_code:code,p_hash:hash,p_name:name,p_color:body.color||'w'};
  if(action==='move'){
    const {data,error}=await db.rpc('wc_test_action',{p_action:'state',p_code:code,p_hash:hash});if(error)throw new Error(error.message);
    const valid=validatedMove(data as Room,hash,body);Object.assign(params,{p_seq:body.seq,p_move:valid.move,p_fen:valid.fen});
  }
  const {data,error}=await db.rpc('wc_test_action',params);if(error)throw new Error(error.message);
  return json(publicRoom(data as Room,hash));
 }catch(error){const message=error instanceof Error?error.message:'Could not process request';return json({message},/not found|expired/i.test(message)?404:/spectator/i.test(message)?403:/game changed/i.test(message)?409:400);}
});
