import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
export default defineConfig({integrations:[react()],server:{allowedHosts:['terminal.local']},vite:{server:{allowedHosts:['terminal.local']}}});
