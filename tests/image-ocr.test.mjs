import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorker} from 'tesseract.js';
import {m,bytes} from '../public/engine.js';
import {imageToPDF,imageRecords,replaceImageLine} from '../public/image-pdf.js';
const worker=await createWorker('spa',1,{langPath:new URL('../public/ocr/lang/',import.meta.url).pathname,cachePath:'/tmp/texto-pdf-ocr-test'});
let data;try{({data}=await worker.recognize(new URL('../public/ejemplo-imagen.png',import.meta.url).pathname,{}, {text:true,blocks:true}));}finally{await worker.terminate();}
const lines=data.blocks.flatMap(b=>b.paragraphs.flatMap(p=>p.lines.map(l=>({text:l.text.trim(),box:[l.bbox.x0,l.bbox.y0,l.bbox.x1,l.bbox.y1],baseline:l.baseline.y0,confidence:l.confidence}))));
assert(lines.some(l=>l.text.includes('Maria')));console.log('OCR:',lines.map(l=>l.text));
const image=fs.readFileSync(new URL('../public/ejemplo-imagen.png',import.meta.url));
let doc=imageToPDF(image,lines);let page=doc.loadPage(0);const records=imageRecords(page);assert.equal(records.length,lines.length);
const originalText=page.toStructuredText().asText();assert(originalText.includes('Maria'));const index=records.findIndex(l=>l.text.includes('Maria'));page.destroy();
replaceImageLine(doc,0,index,'Nombre: Ana Ruiz');const saved=bytes(doc);doc=m.Document.openDocument(saved,'application/pdf');page=doc.loadPage(0);
const text=page.toStructuredText().asText();console.log('EXTRACTED:',text);assert(text.includes('Nombre: Ana Ruiz'));assert(!text.includes('Maria'));assert(!JSON.stringify(imageRecords(page)).includes('Maria'));
// Confirm image pixels are actually blanked in the edited area (not just covered by text).
let images=[];page.getObject().get('Resources','XObject').forEach((v)=>{if(v.get('Subtype').asName()==='Image')images.push(doc.loadImage(v));});
assert(images.length>0);const rect=records[index].box;const bounds=page.getBounds();const pix=images[0].toPixmap();const pixels=pix.getPixels(),iw=pix.getWidth(),ih=pix.getHeight(),n=pix.getNumberOfComponents();const scale=iw/(bounds[2]-bounds[0]);let dark=0;
for(let y=Math.ceil(rect[1]*scale);y<Math.floor(rect[3]*scale);y++)for(let x=Math.ceil(rect[0]*scale);x<Math.floor(rect[2]*scale);x++){const off=(y*iw+x)*n;if(pixels[off]<200)dark++;}
assert.equal(dark,0,'old glyph pixels remain in the image');
replaceImageLine(doc,0,index,'Nombre: Eva');assert(doc.loadPage(0).toStructuredText().asText().includes('Nombre: Eva'));
const noText=imageToPDF(image,[]);assert.equal(noText.countPages(),1);assert.equal(imageRecords(noText.loadPage(0)).length,0);
fs.writeFileSync('/tmp/image-ocr-edited.pdf',bytes(doc));
console.log('PASS: real Spanish OCR, image-to-PDF, editable metadata, old OCR removal, old image-pixel removal, second edit, no-text conversion.');
