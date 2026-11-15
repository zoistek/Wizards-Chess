import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Game from '../game/src/App';
const source=readFileSync(new URL('../game/src/wizardChessEngine.js',import.meta.url),'utf8');
const fn=source.match(/function toggleUI\(forceHidden\) \{[\s\S]*?\n    \}/)?.[0];assert(fn);
for(const mobile of [false,true])test(`Hide / Show UI restores controls on ${mobile?'phone':'desktop'}`,()=>{
 const classes=new Set<string>();let focused='';const ids=['btn-show-ui','btn-hide-ui','btn-mobile-controls'];
 const nodes=Object.fromEntries(ids.map(id=>[id,{hidden:id==='btn-show-ui',textContent:'',focus(){focused=id;}}]));
 const document={body:{classList:{contains:(name:string)=>classes.has(name),toggle(name:string,on:boolean){on?classes.add(name):classes.delete(name);}}},getElementById:(id:string)=>nodes[id]};
 const toggle=vm.runInNewContext('('+fn+')',{document,window:{matchMedia:()=>({matches:mobile})}});
 for(let i=0;i<3;i++){
  assert.equal(toggle(),true);assert(classes.has('cinematic-ui-hidden'));assert.equal(nodes['btn-show-ui'].hidden,false);assert.equal(focused,'btn-show-ui');
  assert.equal(toggle(false),false);assert(!classes.has('cinematic-ui-hidden'));assert.equal(nodes['btn-show-ui'].hidden,true);assert.equal(focused,mobile?'btn-mobile-controls':'btn-hide-ui');
 }
});
test('one restore button stays outside the hidden HUD',()=>{
 const html=renderToStaticMarkup(createElement(Game));assert.equal((html.match(/id="btn-show-ui"/g)||[]).length,1);assert(html.indexOf('id="btn-show-ui"')<html.indexOf('id="hud-top"'));assert.match(html,/<button[^>]*id="btn-show-ui"[^>]*hidden=""[^>]*>Show UI<\/button>/);
});
