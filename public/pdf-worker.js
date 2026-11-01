import {m,linesOf,describe,releaseLines,replaceLine,bytes,demo} from './engine.js';
import {imageRecords,imageToPDF,replaceImageLine} from './image-pdf.js';
import {blocksOf,editBlock,mergeBlocks} from './block-editor.js';
let doc,original,undo=[],pageIndex=0,custom=null;
function progress(message){self.postMessage({progress:message});}
function snapshot(){
 const page=doc.loadPage(pageIndex);let pix;
 try{const box=page.getBounds();progress('Detectando las líneas de texto…');
 const ocr=imageRecords(page);const lines=blocksOf(page);
 progress('Preparando la vista de la página…');
 const scale=Math.min(1.2,1400/Math.max(box[2]-box[0],box[3]-box[1]));
 pix=page.toPixmap(m.Matrix.scale(scale,scale),m.ColorSpace.DeviceRGB,false);
 const png=pix.asPNG();return {png,lines,box,imageOCR:ocr!==null,count:doc.countPages(),page:pageIndex,undo:undo.length};
 }finally{pix?.destroy();page.destroy();}
}
self.onmessage=async({data:{id,action,payload={}}})=>{try{let result;if(!doc&&!['load','image','demo'].includes(action))throw Error('Vuelve a abrir el archivo para continuar.');progress('Abriendo el documento…');
 if(action==='load'||action==='demo'||action==='image'){const next=action==='image'?imageToPDF(payload.bytes,payload.lines):action==='demo'?demo():m.Document.openDocument(payload.bytes,'application/pdf');if(next.needsPassword()){next.destroy();throw Error('Este PDF tiene contraseña. Abre una copia desbloqueada.');}if(!next.countPages()){next.destroy();throw Error('El PDF no contiene páginas.');}doc?.destroy();doc=next;original=action==='demo'||action==='image'?bytes(doc):new Uint8Array(payload.bytes);undo=[];pageIndex=0;custom=null;result=snapshot();}
 else if(action==='page'){pageIndex=payload.index;result=snapshot();}
 else if(action==='editingPreview'){const copy=m.Document.openDocument(bytes(doc),'application/pdf');let p,pix;try{p=copy.loadPage(pageIndex);const line=blocksOf(p)[payload.line];p.destroy();p=null;if(!line)throw Error('No se encontró el texto.');editBlock(copy,pageIndex,{line:payload.line,box:line.box,remove:true});p=copy.loadPage(pageIndex);const box=p.getBounds(),scale=Math.min(1.2,1400/Math.max(box[2]-box[0],box[3]-box[1]));pix=p.toPixmap(m.Matrix.scale(scale,scale),m.ColorSpace.DeviceRGB,false);result={png:pix.asPNG()};}finally{pix?.destroy();p?.destroy();copy.destroy();}}
 else if(action==='font'){custom=new Uint8Array(payload.bytes);const test=new m.Font('Fuente cargada',custom);result={name:test.getName()};test.destroy();}
 else if(['replace','move','block','remove','add','merge'].includes(action)){progress('Guardando el cambio…');const before=bytes(doc),next=m.Document.openDocument(before,'application/pdf');try{
 const p=next.loadPage(pageIndex),records=blocksOf(p),old=records[payload.line];p.destroy();let request={...payload};
 if(action==='move'){if(!old)throw Error('No se encontró el texto.');request={line:payload.line,text:old.text,box:old.box.map((v,i)=>v+payload.offset[i%2])};request.box[3]=Math.max(request.box[3],request.box[1]+old.size*1.3);}
 if(action==='remove')request.remove=true;
 if(action==='add')request.line=null;
 if(action==='merge')mergeBlocks(next,pageIndex,payload.lines);else editBlock(next,pageIndex,request);
 const saved=bytes(next),check=m.Document.openDocument(saved,'application/pdf');if(!check.countPages())throw Error('No se pudo guardar.');check.destroy();doc.destroy();doc=next;undo.push(before);if(undo.length>8)undo.shift();
 }catch(e){next.destroy();throw e;}result=snapshot();}
 else if(action==='undo'){if(undo.length){doc.destroy();doc=m.Document.openDocument(undo.pop(),'application/pdf');}result=snapshot();}
 else if(action==='reset'){doc.destroy();doc=m.Document.openDocument(original,'application/pdf');undo=[];pageIndex=0;result=snapshot();}
 else if(action==='word'){const pages=[];for(let i=0;i<doc.countPages();i++){const p=doc.loadPage(i);pages.push({box:p.getBounds(),lines:blocksOf(p)});p.destroy();}result={pages};}
 else if(action==='download'){result={bytes:bytes(doc)};}
 self.postMessage({id,result},result?.png?[result.png.buffer]:result?.bytes?[result.bytes.buffer]:[]);
 }catch(e){self.postMessage({id,error:e.message||'No se pudo procesar este PDF.'});}};

self.postMessage({ready:true});
