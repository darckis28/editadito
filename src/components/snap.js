export function snapRect(rect,others,bounds,tolerance=4){
 const result=[...rect],guides=[];
 for(const axis of [0,1]){
  const anchors=[rect[axis],(rect[axis]+rect[axis+2])/2,rect[axis+2]];
  let best=null;
  for(const other of others){const b=other.box;for(const value of [b[axis],(b[axis]+b[axis+2])/2,b[axis+2]])for(const anchor of anchors){const delta=value-anchor;
   if(Math.abs(delta)<=tolerance&&(!best||Math.abs(delta)<Math.abs(best.delta))&&rect[axis]+delta>=bounds[axis]&&rect[axis+2]+delta<=bounds[axis+2])best={delta,value};}}
  if(best){result[axis]+=best.delta;result[axis+2]+=best.delta;guides.push({axis,value:best.value});}
 }
 return {rect:result,guides};
}

export function centerRect(rect,bounds,axis='both'){
 const width=rect[2]-rect[0],height=rect[3]-rect[1];
 const x=bounds[0]+(bounds[2]-bounds[0]-width)/2,y=bounds[1]+(bounds[3]-bounds[1]-height)/2;
 return [axis==='vertical'?rect[0]:x,axis==='horizontal'?rect[1]:y,axis==='vertical'?rect[2]:x+width,axis==='horizontal'?rect[3]:y+height];
}
