import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.PERPLEXITY_API_KEY || env.VITE_PERPLEXITY_API_KEY),
        'process.env.PERPLEXITY_API_KEY': JSON.stringify(env.PERPLEXITY_API_KEY || env.VITE_PERPLEXITY_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            todo: path.resolve(__dirname, 'todo.html'),
            health: path.resolve(__dirname, 'health.html'),
            meditate: path.resolve(__dirname, 'meditate.html'),
            money: path.resolve(__dirname, 'money.html'),
            quantum: path.resolve(__dirname, 'quantum.html'),
            travel: path.resolve(__dirname, 'travel.html'),
          }
        }
      }
    };
});
