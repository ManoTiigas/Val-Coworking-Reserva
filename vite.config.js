import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const page = name => fileURLToPath(new URL(`work/${name}.html`, import.meta.url));

export default defineConfig({
    root: 'work',
    envDir: projectRoot,
    appType: 'mpa',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          index: page('index'),
          planos: page('planos'),
          admin: page('admin'),
          operacao: page('gestao-valor-8f3d'),
        },
      },
    },
});
