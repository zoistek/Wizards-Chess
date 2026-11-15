export type SoundSettings={ambient:boolean;moves:boolean;captures:boolean};
export const DEFAULT_SOUND_SETTINGS:SoundSettings={ambient:true,moves:true,captures:true};
const KEY='wizard-sound-settings';
export function validSoundSettings(value:unknown):SoundSettings {
 const v=value&&typeof value==='object'?value as Partial<SoundSettings>:{};
 return Object.fromEntries(Object.entries(DEFAULT_SOUND_SETTINGS).map(([key,fallback])=>[key,typeof v[key as keyof SoundSettings]==='boolean'?v[key as keyof SoundSettings]:fallback])) as SoundSettings;
}

export class WizardAudio {
 private settings={...DEFAULT_SOUND_SETTINGS};private loaded=false;
 private context:AudioContext|null=null;private master:GainNode|null=null;private buses:Partial<Record<'moves'|'captures'|'ambient',GainNode>>={};private noise:AudioBuffer|null=null;private slideNoise:AudioBuffer|null=null;private stoneDecode:Promise<void>|null=null;
 private slides=new Set<{source:AudioBufferSourceNode;nodes:AudioNode[]}>();
 private ambientNodes:AudioNode[]=[];private ambientSources:(AudioBufferSourceNode|OscillatorNode)[]=[];
 private crackleTimer:ReturnType<typeof setInterval>|null=null;
 private listeners=new Set<(s:SoundSettings)=>void>();private attached=false;
 getSettings(){
  if(!this.loaded&&typeof window!=='undefined'){
   this.loaded=true;
   try{this.settings=validSoundSettings(window.WC_SOUND_SETTINGS || JSON.parse(localStorage.getItem(KEY)||'null'));}catch{}
  }
  return {...this.settings};
 }
 subscribe(listener:(s:SoundSettings)=>void){this.listeners.add(listener);return()=>{this.listeners.delete(listener)};}
 setSettings(patch:Partial<SoundSettings>){
  this.settings=validSoundSettings({...this.getSettings(),...patch});
  try{localStorage.setItem(KEY,JSON.stringify(this.settings));}catch{}
  if(typeof window!=='undefined')window.ReactNativeWebView?.postMessage(JSON.stringify({type:'sound-settings',settings:this.settings}));
  if(this.context)for(const category of ['moves','captures','ambient'] as const)this.buses[category]?.gain.setTargetAtTime(this.settings[category]?1:0,this.context.currentTime,.02);
  if(!this.settings.moves)this.stopMoves();
  if(!this.settings.ambient)this.stopAmbient();else this.startAmbient();
  if(!this.settings.ambient&&!this.settings.moves&&!this.settings.captures)void this.context?.suspend();
  this.listeners.forEach(listener=>listener(this.getSettings()));
 }
 async unlock(){
  if(typeof window==='undefined')return;
  const enabled=this.getSettings();if(!enabled.ambient&&!enabled.moves&&!enabled.captures)return;
  if(!this.context){
   const Constructor=window.AudioContext || (window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
   if(!Constructor)return;
   this.context=new Constructor();this.master=this.context.createGain();this.master.gain.value=.55;
   const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=6;
   this.master.connect(limiter);limiter.connect(this.context.destination);
   for(const category of ['moves','captures','ambient'] as const){const gain=this.context.createGain();gain.gain.value=this.getSettings()[category]?1:0;gain.connect(this.master);this.buses[category]=gain;}
   this.noise=this.context.createBuffer(1,this.context.sampleRate*4,this.context.sampleRate);
   const samples=this.noise.getChannelData(0);let brown=0;
   for(let i=0;i<samples.length;i++){brown=(brown+(Math.random()*2-1)*.03)/1.03;samples[i]=brown*3;}

  }
  try{if(this.context.state!=='running')await this.context.resume();await this.loadStoneRecording();this.startAmbient();}catch{}
 }
 private loadStoneRecording(){
  if(this.stoneDecode)return this.stoneDecode;
  const encoded=window.WC_STONE_AUDIO,context=this.context;
  if(!encoded||!context)return Promise.resolve();
  const raw=atob(encoded),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  this.stoneDecode=context.decodeAudioData(bytes.buffer).then(buffer=>{if(this.context===context)this.slideNoise=buffer}).catch(()=>{this.stoneDecode=null});
  return this.stoneDecode;
 }
 private get active(){return this.context?.state==='running' && (typeof document==='undefined'||!document.hidden);}
 private noiseBurst(duration:number,gain:number,frequency:number,type:BiquadFilterType='lowpass',delay=0,category:'moves'|'captures'|'ambient'='captures'){
  if(!this.context||!this.master||!this.noise||!this.active)return;
  const c=this.context,start=c.currentTime+delay,source=c.createBufferSource(),filter=c.createBiquadFilter(),volume=c.createGain();
  source.buffer=this.noise;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.7;
  volume.gain.setValueAtTime(.0001,start);volume.gain.exponentialRampToValueAtTime(gain,start+.008);volume.gain.exponentialRampToValueAtTime(.0001,start+duration);
  source.connect(filter);filter.connect(volume);volume.connect(this.buses[category]||this.master);source.onended=()=>{source.disconnect();filter.disconnect();volume.disconnect()};
  source.start(start,Math.random()*2);source.stop(start+duration+.02);
 }
 private tone(frequency:number,duration:number,gain:number,delay=0,category:'moves'|'captures'='captures'){
  if(!this.context||!this.master||!this.active)return;
  const c=this.context,start=c.currentTime+delay,osc=c.createOscillator(),volume=c.createGain();osc.type='sine';osc.frequency.setValueAtTime(frequency,start);
  volume.gain.setValueAtTime(.0001,start);volume.gain.exponentialRampToValueAtTime(gain,start+.005);volume.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(volume);volume.connect(this.buses[category]||this.master);osc.onended=()=>{osc.disconnect();volume.disconnect()};osc.start(start);osc.stop(start+duration+.02);
 }
 playMove(duration=.7){
  if(!this.getSettings().moves)return;
  if(!this.active||!this.slideNoise){
   const requested=performance.now();
   void this.unlock().then(()=>{if(this.active&&this.slideNoise&&performance.now()-requested<250)this.playMove(duration)});
   return;
  }
  if(!this.context||!this.slideNoise||!this.master)return;
  const c=this.context,start=c.currentTime,length=Math.max(.08,duration),source=c.createBufferSource(),filter=c.createBiquadFilter(),volume=c.createGain();
  source.buffer=this.slideNoise;source.loop=true;source.playbackRate.value=.87+Math.random()*.06;
  // Recorded granite-on-granite friction keeps its natural low/mid stone resonance.
  filter.type='lowpass';filter.frequency.value=3600;filter.Q.value=.7;
  volume.gain.setValueAtTime(.0001,start);volume.gain.exponentialRampToValueAtTime(.7,start+.025);
  volume.gain.setValueAtTime(.7,start+Math.max(.03,length-.08));volume.gain.exponentialRampToValueAtTime(.0001,start+length);
  source.connect(filter);filter.connect(volume);volume.connect(this.buses.moves||this.master);
  const slide={source,nodes:[source,filter,volume]};this.slides.add(slide);
  source.onended=()=>{slide.nodes.forEach(node=>node.disconnect());this.slides.delete(slide)};
  source.start(start);source.stop(start+length+.02);
 }
 stopMoves(){
  for(const slide of this.slides){try{slide.source.stop()}catch{}slide.nodes.forEach(node=>node.disconnect())}
  this.slides.clear();
 }
 playHit(){if(!this.getSettings().captures)return;this.noiseBurst(.08,.45,3200,'highpass');for(const [f,g] of [[640,.16],[1070,.12],[1680,.075],[2420,.04]])this.tone(f,.38,g);}
 playShatter(){if(!this.getSettings().captures)return;this.noiseBurst(.55,.7,2400);this.tone(85,.24,.2);for(let i=0;i<5;i++)this.noiseBurst(.065,.11,1100+i*380,'bandpass',.07+i*.065);}
 private startAmbient(){
  if(!this.getSettings().ambient||!this.active||!this.context||!this.noise||!this.master||this.ambientSources.length)return;
  const c=this.context,wind=c.createBufferSource(),fire=c.createBufferSource(),windFilter=c.createBiquadFilter(),fireFilter=c.createBiquadFilter(),windGain=c.createGain(),fireGain=c.createGain(),lfo=c.createOscillator(),depth=c.createGain();
  wind.buffer=this.noise;wind.loop=true;windFilter.type='lowpass';windFilter.frequency.value=450;windGain.gain.value=.075;
  fire.buffer=this.noise;fire.loop=true;fire.playbackRate.value=1.6;fireFilter.type='highpass';fireFilter.frequency.value=850;fireGain.gain.value=.05;
  wind.connect(windFilter);windFilter.connect(windGain);windGain.connect(this.buses.ambient||this.master);
  fire.connect(fireFilter);fireFilter.connect(fireGain);fireGain.connect(this.buses.ambient||this.master);
  lfo.frequency.value=.12;depth.gain.value=.035;lfo.connect(depth);depth.connect(windGain.gain);
  this.ambientNodes=[wind,fire,windFilter,fireFilter,windGain,fireGain,lfo,depth];this.ambientSources=[wind,fire,lfo];wind.start();fire.start(0,1);lfo.start();
  this.crackleTimer=setInterval(()=>{if(this.active&&this.settings.ambient&&Math.random()>.35)this.noiseBurst(.025,.035+Math.random()*.025,2000,'highpass',0,'ambient');},650);
 }
 private stopAmbient(){
  if(this.crackleTimer)clearInterval(this.crackleTimer);this.crackleTimer=null;
  for(const source of this.ambientSources){try{source.stop()}catch{}}
  for(const node of this.ambientNodes)node.disconnect();this.ambientSources=[];this.ambientNodes=[];
 }
 private onGesture=()=>{void this.unlock()};
 private onVisibility=()=>{if(document.hidden){this.stopMoves();this.stopAmbient();void this.context?.suspend()}else if(this.context){void this.unlock()}};
 attachBrowser(){
  if(this.attached||typeof document==='undefined')return;this.attached=true;this.getSettings();
  document.addEventListener('pointerdown',this.onGesture,{passive:true});document.addEventListener('click',this.onGesture,{passive:true});document.addEventListener('keydown',this.onGesture);document.addEventListener('visibilitychange',this.onVisibility);
 }
 dispose(){
  this.stopMoves();this.stopAmbient();
  if(typeof document!=='undefined'){document.removeEventListener('pointerdown',this.onGesture);document.removeEventListener('click',this.onGesture);document.removeEventListener('keydown',this.onGesture);document.removeEventListener('visibilitychange',this.onVisibility);}
  void this.context?.close();this.context=null;this.buses={};this.stoneDecode=null;this.slideNoise=null;this.attached=false;
 }
}
export const wizardAudio=new WizardAudio();
