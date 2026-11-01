// Report loading separately from PDF processing; imports may take time on mobile.
try {
 self.postMessage({progress:'Descargando el motor PDF…'});
 const response=await fetch('/vendor/mupdf-wasm.wasm');
 if(!response.ok)throw Error('No se pudo descargar el motor PDF ('+response.status+').');
 const reader=response.body.getReader();const chunks=[];let loaded=0;let last=0;
 const total=Number(response.headers.get('content-length'));
 while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.length;
 if(Date.now()-last>200){self.postMessage({progress:`Descargando el motor PDF: ${(loaded/1048576).toFixed(1)} MB${total?' de '+(total/1048576).toFixed(1)+' MB':''}…`});last=Date.now();}}
 const wasm=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){wasm.set(chunk,offset);offset+=chunk.length;}
 self.$libmupdf_wasm_Module={wasmBinary:wasm};
 self.postMessage({progress:'Iniciando el editor…'});
 await import('./pdf-worker.js?v=11');
} catch(e){self.postMessage({fatal:e.message||'No se pudo iniciar el editor PDF.'});}
