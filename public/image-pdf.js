import {m,linesOf,releaseLines,compatibleFont} from './engine.js';
const KEY='TextoPDFImageOCR';
export function imageRecords(page){const value=page.getObject().get(KEY);if(value.isNull())return null;try{const data=JSON.parse(value.asString());if(data.version!==1||!Array.isArray(data.lines))return null;return data.lines.filter(l=>typeof l.text==='string'&&Array.isArray(l.box)&&l.box.length===4&&l.box.every(Number.isFinite)&&l.box[2]>l.box[0]&&l.box[3]>l.box[1]&&Number.isFinite(l.size)&&l.size>0&&Array.isArray(l.origin)&&l.origin.every(Number.isFinite));}catch{return null;}}
function saveRecords(doc,page,lines){page.getObject().put(KEY,doc.newString(JSON.stringify({version:1,lines})));}
function hexText(font,text){const glyphs=[...text].map(c=>font.encodeCharacter(c.codePointAt(0)));if(glyphs.some(g=>!g))throw Error('La fuente no contiene algunas letras. Elige otra fuente o carga su archivo.');return {hex:glyphs.map(g=>g.toString(16).padStart(4,'0')).join(''),advance:glyphs.reduce((a,g)=>a+font.advanceGlyph(g),0)};}
export function imageToPDF(imageBytes,ocrLines){
 const image=new m.Image(imageBytes),iw=image.getWidth(),ih=image.getHeight();
 const scale=Math.min(595/iw,842/ih),w=iw*scale,h=ih*scale;
 const doc=new m.PDFDocument(),font=new m.Font('Helvetica');const imageRef=doc.addImage(image);const records=[];let hidden='';
 for(const line of ocrLines){const text=line.text.trim();if(!text)continue;const box=line.box.map(n=>n*scale);if(box.length!==4||!box.every(Number.isFinite)||box[2]<=box[0]||box[3]<=box[1])continue;
 let encoded;try{encoded=hexText(font,text);}catch{continue;}
 const height=box[3]-box[1],width=box[2]-box[0];const size=height/.75;
 const origin=[box[0],Math.max(box[1]+height*.6,Math.min(box[3],(line.baseline??line.box[3])*scale))];
 const xscale=Math.min(1,width/(encoded.advance*size||1));
 // Fit invisible glyph bounding boxes inside the OCR area, without changing the image.
 const hiddenSize=height/1.374;const hiddenX=width/(encoded.advance*hiddenSize||1);
 hidden+=`BT /OCR ${hiddenSize} Tf 3 Tr ${hiddenX} 0 0 -1 ${box[0]} ${box[1]+hiddenSize*1.075} Tm <${encoded.hex}> Tj ET\n`;
 records.push({text,box,size,origin,xscale,font:'Helvetica',color:[0,0,0],editable:true,ocr:true,confidence:line.confidence??0,background:[1,1,1]});
 }
 const fontRef=doc.addFont(font);
 const pageRef=doc.addPage([0,0,w,h],0,{XObject:{Photo:imageRef},Font:{OCR:fontRef}},`q ${w} 0 0 ${h} 0 0 cm /Photo Do Q\nq 1 0 0 -1 0 ${h} cm\n${hidden}Q`);
 doc.insertPage(-1,pageRef);const page=doc.loadPage(0);saveRecords(doc,page,records);page.destroy();image.destroy();font.destroy();return doc;
}
export function replaceImageLine(doc,index,lineIndex,value,fontChoice='original',custom=null,offset=null){
 const page=doc.loadPage(index);const records=imageRecords(page);const line=records?.[lineIndex];if(!line)throw Error('No se encontró la línea reconocida.');
 if(!value.trim()||/[\r\n]/.test(value))throw Error('Escribe un reemplazo de una sola línea.');
 let originalLines;let font;
 if(custom)font=new m.Font('Fuente cargada',custom);
 else if(fontChoice!=='original')font=new m.Font(fontChoice);
 else if(['Helvetica','Times-Roman','Courier'].includes(line.font))font=new m.Font(line.font);
 else{originalLines=linesOf(page);font=originalLines.find(l=>l.text===line.text)?.chars[0].font;if(!font)throw Error('Selecciona o carga la fuente para continuar.');}
 font=compatibleFont(font,value);
 const encoded=hexText(font,value),rect=line.box;
 const xscale=line.xscale||1;
 if(!offset&&encoded.advance*line.size*xscale>rect[2]-rect[0]+1.5)throw Error('El texto no cabe. Acórtalo para que permanezca dentro de la zona original.');
 const delta=offset||[0,0],destination=rect.map((n,i)=>n+delta[i%2]),origin=line.origin.map((n,i)=>n+delta[i]);
 if(offset){const bounds=page.getBounds();if(offset.length!==2||!offset.every(Number.isFinite)||destination[0]<bounds[0]-.01||destination[1]<bounds[1]-.01||destination[2]>bounds[2]+.01||destination[3]>bounds[3]+.01)throw Error('El texto debe quedar dentro de la página.');}
 const pad=.5,area=[Math.max(0,rect[0]-pad),Math.max(0,rect[1]-pad),rect[2]+pad,rect[3]+pad];
 if(records.some((other,i)=>i!==lineIndex&&Math.min(other.box[2],area[2])>Math.max(other.box[0],area[0])&&Math.min(other.box[3],area[3])>Math.max(other.box[1],area[1])))throw Error('Las líneas están muy juntas. No se puede borrar esta zona sin afectar otra línea.');
 const fontRef=doc.addFont(font);const name=font.getName();
 const ann=page.createAnnotation('Redact');ann.setRect(area);
 // Actual removal: clear image pixels AND the OCR text layer, without removing other graphics.
 page.applyRedactions(false,2,0,0);
 const obj=page.getObject(),resources=doc.newDictionary();obj.getInheritable('Resources').forEach((v,k)=>resources.put(k,v));
 const fonts=doc.newDictionary();resources.get('Font').forEach((v,k)=>fonts.put(k,v));const key='OCRedit'+Date.now();fonts.put(key,fontRef);resources.put('Font',fonts);obj.put('Resources',resources);
 const old=obj.get('Contents'),arr=doc.newArray();arr.push(doc.addStream('q\n',{}));if(old.isArray())old.forEach(v=>arr.push(v));else if(!old.isNull())arr.push(old);
 const inverse=m.Matrix.invert(page.getTransform());
 arr.push(doc.addStream(`\nQ\nq ${inverse.join(' ')} cm\n1 1 1 rg ${area[0]} ${area[1]} ${area[2]-area[0]} ${area[3]-area[1]} re f\nBT /${key} ${line.size} Tf 0 Tr 0 0 0 rg ${xscale} 0 0 -1 ${origin.join(' ')} Tm <${encoded.hex}> Tj ET Q\n`,{}));
 obj.put('Contents',arr);records[lineIndex]={...line,text:value,font:name,box:destination,origin,confidence:100};saveRecords(doc,page,records);page.destroy();if(originalLines)releaseLines(originalLines);else font.destroy();return {font:name};
}
