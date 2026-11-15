import {test} from 'node:test';import assert from 'node:assert/strict';import {readdirSync,readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
test('all original scene models and animation clips are bundled offline',()=>{
 const directory=new URL('../game/models/',import.meta.url);const files=readdirSync(directory).filter(f=>f.endsWith('.bin'));assert.equal(files.length,7);
 let clips=0;for(const file of files){const data=gunzipSync(readFileSync(new URL(file,directory)));assert.equal(data.toString('ascii',0,4),'glTF');const length=data.readUInt32LE(12);const model=JSON.parse(data.toString('utf8',20,20+length));assert(model.meshes.length>0);assert((model.images||[]).every((i:{bufferView?:number})=>i.bufferView!==undefined));if(file!=='option8_cathedral.bin'){assert.equal(model.animations.length,4);clips+=model.animations.length;}}
 assert.equal(clips,24);
});
