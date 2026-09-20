import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {encodeMrg,decodeMrg,START_SCALE} from '../src/shell/mrg.ts'
let n=0;export const check=(name,fn)=>{fn();n++;console.log('ok -',name)}
const track=(name,points)=>({name,start:[points[0][0]+10,points[0][1]+18],finish:[points.at(-1)[0]-10,0],points})
const simple=track('Lanka',[[0,100],[50,100],[100,80],[150,90]]),wide=track('Wide',[[0,0],[300,10],[299,12],[420,-140],[421,-139]]),pack={leagues:[[simple,wide],[simple],[wide]]}
check('round-trip зберігає ліги, назви, старт, фініш і точки',()=>assert.deepEqual(decodeMrg(encodeMrg(pack)),pack))
check('старт/фініш у файлі помножені на START_SCALE',()=>{const b=Buffer.from(encodeMrg({leagues:[[simple],[],[]]})),o=b.readInt32BE(4);assert.equal(b[o],0x33);assert.equal(b.readInt32BE(o+1),simple.start[0]*START_SCALE);assert.equal(START_SCALE,8192)})
check('дельта dx = -1 не плутається з escape',()=>assert.deepEqual(decodeMrg(encodeMrg({leagues:[[track('Minus',[[0,0],[-1,5],[-2,5]])],[],[]]})).leagues[0][0].points,[[0,0],[-1,5],[-2,5]]))
check('назва в .mrg лише ASCII',()=>{assert.throws(()=>encodeMrg({leagues:[[{...simple,name:'Ланка'}],[],[]]}),/ASCII/);assert.throws(()=>encodeMrg({leagues:[[{...simple,name:'x'.repeat(40)}],[],[]]}),/ASCII/)})
const original=process.env.GD_ORIGINAL_MRG;if(original&&existsSync(original))check('калібрування: оригінальний пак читається і пишеться байт у байт',()=>{const f=readFileSync(original),p=decodeMrg(f.buffer.slice(f.byteOffset,f.byteOffset+f.byteLength)),intro=p.leagues[0][0];assert.equal(intro.name,'Intro');assert.equal(intro.points.length,45);assert.deepEqual(intro.points[0],[-380,136]);assert.deepEqual(intro.start,[-49,24]);assert.deepEqual(intro.finish,[433,0]);assert.ok(Buffer.from(encodeMrg(p)).equals(f))});else console.log('skip - калібрування (GD_ORIGINAL_MRG не задано)')
console.log(`ok: ${n} checks`)
