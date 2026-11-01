import assert from 'node:assert/strict';
import {m,demo,bytes} from '../public/engine.js';
import {editBlock,blocksOf} from '../public/block-editor.js';
import {snapRect} from '../src/components/snap.js';
const read=d=>{const p=d.loadPage(0);try{return blocksOf(p);}finally{p.destroy();}};
for(const alignment of ['left','center','right','justify']){
 const doc=demo();editBlock(doc,0,{line:2,text:'Un texto largo con palabras para justificar y comprobar el ajuste de los renglones.',box:[50,400,260,600],style:{alignment,size:16}});
 const b=read(doc)[2];assert.equal(b.alignment,alignment);assert(b.rects.length>1);
 if(alignment==='left')assert.equal(b.rects[0][0],50);
 if(alignment==='center')assert(Math.abs((b.rects[0][0]+b.rects[0][2])/2-155)<.01);
 if(alignment==='right')assert(Math.abs(b.rects[0][2]-260)<.01);
 if(alignment==='justify'){assert(Math.abs(b.rects[0][2]-260)<.01);assert(b.rects.at(-1)[2]<260);}
 const reopened=m.Document.openDocument(bytes(doc),'application/pdf');assert.equal(read(reopened)[2].alignment,alignment);reopened.destroy();doc.destroy();
}
const messages=[];globalThis.self={postMessage:r=>messages.push(r)};await import('../public/pdf-worker.js');let id=0;
async function call(action,payload={}){const n=++id;await self.onmessage({data:{id:n,action,payload}});const r=messages.find(r=>r.id===n);if(r.error)throw Error(r.error);return r.result;}
let before=await call('demo');const expected=before.lines[2].text+' '+before.lines[3].text;
let after=await call('merge',{lines:[3,2]});assert.equal(after.lines.length,before.lines.length-1);assert.equal(after.lines.at(-1).text,expected);assert.equal(after.undo,1);await call('editingPreview',{line:after.lines.length-1});assert.equal(after.lines[2].text,before.lines[4].text);
let saved=await call('download'),doc=m.Document.openDocument(saved.bytes,'application/pdf');assert.equal(read(doc).at(-1).text,expected);doc.destroy();
after=await call('undo');assert.deepEqual(after.lines,before.lines);
await assert.rejects(call('merge',{lines:[2,999]}));assert.deepEqual((await call('page',{index:0})).lines,before.lines);
const snapped=snapRect([52,99,152,119],[{box:[50,100,150,120]}],[0,0,600,800],4);assert.deepEqual(snapped.rect,[50,100,150,120]);assert.equal(snapped.guides.length,2);
const far=snapRect([200,200,250,220],[{box:[50,100,150,120]}],[0,0,600,800],4);assert.equal(far.guides.length,0);
console.log('PASS alignment coordinates and reopen, merge and undo, transactional failure, snapping.');
