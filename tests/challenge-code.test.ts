import {test} from 'node:test';import assert from 'node:assert/strict';
import {normalizeChallengeCode,challengeCodeMessage} from '../src/challengeCode';
import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import Game from '../game/src/App';
test('pasted challenge codes accept spacing, hyphens and lowercase',()=>{
 for(const value of ['ABCDEF123456','abcdef123456','ABCD-EF12-3456',' ABCD EF12 3456 '])assert.equal(normalizeChallengeCode(value),'ABCDEF123456');
 for(const value of ['','ABCD','ABCDEF1234567','https://example.test/?room=ABCDEF123456'])assert.throws(()=>normalizeChallengeCode(value));
});
test('sharing contains a code only and no hosting address',()=>{
 const message=challengeCodeMessage('abcdef123456');assert.equal(message,'Wizards Chess challenge code: ABCDEF123456');assert(!/github|https?:|:\/\//i.test(message));
});
test('challenge screen offers separate create, paste/join and code-copy controls',()=>{
 const html=renderToStaticMarkup(createElement(Game));
 for(const id of ['challenge-start','challenge-code','challenge-join','challenge-invite-code','challenge-copy','challenge-share-code'])assert(html.includes('id="'+id+'"'));
 assert(html.includes('Copy challenge code'));assert(html.includes('Paste challenge code'));assert(!html.includes('Invite link'));assert(!html.includes('Copy challenge link'));assert(!html.includes('id="challenge-link"'));
});

test('sound settings show only the three audio switches, without subtitles',()=>{
 const html=renderToStaticMarkup(createElement(Game));
 assert(html.includes('Stone sliding / grinding'));assert(!html.includes('Sound captions'));assert(!html.includes('audio-event-caption'));assert(!html.includes('audio-ambient-caption'));assert.equal((html.match(/type="checkbox"/g)||[]).length,3);
});
