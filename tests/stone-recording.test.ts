import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('movement uses a bundled PCM stone recording with audible signal',()=>{
 const wav=readFileSync(new URL('../game/audio/stone-grind.wav',import.meta.url));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
 let pcm:Buffer|undefined,sampleRate=0,channels=0;
 for(let p=12;p+8<=wav.length;){const size=wav.readUInt32LE(p+4),tag=wav.toString('ascii',p,p+4);if(tag==='fmt '){assert.equal(wav.readUInt16LE(p+8),1);channels=wav.readUInt16LE(p+10);sampleRate=wav.readUInt32LE(p+12);assert.equal(wav.readUInt16LE(p+22),16);}if(tag==='data')pcm=wav.subarray(p+8,p+8+size);p+=8+size+(size%2);}
 assert(pcm);assert.equal(channels,1);assert.equal(sampleRate,44100);const duration=pcm.length/(2*channels*sampleRate);assert(duration>.4&&duration<.6);
 let sum=0;for(let i=0;i<pcm.length;i+=2)sum+=(pcm.readInt16LE(i)/32768)**2;assert(Math.sqrt(sum/(pcm.length/2))>.1);
 const credit=readFileSync(new URL('../licenses/stone-grind.txt',import.meta.url),'utf8');assert(credit.includes('CC0'));assert(credit.includes('Mediaman57'));
});
