import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      plugins: [react()],
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
            french: path.resolve(__dirname, 'french.html'),
          }
        }
      }
    };
});
