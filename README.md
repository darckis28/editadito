# Editadito PDF

Editor web de PDF e imágenes con Astro, React y JavaScript. Creado por **Andi Aguirre**.

## Iniciar el proyecto

Instala Node.js **22.23.4 o superior** (se recomienda Node 24) y npm.

```bash
npm ci
npm run dev
```

Abre la dirección que indique la terminal. Para generar la web:

```bash
npm run build
```

El resultado está en `dist/`. Puedes publicarlo en un alojamiento estático en la raíz de un dominio, por ejemplo Netlify: comando `npm run build`, carpeta `dist`. Los archivos `.wasm` deben servirse como `application/wasm`. Las rutas de los motores empiezan por `/`; GitHub Pages bajo `/nombre-repositorio/` requiere adaptar esas rutas.

La web incluye `robots.txt`, un sitemap XML y metadatos para motores de búsqueda. Si cambias el dominio, actualiza las URL canónicas en `src/pages/index.astro`, `public/robots.txt` y `public/sitemap.xml`. Para solicitar la indexación, registra el dominio en Google Search Console y envía el sitemap.

## Subir a GitHub

1. Descomprime `Editadito-PDF-GitHub.zip`.
2. Crea un repositorio vacío en GitHub.
3. Sube **el contenido** de la carpeta `editadito-pdf`, no el ZIP. Incluye `public`, `src`, `tests`, los archivos de configuración, `.gitignore`, `package-lock.json` y `LICENSE`.
4. No subas `node_modules` ni `dist`. Se generan con los comandos anteriores.

También puedes abrir la carpeta en VS Code, inicializar Git y usar **Publicar en GitHub**. No se incluyen credenciales ni configuración privada del alojamiento de ChatGPT.

## Funciones

- Cargar PDF (hasta 40 MB), JPG, PNG o WebP (hasta 20 MB).
- Editar texto directamente sobre la página; los cambios se aplican al hacer clic fuera.
- Añadir, eliminar, mover y ampliar cuadros. Deshacer hasta ocho cambios.
- Alinear párrafos a la izquierda, centro, derecha o justificados.
- Seleccionar varios textos contiguos y unirlos en un párrafo. Se ajusta el tamaño al espacio disponible.
- Guías con ajuste al arrastrar y tres iconos para centrar el cuadro: horizontal, vertical o ambos ejes. El centrado horizontal mantiene la posición vertical.
- Fuente aproximada automática, tamaño, negrita, cursiva, subrayado y color.
- Descargar solo en PDF. Guardado directo en navegadores compatibles y enlaces alternativos de descarga/apertura.
- Modo claro y oscuro, guardado como preferencia del navegador.

Los documentos se procesan en el navegador mediante Web Workers. El servidor solo sirve la aplicación y sus recursos. Los cambios se conservan durante la sesión; descarga el PDF antes de cerrar o recargar la página.

## Estructura

- `src/components/Editor.jsx`: interfaz y estado.
- `src/components/InlineEditor.jsx`: edición sobre el documento.
- `src/components/CenterControls.jsx`: los tres botones de centrado.
- `src/components/snap.js`: guías y cálculo de posiciones.
- `public/pdf-worker.js`: operaciones PDF y deshacer.
- `public/block-editor.js`: reemplazo real de texto, párrafos y alineación.
- `public/vendor`: motor MuPDF local.
- `public/ocr`: Tesseract, motor y modelo español locales.
- `tests`: comprobaciones de edición, exportación, unión y centrado.

## Pruebas

```bash
node tests/centering.test.mjs
node tests/alignment-merge.test.mjs
node tests/blocks.test.mjs
node tests/worker.test.mjs
```

Prueba adicional de OCR: `node tests/image-ocr.test.mjs`.

## Límites

Los PDF se detectan inicialmente por líneas horizontales. No se garantiza la edición de texto girado, estilos mezclados o efectos especiales. La tipografía de reemplazo puede ser aproximada. Los cuadros no desplazan automáticamente el resto del documento: deja espacio para evitar superposiciones. La unión requiere seleccionar también los textos intermedios.

Las imágenes usan OCR en español y limpian las zonas editadas sobre fondo blanco. Revisa los posibles errores de reconocimiento. El OCR no se aplica automáticamente a PDF escaneado: abre la página como imagen. Editar un documento firmado invalida su firma digital.

## Licencias

Proyecto: **AGPL-3.0-or-later**, ver `LICENSE`. Conserva los avisos y cumple las condiciones de distribución y oferta del código fuente al publicar tu versión.

MuPDF.js © Artifex Software Inc., AGPL o licencia comercial. Motores sin modificar; versiones fijadas en `package-lock.json`. Fuentes: https://github.com/ArtifexSoftware/mupdf.js y https://github.com/ArtifexSoftware/mupdf.

Tesseract.js y Tesseract.js-core: Apache-2.0; avisos en `public/ocr`. Modelo español: `@tesseract.js-data/spa`, https://github.com/naptha/tessdata.
