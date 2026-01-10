import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: process.env.NODE_ENV === 'production' 
    ? '/vtube-tools/obs-text/' 
    : './',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: false,
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: './index.html',
        display: './display.html'
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  
  server: {
    port: 5174,
    open: true
  },
  
  preview: {
    port: 4174
  }
});
