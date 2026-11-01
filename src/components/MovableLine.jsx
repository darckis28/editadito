import React,{useRef,useState} from 'react';
import {snapRect} from './snap.js';
export default function MovableLine({line,box,busy,onMove,others,onGuides}){
 const start=useRef(null),[offset,setOffset]=useState([0,0]),[moving,setMoving]=useState(false);
 const width=box[2]-box[0],height=box[3]-box[1];
 function clamp(dx,dy){return [Math.max(box[0]-line.box[0],Math.min(dx,box[2]-line.box[2])),Math.max(box[1]-line.box[1],Math.min(dy,box[3]-line.box[3]))];}
 function delta(e){const s=start.current;const d=clamp((e.clientX-s.x)*width/s.rect.width,(e.clientY-s.y)*height/s.rect.height),r=line.box.map((v,i)=>v+d[i%2]);const snap=snapRect(r,others,box,5*width/s.rect.width);onGuides(snap.guides);return [snap.rect[0]-line.box[0],snap.rect[1]-line.box[1]];}
 function cancel(){onGuides([]);start.current=null;setMoving(false);setOffset([0,0]);}
 return <button className={'textHit moveHit '+(moving?'moving':'')} disabled={busy||!line.editable} aria-label={'Mover: '+line.text} title="Arrastra o usa las flechas del teclado" style={{left:(line.box[0]+offset[0]-box[0])/width*100+'%',top:(line.box[1]+offset[1]-box[1])/height*100+'%',width:(line.box[2]-line.box[0])/width*100+'%',height:(line.box[3]-line.box[1])/height*100+'%'}}
 onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.focus();start.current={x:e.clientX,y:e.clientY,rect:e.currentTarget.parentElement.getBoundingClientRect()};e.currentTarget.setPointerCapture(e.pointerId);setMoving(true);}}
 onPointerMove={e=>{if(start.current)setOffset(delta(e));}}
 onPointerUp={e=>{if(!start.current)return;const d=delta(e);cancel();if(Math.hypot(...d)>.5)onMove(d);}}
 onPointerCancel={cancel} onLostPointerCapture={cancel}
 onKeyDown={e=>{if(e.key==='Escape'){cancel();return;}const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(dirs[e.key]){e.preventDefault();if(busy||e.repeat)return;const step=e.shiftKey?10:2,d=clamp(...dirs[e.key].map(v=>v*step));if(d.some(Boolean))onMove(d);}}}
 >{moving&&<span>{line.text}</span>}</button>;
}
