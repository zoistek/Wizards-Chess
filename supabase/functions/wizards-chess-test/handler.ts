import { Chess } from 'chess.js';
export type Room = {code:string; white_hash:string|null;black_hash:string|null;white_name:string|null;black_name:string|null;fen:string;moves:unknown[];turn:'w'|'b'};
export function publicRoom(g:Room,hash:string) {
  const names:Record<string,string>={};if(g.white_hash)names.w=g.white_name||'White';if(g.black_hash)names.b=g.black_name||'Black';
  return {ok:true,color:g.white_hash===hash?'w':g.black_hash===hash?'b':'spectator',room:{code:g.code,moves:g.moves,names,whiteJoined:!!g.white_hash,blackJoined:!!g.black_hash}};
}
export function validatedMove(g:Room,hash:string,body:Record<string,unknown>) {
  const side=g.white_hash===hash?'w':g.black_hash===hash?'b':'spectator';
  if(side==='spectator')throw new Error('Spectators cannot move');
  if(!g.white_hash||!g.black_hash||g.turn!==side||body.seq!==g.moves.length)throw new Error('Game changed. Reconnect and try again');
  const square=(value:unknown)=>{const v=value as {r:number;c:number};if(!v||!Number.isInteger(v.r)||!Number.isInteger(v.c)||v.r<0||v.r>7||v.c<0||v.c>7)throw new Error('Invalid square');return 'abcdefgh'[v.c]+(8-v.r);};
  const chess=new Chess(g.fen);if(chess.isCheckmate()||chess.isStalemate())throw new Error('Game has ended');
  const move=chess.move({from:square(body.from),to:square(body.to),promotion:'q'});
  if(move.isEnPassant())throw new Error('En passant is not supported by the original animation engine');
  return {fen:chess.fen(),move:{from:body.from,to:body.to,promotion:'queen'}};
}
