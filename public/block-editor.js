import {m,linesOf,describe,releaseLines,similarFontName} from './engine.js';
import {imageRecords} from './image-pdf.js';
const KEY='TextoPDFBlocks';
let fontSequence=0;
export function blocksOf(page){
 const saved=page.getObject().get(KEY);if(!saved.isNull()){try{const r=JSON.parse(saved.asString());if(Array.isArray(r))return r;}catch{}}
 const image=imageRecords(page);if(image)return image.map(l=>({...l,raster:true,rects:[l.box]}));
 const raw=linesOf(page);const records=raw.map(l=>({...describe(l),origin:l.chars[0].origin,rects:[l.box],raster:false}));releaseLines(raw);return records;
}
function chosenFont(name,bold,italic){const base=/courier|mono/i.test(name)?'Courier':/times|serif|roman|georgia/i.test(name)?'Times':'Helvetica';return base==='Times'?(bold?(italic?'Times-BoldItalic':'Times-Bold'):(italic?'Times-Italic':'Times-Roman')):base+(bold?(italic?'-BoldOblique':'-Bold'):(italic?'-Oblique':''));}
export function wrapText(text,font,size,width){
 const measure=t=>[...t].reduce((n,c)=>n+font.advanceGlyph(font.encodeCharacter(c.codePointAt(0)))*size,0);
 const result=[];
 for(const paragraph of text.replace(/\r/g,'').split('\n')){
  let line='';for(const token of paragraph.match(/\S+\s*|\s+/g)||[]){
   if(measure(line+token.trimEnd())<=width+.1){line+=token;continue;}
   if(line.trim()){result.push(line.trimEnd());line='';}
   for(const c of token){if(measure(line+c)>width+.1&&line){result.push(line.trimEnd());line='';}if(measure(c)>width)throw Error('Amplía el ancho del cuadro.');line+=c;}
  }result.push(line.trimEnd());
 }return result;
}
export function editBlock(doc,index,payload){
 const page=doc.loadPage(index);let font,sourceLines;
 try{
 const records=blocksOf(page),old=payload.line==null?null:records[payload.line],bounds=page.getBounds();
 if(payload.line!=null&&!old)throw Error('No se encontró el texto.');
 if(old&&!old.editable)throw Error('Este texto tiene un formato no compatible.');
 const target=[...(payload.box||old?.box||[])];if(!payload.box&&old)target[3]=Math.min(bounds[3],Math.max(target[3],target[1]+old.size*1.4)); if(!target||target.length!==4||!target.every(Number.isFinite)||target[2]<=target[0]||target[3]<=target[1]||target[0]<bounds[0]-.1||target[1]<bounds[1]-.1||target[2]>bounds[2]+.1||target[3]>bounds[3]+.1)throw Error('El cuadro debe quedar dentro de la página.');
 const style=payload.style||{},text=payload.text??old?.text??'',size=Number(style.size??old?.size??14);
 if(!Number.isFinite(size)||size<4||size>150)throw Error('El tamaño debe estar entre 4 y 150 pt.');
 const family=style.font&&style.font!=='original'?style.font:similarFontName(old?.font||'Helvetica');
 const bold=style.bold??old?.bold??/bold|heavy|black|demi/i.test(old?.font||''),italic=style.italic??old?.italic??/italic|oblique/i.test(old?.font||'');
 // Reuse the embedded font when its glyphs and style are available.
 if(old&&!old.raster&&(!style.font||style.font==='original')&&bold===(old.bold??/bold|heavy|black|demi/i.test(old.font))&&italic===(old.italic??/italic|oblique/i.test(old.font))){
  sourceLines=linesOf(page);
  const anchor=old.origin;
  const candidate=sourceLines.find(l=>l.chars.length&&(anchor?Math.abs(l.chars[0].origin[0]-anchor[0])<.2&&Math.abs(l.chars[0].origin[1]-anchor[1])<.2:l.text===old.text));
  const original=candidate?.chars[0].font;
  if(original&&[...text].every(c=>c==='\n'||c==='\r'||original.encodeCharacter(c.codePointAt(0))))font=original;
 }
 if(!font)font=new m.Font(chosenFont(family,bold,italic));
 const color=style.color||old?.color||[0,0,0],underline=style.underline??old?.underline??false;
 if(!Array.isArray(color)||color.length!==3||!color.every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw Error('Color no válido.');
 if([...text].some(c=>c!=='\n'&&c!=='\r'&&!font.encodeCharacter(c.codePointAt(0))))throw Error('Hay un carácter no compatible con esta fuente.');
 const alignment=style.alignment??old?.alignment??'left';if(!['left','center','right','justify'].includes(alignment))throw Error('Alineación no válida.');
 const xscale=old?.xscale||1;const paragraphRows=payload.remove?[]:text.replace(/\r/g,'').split('\n').map(t=>wrapText(t,font,size,(target[2]-target[0])/xscale));const rows=paragraphRows.flat();const lastRows=new Set();let rowCount=0;for(const group of paragraphRows){rowCount+=group.length;lastRows.add(rowCount-1);}
 const lineHeight=size*1.3;
 // A PDF box top is not the baseline. Keep the original baseline offset,
 // including after a second edit, moving the box, or reopening the PDF.
 const baselineOffset=old?.origin?old.origin[1]-old.box[1]:size*1.05;
 const startX=target[0]+(old?.origin&&alignment==='left'&&(!old.alignment||old.alignment==='left')?old.origin[0]-old.box[0]:0);
 const baseline=target[1]+baselineOffset;
 if(payload.autoGrow)target[3]=Math.min(bounds[3],Math.max(target[3],target[1]+rows.length*lineHeight));
 if(rows.length*lineHeight>target[3]-target[1]+1)throw Error('Amplía la altura del cuadro para que entre todo el texto.');
 const sourceRects=old?.rects||[old?.box];
 if(old&&sourceRects.some(rect=>records.some((other,i)=>i!==payload.line&&(other.rects||[other.box]).some(b=>Math.min(b[2],rect[2])-Math.max(b[0],rect[0])>.4&&Math.min(b[3],rect[3])-Math.max(b[1],rect[1])>.4))))throw Error('El texto se cruza con otro. Deshaz el movimiento antes de editarlo.');
 const fontRef=doc.addFont(font);
 if(old){for(const rect of sourceRects){const a=page.createAnnotation('Redact');a.setRect([rect[0]+.05,rect[1]+.05,rect[2]-.05,rect[3]-.05]);}page.applyRedactions(false,old.raster?2:0,0,0);}
 const obj=page.getObject(),resources=doc.newDictionary();obj.getInheritable('Resources').forEach((v,k)=>resources.put(k,v));const fonts=doc.newDictionary();resources.get('Font').forEach((v,k)=>fonts.put(k,v));const key='Block'+Date.now()+'_'+(++fontSequence);fonts.put(key,fontRef);resources.put('Font',fonts);obj.put('Resources',resources);
 const inverse=m.Matrix.invert(page.getTransform());let content=`\nQ\nq ${inverse.join(' ')} cm\n`;
 if(old?.raster)for(const r of sourceRects)content+=`1 1 1 rg ${r[0]} ${r[1]} ${r[2]-r[0]} ${r[3]-r[1]} re f\n`;
 const rects=[];
 for(let i=0;i<rows.length;i++){
  const row=rows[i],glyphs=[...row].map(c=>font.encodeCharacter(c.codePointAt(0))),advance=glyphs.reduce((n,g)=>n+font.advanceGlyph(g)*size*xscale,0),x=startX+(alignment==='right'?target[2]-target[0]-advance:alignment==='center'?(target[2]-target[0]-advance)/2:0),y=baseline+i*lineHeight;
  if(!row)continue;
  const spaces=[...row].filter(c=>c===' ').length,extra=alignment==='justify'&&!lastRows.has(i)&&spaces?(target[2]-target[0]-advance)/spaces:0;
  let cursor=x;
  // Explicit glyph positions make justification independent of PDF font encoding.
  for(let c=0;c<glyphs.length;c++){const g=glyphs[c];content+=`BT /${key} ${size} Tf 0 Tr ${color.join(' ')} rg ${xscale} 0 0 -1 ${cursor} ${y} Tm <${g.toString(16).padStart(4,'0')}> Tj ET\n`;cursor+=font.advanceGlyph(g)*size*xscale+([...row][c]===' '?extra:0);}
  const drawnWidth=advance+extra*spaces;
  rects.push([x,target[1]+i*lineHeight,x+drawnWidth,target[1]+(i+1)*lineHeight]);
  if(underline&&drawnWidth>0)content+=`BT /${key} ${size} Tf ${color.join(' ')} rg ${drawnWidth/(font.advanceGlyph(font.encodeCharacter(95))*size)} 0 0 -1 ${x} ${y} Tm <${font.encodeCharacter(95).toString(16).padStart(4,'0')}> Tj ET\n`;

 }
 content+='Q\n';const oldContent=obj.get('Contents'),arr=doc.newArray();arr.push(doc.addStream('q\n',{}));if(oldContent.isArray())oldContent.forEach(v=>arr.push(v));else if(!oldContent.isNull())arr.push(oldContent);arr.push(doc.addStream(content,{}));obj.put('Contents',arr);
 if(payload.remove)records.splice(payload.line,1);else{const next={text,box:target,rects,origin:[rects[0]?.[0]??startX,baseline],size,xscale,bold,italic,font:font.getName(),color,underline,alignment,editable:true,raster:false};if(old)records[payload.line]=next;else records.push(next);}
 obj.put(KEY,doc.newString(JSON.stringify(records)));obj.delete('TextoPDFImageOCR');
 return text;
 }finally{if(font&&!sourceLines?.some(l=>l.chars.some(c=>c.font===font)))font.destroy();if(sourceLines)releaseLines(sourceLines);page.destroy();}
}

export function mergeBlocks(doc,index,indices){
 const page=doc.loadPage(index);let records;try{records=blocksOf(page);}finally{page.destroy();}
 const ids=[...new Set(indices)];if(ids.length<2||ids.some(i=>!Number.isInteger(i)||!records[i]?.editable))throw Error('Selecciona al menos dos textos editables.');
 const selected=ids.map(i=>records[i]).sort((a,b)=>Math.abs(a.box[1]-b.box[1])>3?a.box[1]-b.box[1]:a.box[0]-b.box[0]);
 const first=selected[0],box=[Math.min(...selected.map(l=>l.box[0])),Math.min(...selected.map(l=>l.box[1])),Math.max(...selected.map(l=>l.box[2])),Math.max(...selected.map(l=>l.box[3]))];
 const text=selected.map(l=>l.text.trim().replace(/\s+/g,' ')).join(' ');
 if(records.some((l,i)=>!ids.includes(i)&&(l.rects||[l.box]).some(b=>Math.min(box[2],b[2])-Math.max(box[0],b[0])>.4&&Math.min(box[3],b[3])-Math.max(box[1],b[1])>.4)))throw Error('Hay otros textos entre los seleccionados. Inclúyelos o selecciona textos contiguos.');
 const bold=first.bold??/bold|heavy|black|demi/i.test(first.font),italic=first.italic??/italic|oblique/i.test(first.font),fitFont=new m.Font(chosenFont(first.font,bold,italic));let size=first.size;
 try{while(size>4&&wrapText(text,fitFont,size,box[2]-box[0]).length*size*1.3>box[3]-box[1])size=Math.max(4,size-.5);}finally{fitFont.destroy();}

 for(const i of ids.sort((a,b)=>b-a))editBlock(doc,index,{line:i,remove:true,box:records[i].box});
 editBlock(doc,index,{line:null,text,box,style:{font:first.font,size,bold,italic,underline:!!first.underline,color:first.color,alignment:first.alignment||'left'}});
}
