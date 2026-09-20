import {readdirSync,readFileSync,writeFileSync} from 'node:fs'
import {encodeMrg} from '../src/shell/mrg.ts'
const dir=new URL('../tracks/dev/',import.meta.url),tracks=readdirSync(dir).filter(f=>f.endsWith('.json')).sort().map(f=>JSON.parse(readFileSync(new URL(f,dir),'utf8')))
writeFileSync(new URL('../src/assets/dev-pack.mrg',import.meta.url),Buffer.from(encodeMrg({leagues:[tracks,[tracks[0]],[tracks[0]]]})));console.log('ok - dev-pack.mrg:',tracks.map(t=>t.name).join(', '))
