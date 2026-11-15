import {test} from 'node:test';import assert from 'node:assert/strict';
import {WizardAudio,validSoundSettings,DEFAULT_SOUND_SETTINGS} from '../game/src/audio';
function fixture(){
 const stored=new Map<string,string>();const messages:unknown[]=[];const events=new Map<string,()=>void>();
 const captions:Record<string,{textContent:string}>={'audio-ambient-caption':{textContent:''},'audio-event-caption':{textContent:''}};
 let started=0,stopped=0,created=0;const parameter=()=>({value:0,setValueAtTime(value:number){this.value=value},exponentialRampToValueAtTime(value:number){this.value=value},setTargetAtTime(value:number){this.value=value}});
 const node=()=>({gain:parameter(),frequency:parameter(),Q:parameter(),threshold:parameter(),ratio:parameter(),playbackRate:parameter(),connect(){},disconnect(){},start(){started++},stop(){stopped++},onended:null});
 class Context {
  state='suspended';sampleRate=8000;currentTime=0;destination={};constructor(){created++}
  createGain=node;createOscillator=node;createBufferSource=node;createBiquadFilter=node;createDynamicsCompressor=node;
  createBuffer(_channels:number,length:number){return {getChannelData:()=>new Float32Array(length)}}
  async resume(){this.state='running'}async suspend(){this.state='suspended'}async close(){this.state='closed'}
 }
 const document={hidden:false,getElementById:(id:string)=>captions[id],addEventListener:(type:string,fn:()=>void)=>events.set(type,fn),removeEventListener:(type:string)=>events.delete(type)};
 const descriptors=Object.fromEntries(['window','document','localStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 Object.defineProperty(globalThis,'window',{configurable:true,value:{AudioContext:Context,ReactNativeWebView:{postMessage:(text:string)=>messages.push(JSON.parse(text))}}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:document});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>stored.get(key)||null,setItem:(key:string,value:string)=>stored.set(key,value)}});
 const audio=new WizardAudio();
 return {audio,document,captions,events,stored,messages,started:()=>started,stopped:()=>stopped,created:()=>created,cleanup(){audio.dispose();for(const [key,descriptor]of Object.entries(descriptors)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key)}}};
}
test('sound preferences accept booleans only and retain independent switches',()=>{assert.deepEqual(validSoundSettings({ambient:false,moves:true,captures:false,subtitles:true}),{ambient:false,moves:true,captures:false,subtitles:true});assert.deepEqual(validSoundSettings({ambient:'false'}),DEFAULT_SOUND_SETTINGS);});
test('audio waits for a gesture, category mutes are independent, and captions remain available',async()=>{
 const f=fixture();try{
  f.audio.attachBrowser();assert.equal(f.created(),0);f.audio.setSettings({ambient:false});await f.audio.unlock();assert.equal(f.created(),1);
  let before=f.started();f.audio.playMove();assert(f.started()>before);
  f.audio.setSettings({moves:false});before=f.started();f.audio.playMove();assert.equal(f.started(),before);assert.equal(f.captions['audio-event-caption'].textContent,'[Stone piece moves]');
  f.audio.playHit();assert(f.started()>before);f.audio.setSettings({captures:false});before=f.started();f.audio.playHit();f.audio.playShatter();assert.equal(f.started(),before);
  assert.equal(f.captions['audio-event-caption'].textContent,'[Stone statue shatters]');
  f.audio.setSettings({subtitles:false});assert.equal(f.captions['audio-event-caption'].textContent,'');assert.equal(f.captions['audio-ambient-caption'].textContent,'');
  const saved=JSON.parse(f.stored.get('wizard-sound-settings')!);assert.equal(saved.moves,false);assert.equal(saved.captures,false);assert.equal(saved.ambient,false);assert(f.messages.length>0);
 }finally{f.cleanup()}
});
test('ambience does not duplicate and pauses while the app is hidden',async()=>{
 const f=fixture();try{
  f.audio.attachBrowser();await f.audio.unlock();assert.equal(f.started(),3);await f.audio.unlock();assert.equal(f.started(),3);
  f.document.hidden=true;f.events.get('visibilitychange')!();assert.equal(f.stopped(),3);
  f.document.hidden=false;f.events.get('visibilitychange')!();await Promise.resolve();assert.equal(f.started(),6);
  f.audio.setSettings({ambient:false});assert.equal(f.stopped(),6);
 }finally{f.cleanup()}
});
