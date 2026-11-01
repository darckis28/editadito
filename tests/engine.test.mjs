import assert from 'node:assert/strict';
import {demo,bytes,replaceLine,linesOf,m} from '../public/engine.js';
function extracted(doc){const p=doc.loadPage(0),s=p.toStructuredText();const out=s.asText();s.destroy();p.destroy();return out;}
let d=demo();const original=bytes(d);replaceLine(d,0,2,'Hola, mundo.');let reopened=m.Document.openDocument(bytes(d),'application/pdf');assert(extracted(reopened).includes('Hola, mundo.'));assert(!extracted(reopened).includes('Hola, este texto es editable.'));assert(extracted(reopened).includes('Puedes descargar el resultado'));assert.equal(reopened.countPages(),1);
const current=linesOf(reopened.loadPage(0));replaceLine(reopened,0,current.findIndex(l=>l.text==='Hola, mundo.'),'Hola.');assert(extracted(m.Document.openDocument(bytes(reopened),'application/pdf')).includes('Hola.'));
let base=m.Document.openDocument(original,'application/pdf');assert.throws(()=>replaceLine(base,0,2,'X'.repeat(150)),/no cabe/);assert(extracted(base).includes('Hola, este texto es editable.'));assert.throws(()=>replaceLine(base,0,2,'Hola\nOtra'),/sola línea/);
replaceLine(base,0,2,'¡Sí, Perú!','Helvetica');let unicode=m.Document.openDocument(bytes(base),'application/pdf');assert(extracted(unicode).includes('¡Sí, Perú!'));
// Keep rotation and page count while replacing through page-space transform.
let rotated=demo();rotated.findPage(0).put('Rotate',90);const saved=m.Document.openDocument(bytes(rotated),'application/pdf');assert.equal(saved.findPage(0).get('Rotate').asNumber(),90);assert(linesOf(saved.loadPage(0)).every(l=>!((l.dir[0]-1)**2<.0001)));
console.log('PASS: real removal, Unicode replacement, repeat edits, width guard, newline guard, original preserved, rotation detection.');
