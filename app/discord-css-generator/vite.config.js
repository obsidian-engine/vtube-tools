import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  // GitHub Pages用ベースURL設定
  base: process.env.NODE_ENV === 'production' 
    ? '/vtube-tools/' 
    : './',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    // GitHub Pages最適化
    cssCodeSplit: false,
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        // アセット名の最適化
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  
  server: {
    port: 5173,
    host: true,
    open: true
  },
  
  preview: {
    port: 4173,
    host: true
  },
  
  // GitHub Pages対応の追加設定
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false
  }
});