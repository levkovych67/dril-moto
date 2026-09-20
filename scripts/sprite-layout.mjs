export const STEP_DEG=11.25
export const SHEETS=[
 {file:'helmet.png',width:48,height:48,cols:6,rows:6,used:32,kind:'turn',levelFrame:0,what:'шолом вершника'},
 {file:'engine.png',width:120,height:120,cols:6,rows:6,used:32,kind:'turn',levelFrame:0,what:'рама й двигун байка'},
 {file:'fender.png',width:108,height:108,cols:6,rows:6,used:32,kind:'turn',levelFrame:1,what:'заднє крило'},
 {file:'bluearm.png',width:48,height:24,cols:6,rows:3,used:16,kind:'limb',what:'рука'},
 {file:'blueleg.png',width:72,height:36,cols:6,rows:3,used:16,kind:'limb',what:'нога'},
 {file:'bluebody.png',width:60,height:30,cols:6,rows:3,used:16,kind:'limb',what:'тулуб'}]
export const frameDirection=(s,i)=>{const a=((i-(s.levelFrame||0))*STEP_DEG*Math.PI)/180;return s.kind==='turn'?[Math.cos(a),-Math.sin(a)]:[Math.sin(a),-Math.cos(a)]}
export const SPRITES_PNG={file:'sprites.png',width:49,height:40}
export const SPRITES=[{no:0,x:0,y:10,w:15,h:15,race:true,what:'тонка шина'},{no:1,x:0,y:25,w:15,h:15,race:true,what:'товста шина'},{no:2,x:15,y:16,w:8,h:4,race:false,what:'стрілка вгору'},{no:3,x:15,y:20,w:8,h:4,race:false,what:'стрілка вниз'},{no:4,x:15,y:10,w:3,h:3,race:true,what:'шарнір'},{no:5,x:0,y:0,w:6,h:10,race:false,what:'медаль'},{no:6,x:6,y:0,w:6,h:10,race:false,what:'медаль'},{no:7,x:12,y:0,w:6,h:10,race:false,what:'медаль'},{no:8,x:18,y:8,w:7,h:8,race:false,what:'замок'},{no:9,x:18,y:0,w:7,h:8,race:false,what:'замок'},{no:10,x:25,y:0,w:12,h:6,race:true,what:'прапор'},{no:11,x:25,y:6,w:12,h:6,race:true,what:'прапор'},{no:12,x:25,y:12,w:12,h:6,race:true,what:'прапор'},{no:13,x:37,y:0,w:12,h:6,race:true,what:'фініш'},{no:14,x:37,y:6,w:12,h:6,race:true,what:'фініш'},{no:15,x:37,y:12,w:12,h:6,race:true,what:'фініш'},{no:16,x:15,y:29,w:16,h:11,race:false,what:'прозоре місце'},{no:17,x:32,y:18,w:17,h:22,race:false,what:'прозоре місце'}]
export const RASTER_PNG={file:'raster.png',width:64,height:64}
