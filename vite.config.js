import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' faz o site funcionar em qualquer endereço do GitHub Pages (usuario.github.io/repo/)
export default defineConfig({ base: './', plugins: [react()] });
