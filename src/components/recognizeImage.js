export async function recognizeImage(file,{signal,onProgress}){
 let ocr=null,bitmap=null,canvas=null,rejectAbort;const abortPromise=new Promise((_,reject)=>{rejectAbort=reject;});
 const abort=()=>{ocr?.terminate();rejectAbort(Error('Reconocimiento cancelado.'));};
 signal.addEventListener('abort',abort,{once:true});
 function check(){if(signal.aborted)throw Error('Reconocimiento cancelado.');}
 async function work(){
 check();onProgress('Preparando la imagen…');
 try{bitmap=await createImageBitmap(file);}catch{throw Error('No se pudo abrir la imagen. Usa un archivo JPG, PNG o WebP.');}
 check();if(bitmap.width*bitmap.height>40000000)throw Error('La imagen es demasiado grande. Usa una de menos de 40 megapíxeles.');
 const scale=Math.min(1,2200/Math.max(bitmap.width,bitmap.height));
 canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 const context=canvas.getContext('2d',{alpha:false});context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();bitmap=null;
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.96));if(!blob)throw Error('No se pudo convertir la imagen.');check();
 onProgress('Cargando reconocimiento de texto en español…');const {createWorker}=await import('tesseract.js');check();
 const created=createWorker('spa',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang',workerBlobURL:false,logger:msg=>{if(signal.aborted)return;const stages={'loading tesseract core':'Cargando reconocimiento de texto','initializing tesseract':'Preparando reconocimiento','loading language traineddata':'Cargando idioma español','initializing api':'Iniciando reconocimiento','recognizing text':'Reconociendo palabras'};onProgress(`${stages[msg.status]||'Preparando reconocimiento'}${typeof msg.progress==='number'?' · '+Math.round(msg.progress*100)+' %':''}…`);}});
 created.then(w=>{if(signal.aborted)w.terminate();}).catch(()=>{});
 ocr=await created;check();await ocr.setParameters({preserve_interword_spaces:'1'});
 const result=await ocr.recognize(blob,{}, {text:true,blocks:true});check();
 const lines=[];for(const block of result.data.blocks||[])for(const para of block.paragraphs||[])for(const line of para.lines||[]){const {x0,y0,x1,y1}=line.bbox;if(!line.text?.trim()||x1<=x0||y1<=y0)continue;lines.push({text:line.text.trim().replace(/\s+/g,' '),box:[x0,y0,x1,y1],baseline:line.baseline?.y0??y1,confidence:line.confidence});}
 onProgress('Convirtiendo la imagen en PDF editable…');return {bytes:await blob.arrayBuffer(),lines};
 }
 try{return await Promise.race([work(),abortPromise]);}finally{signal.removeEventListener('abort',abort);if(ocr)await ocr.terminate();bitmap?.close();if(canvas){canvas.width=1;canvas.height=1;}}
}
