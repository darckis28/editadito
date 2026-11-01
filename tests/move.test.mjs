import assert from 'node:assert/strict';import fs from 'node:fs';
import {m,demo,bytes,linesOf,replaceLine} from '../public/engine.js';
import {imageToPDF,imageRecords,replaceImageLine} from '../public/image-pdf.js';
const d=demo();let p=d.loadPage(0),line=linesOf(p)[2],text=line.text,box=line.box.slice();p.destroy();
replaceLine(d,0,2,text,'original',null,[25,250]);
const r=m.Document.openDocument(bytes(d),'application/pdf');p=r.loadPage(0);const matches=linesOf(p).filter(l=>l.text===text);assert.equal(matches.length,1);assert(Math.abs(matches[0].box[0]-box[0]-25)<.1);assert(Math.abs(matches[0].box[1]-box[1]-250)<.1);assert.throws(()=>replaceLine(r,0,linesOf(p).findIndex(l=>l.text===text),text,'original',null,[-1000,0]),/dentro/);
const im=imageToPDF(fs.readFileSync('public/ejemplo-imagen.png'),[{text:'Nombre: Maria Perez',box:[80,400,600,450],baseline:445}]);p=im.loadPage(0);const old=imageRecords(p)[0];p.destroy();replaceImageLine(im,0,0,old.text,'original',null,[10,70]);const reopened=m.Document.openDocument(bytes(im),'application/pdf');p=reopened.loadPage(0);const moved=imageRecords(p)[0];assert.equal(moved.box[0],old.box[0]+10);assert.equal(moved.origin[1],old.origin[1]+70);assert.equal(linesOf(p).filter(l=>l.text===old.text).length,1);replaceImageLine(reopened,0,0,old.text,'original',null,[0,20]);
console.log('PASS: native and OCR moves survive save/reopen, no duplicate text, repeat moves, page bounds');
