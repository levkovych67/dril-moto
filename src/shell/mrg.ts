// Binary .mrg track pack codec, compatible with LevelLoader.
export interface MrgTrack { name: string; start: [number, number]; finish: [number, number]; points: [number, number][] }
export interface MrgPack { leagues: [MrgTrack[], MrgTrack[], MrgTrack[]] }
export const START_SCALE = 8192
const MARK = 0x33
const ESCAPE = -1
const NAME = /^[\x20-\x7e]{1,39}$/
const body = (t: MrgTrack) => {
  const a: number[] = [], i32 = (v:number) => a.push((v >>> 24)&255,(v>>>16)&255,(v>>>8)&255,v&255), i16=(v:number)=>a.push((v>>>8)&255,v&255), i8=(v:number)=>a.push(v&255)
  a.push(MARK); i32(t.start[0]*START_SCALE); i32(t.start[1]*START_SCALE); i32(t.finish[0]*START_SCALE); i32(t.finish[1]*START_SCALE); i16(t.points.length); i32(t.points[0][0]); i32(t.points[0][1])
  for (let n=1;n<t.points.length;n++) { const dx=t.points[n][0]-t.points[n-1][0],dy=t.points[n][1]-t.points[n-1][1]; if(dx>=-128&&dx<=127&&dy>=-128&&dy<=127&&dx!==ESCAPE){i8(dx);i8(dy)} else {i8(ESCAPE);i32(t.points[n][0]);i32(t.points[n][1])} }
  return Uint8Array.from(a)
}
export const encodeMrg = (pack: MrgPack): ArrayBuffer => {
  for (const t of pack.leagues.flat()) if (!NAME.test(t.name)) throw new Error(`назва «${t.name}»: у .mrg лише ASCII від пробілу до ~, 1–39 символів`)
  const bs=pack.leagues.map(l=>l.map(body)); let hs=0; for(const l of pack.leagues){hs+=4;for(const t of l)hs+=4+t.name.length+1}; const out=new Uint8Array(hs+bs.flat().reduce((s,b)=>s+b.length,0)),v=new DataView(out.buffer); let h=0,d=hs
  for(let l=0;l<3;l++){v.setInt32(h,pack.leagues[l].length);h+=4;for(let i=0;i<pack.leagues[l].length;i++){v.setInt32(h,d);h+=4;for(const c of pack.leagues[l][i].name)out[h++]=c.charCodeAt(0);out[h++]=0;out.set(bs[l][i],d);d+=bs[l][i].length}}
  return out.buffer
}
export const decodeMrg = (buffer: ArrayBuffer): MrgPack => {
  const v=new DataView(buffer),b=new Uint8Array(buffer),p0={p:0}, entries:[{name:string;offset:number}[],{name:string;offset:number}[],{name:string;offset:number}[]]=[[],[],[]]
  for(let l=0;l<3;l++){const count=v.getInt32(p0.p);p0.p+=4;for(let i=0;i<count;i++){const offset=v.getInt32(p0.p);p0.p+=4;let name='';while(b[p0.p]!==0)name+=String.fromCharCode(b[p0.p++]);p0.p++;entries[l].push({name,offset})}}
  const read=(name:string,offset:number):MrgTrack=>{let q=offset,mark=v.getInt8(q++);if(mark===0x32)q+=20;const start:[number,number]=[v.getInt32(q)/START_SCALE,v.getInt32(q+4)/START_SCALE],finish:[number,number]=[v.getInt32(q+8)/START_SCALE,v.getInt32(q+12)/START_SCALE];q+=16;const count=v.getInt16(q);q+=2;let x=v.getInt32(q),y=v.getInt32(q+4);q+=8;const points:[number,number][]=[[x,y]];for(let i=1;i<count;i++){const dx=v.getInt8(q++);if(dx===ESCAPE){x=v.getInt32(q);y=v.getInt32(q+4);q+=8}else{x+=dx;y+=v.getInt8(q++)}points.push([x,y])}return{name,start,finish,points}}
  return {leagues:[entries[0].map(e=>read(e.name,e.offset)),entries[1].map(e=>read(e.name,e.offset)),entries[2].map(e=>read(e.name,e.offset))]}
}
