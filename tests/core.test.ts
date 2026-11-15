import {test} from 'node:test';import assert from 'node:assert/strict';
import {publicRoom,validatedMove,type Room} from '../supabase/functions/wizards-chess-test/handler';
import {roomFromUrl} from '../src/links';
const game=():Room=>({code:'ABCDEF123456',white_hash:'white',black_hash:'black',white_name:'Alice',black_name:'Bob',fen:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',moves:[],turn:'w'});
test('app, Expo Go and browser challenge links resolve the same room',()=>{
 for(const url of ['wizardschess://challenge/ABCDEF123456','exp://192.168.1.2:8081/--/challenge/ABCDEF123456','https://example.test/?room=abcdef123456'])assert.equal(roomFromUrl(url),'ABCDEF123456');
 for(const url of [null,'wizardschess://challenge/ABCDEF1234567','wizardschess://challenge/nope'])assert.equal(roomFromUrl(url),'');
});
test('public state does not expose seat credentials',()=>{const state=publicRoom(game(),'watcher');assert.equal(state.color,'spectator');assert.equal(JSON.stringify(state).includes('white_hash'),false);assert.equal(publicRoom(game(),'white').color,'w');});
test('valid moves retain original board coordinates and queen promotion',()=>{const result=validatedMove(game(),'white',{seq:0,from:{r:6,c:4},to:{r:4,c:4}});assert.match(result.fen,/4P3/);assert.match(result.fen,/ b /);assert.equal(result.move.promotion,'queen');});
test('spectators, wrong turns, stale state and invalid coordinates cannot move',()=>{
 const move={seq:0,from:{r:6,c:4},to:{r:4,c:4}};
 assert.throws(()=>validatedMove(game(),'watcher',move),/Spectators/);
 assert.throws(()=>validatedMove(game(),'black',move),/changed/);
 assert.throws(()=>validatedMove(game(),'white',{...move,seq:1}),/changed/);
 assert.throws(()=>validatedMove(game(),'white',{...move,to:{r:3,c:4}}));
 assert.throws(()=>validatedMove(game(),'white',{...move,to:{r:-1,c:4}}),/Invalid square/);
});
