import assert from 'node:assert/strict';
import {m,demo,bytes,linesOf,releaseLines,describe} from '../public/engine.js';
import {blocksOf,editBlock} from '../public/block-editor.js';
const read=d=>{const p=d.loadPage(0);try{return blocksOf(p);}finally{p.destroy();}};
const native=d=>{const p=d.loadPage(0),ls=linesOf(p);try{return ls.map(l=>({...describe(l),origin:[...l.chars[0].origin]}));}finally{releaseLines(ls);p.destroy();}};
// Font flags must work even when its PDF resource name doesn't say Bold/Italic.
const fake={getName:()=> 'ABCDEF+F17',isBold:()=>true,isItalic:()=>true};
const c={font:fake,size:13.275,color:[0,0,0]};
assert.equal(describe({text:'Test',box:[0,0,10,10],wmode:0,dir:[1,0],chars:[c]}).bold,true);
assert.equal(describe({text:'Test',box:[0,0,10,10],wmode:0,dir:[1,0],chars:[c]}).italic,true);
let doc=demo();const original=read(doc)[2],origin=original.origin;
for(const text of ['Hola, texto nuevo.','Hola, otra vez.']){
 editBlock(doc,0,{line:2,text,box:read(doc)[2].box,style:{font:'original',size:original.size,bold:original.bold,italic:original.italic},autoGrow:true});
 const drawn=native(doc).find(l=>l.text===text);assert(drawn,'Only replacement should remain');
 assert.deepEqual(drawn.origin,origin,'Baseline and horizontal start must not drift');
 assert.equal(drawn.bold,true);assert.match(drawn.font,/Helvetica|NimbusSans/);assert.equal(drawn.size,original.size);
 const next=m.Document.openDocument(bytes(doc),'application/pdf');doc.destroy();doc=next;
 assert.deepEqual(read(doc)[2].origin,origin);assert.equal(read(doc)[2].bold,true);
}
const b=read(doc)[2];editBlock(doc,0,{line:2,box:b.box.map((v,i)=>v+(i%2?-5:10)),autoGrow:true});
assert.deepEqual(native(doc).find(l=>l.text===b.text).origin,[origin[0]+10,origin[1]-5]);
editBlock(doc,0,{line:2,text:'Normal',style:{font:'original',bold:false},autoGrow:true});
assert.equal(native(doc).find(l=>l.text==='Normal').bold,false,'Explicit bold toggle must still work');
doc.destroy();console.log('PASS original baseline, embedded font, weight flags, repeat edit, reopen, move and explicit style change');
