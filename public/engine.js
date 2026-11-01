import * as m from './vendor/mupdf.js';
export {m};
export function linesOf(page) {
 const lines=[];let line;
 const st=page.toStructuredText('');
 st.walk({beginLine(box,wmode,dir){line={box,dir,wmode,text:'',chars:[]}},onChar(c,origin,font,size,quad,color){line.text+=c;line.chars.push({c,origin,font,size,quad,color});},endLine(){if(line.text.trim())lines.push(line);}});
 st.destroy();return lines;
}
export function describe(line){const c=line.chars[0];return {text:line.text,box:line.box,font:c.font.getName(),bold:c.font.isBold()||/bold|heavy|black|demi|semibold/i.test(c.font.getName()),italic:c.font.isItalic()||/italic|oblique/i.test(c.font.getName()),size:c.size,color:c.color,editable:line.wmode===0&&Math.abs(line.dir[0]-1)<.01&&Math.abs(line.dir[1])<.01&&line.chars.every(x=>x.font.getName()===c.font.getName()&&Math.abs(x.size-c.size)<.1&&JSON.stringify(x.color)===JSON.stringify(c.color))};}
export function releaseLines(lines){for(const line of lines)for(const c of line.chars)c.font.destroy();}
export function bytes(doc){const b=doc.saveToBuffer('garbage=1');const out=b.asUint8Array().slice();b.destroy();return out;}
export function similarFontName(font){
 const name=typeof font==='string'?font:font.getName();
 const bold=/bold|black|heavy|demi/i.test(name)||(typeof font!=='string'&&font.isBold());
 const italic=/italic|oblique/i.test(name)||(typeof font!=='string'&&font.isItalic());
 const mono=/courier|mono|consolas/i.test(name);
 const serif=!mono&&(/times|georgia|serif|roman|garamond|cambria/i.test(name)||(typeof font!=='string'&&font.isSerif()));
 if(serif)return bold?(italic?'Times-BoldItalic':'Times-Bold'):(italic?'Times-Italic':'Times-Roman');
 const base=mono?'Courier':'Helvetica';return base+(bold?(italic?'-BoldOblique':'-Bold'):(italic?'-Oblique':''));
}
export function compatibleFont(original,value){
 if([...value].every(c=>original.encodeCharacter(c.codePointAt(0))))return original;
 const replacement=new m.Font(similarFontName(original));
 if([...value].some(c=>!replacement.encodeCharacter(c.codePointAt(0)))){replacement.destroy();throw Error('Este carácter no está disponible en las fuentes compatibles.');}
 return replacement;
}
export function replaceLine(doc,index,lineIndex,value,fontChoice='original',custom=null,offset=null){
 const page=doc.loadPage(index),lines=linesOf(page),line=lines[lineIndex];
 if(!line||!describe(line).editable)throw Error('Esta línea tiene estilos mezclados o una orientación no compatible. Prueba otra línea.');
 if(/[\r\n]/.test(value))throw Error('Edita una sola línea a la vez.');
 if(!value.trim())throw Error('Escribe el texto de reemplazo.');
 const first=line.chars[0],font=custom?new m.Font('Fuente cargada',custom):fontChoice==='original'?compatibleFont(first.font,value):new m.Font(fontChoice);
 const glyphs=[...value].map(c=>font.encodeCharacter(c.codePointAt(0)));
 if(glyphs.some(g=>g===0))throw Error('La fuente no incluye algunas letras nuevas. Carga la fuente original o elige otra fuente.');
 const width=glyphs.reduce((n,g)=>n+font.advanceGlyph(g)*first.size,0);
 const rect=line.box;
 if(!offset&&width>rect[2]-first.origin[0]+1.5)throw Error('El texto no cabe en el espacio original. Acorta el texto para conservar el tamaño y evitar superposiciones.');
 const overlap=lines.some((other,i)=>i!==lineIndex&&Math.min(other.box[2],rect[2])-Math.max(other.box[0],rect[0])>.3&&Math.min(other.box[3],rect[3])-Math.max(other.box[1],rect[1])>.3);
 if(overlap)throw Error('Esta línea se superpone con otra. No se puede reemplazar sin afectar texto cercano.');
 if(offset){const bounds=page.getBounds();if(!offset.every(Number.isFinite)||offset.length!==2||rect[0]+offset[0]<bounds[0]-.01||rect[1]+offset[1]<bounds[1]-.01||rect[2]+offset[0]>bounds[2]+.01||rect[3]+offset[1]>bounds[3]+.01)throw Error('El texto debe quedar dentro de la página.');}
 // Register font BEFORE removal, preserving its glyphs and Unicode map.
 const fontRef=doc.addFont(font);
 const ann=page.createAnnotation('Redact');ann.setRect([rect[0]+.05,rect[1]+.05,rect[2]-.05,rect[3]-.05]);
 page.applyRedactions(false,0,0,0);
 const obj=page.getObject();
 const resources=doc.newDictionary();obj.getInheritable('Resources').forEach((v,k)=>resources.put(k,v));
 const fonts=doc.newDictionary();resources.get('Font').forEach((v,k)=>fonts.put(k,v));
 const key='Edit'+Date.now();fonts.put(key,fontRef);resources.put('Font',fonts);obj.put('Resources',resources);
 const old=obj.get('Contents'),arr=doc.newArray();arr.push(doc.addStream('q\n',{}));
 if(old.isArray())old.forEach(v=>arr.push(v));else if(!old.isNull())arr.push(old);
 const inv=m.Matrix.invert(page.getTransform());
 const color=first.color.slice(0,3);
 const hex=glyphs.map(g=>g.toString(16).padStart(4,'0')).join('');
 const placed=offset?line.chars.map(c=>`1 0 0 -1 ${c.origin[0]+offset[0]} ${c.origin[1]+offset[1]} Tm <${font.encodeCharacter(c.c.codePointAt(0)).toString(16).padStart(4,'0')}> Tj`).join('\n'):`1 0 0 -1 ${first.origin.join(' ')} Tm\n<${hex}> Tj`;
 const content=`\nQ\nq\n${inv.join(' ')} cm\nBT\n/${key} ${first.size} Tf\n${color.join(' ')} rg\n${placed}\nET\nQ\n`;
 arr.push(doc.addStream(content,{}));obj.put('Contents',arr);page.destroy();
 return {font:font.getName()};
}
export function demo(){const doc=new m.PDFDocument();const f=doc.addSimpleFont(new m.Font('Helvetica')); const fb=doc.addSimpleFont(new m.Font('Helvetica-Bold'));const p=doc.addPage([0,0,595,842],0,{Font:{F1:f,F2:fb}},'q 0.94 0.96 0.95 rg 0 710 595 132 re f Q\nBT /F2 11 Tf 0.12 0.36 0.27 rg 50 786 Td (TEXTO PDF / DOCUMENTO DE PRUEBA) Tj ET\nBT /F2 28 Tf 0.1 0.15 0.13 rg 50 747 Td (Un documento para probar.) Tj ET\nBT /F2 18 Tf 50 661 Td (Hola, este texto es editable.) Tj ET\nBT /F1 12 Tf 50 625 Td (Selecciona esta linea y escribe un texto mas corto.) Tj ET\nBT /F1 12 Tf 50 599 Td (El contenido anterior se elimina del PDF.) Tj ET\nBT /F1 12 Tf 50 573 Td (Puedes descargar el resultado y volver a abrirlo.) Tj ET\nq 0.2 0.5 0.38 RG 50 535 m 545 535 l S Q\nBT /F2 12 Tf 50 495 Td (Tus archivos permanecen en tu dispositivo.) Tj ET\nBT /F1 10 Tf 0.4 g 50 70 Td (Demo: texto seleccionable, sin escaneos ni OCR.) Tj ET');doc.insertPage(-1,p);return doc;}
