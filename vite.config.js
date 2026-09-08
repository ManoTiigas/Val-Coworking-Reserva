import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const page = name => fileURLToPath(new URL(`work/${name}.html`, import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, 'VITE_');
  for (const name of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_MERCADO_PAGO_PUBLIC_KEY']) {
    if (!env[name]?.trim()) throw new Error(`Configure ${name} no .env ou no ambiente de build.`);
  }
  return {
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
  };
});
