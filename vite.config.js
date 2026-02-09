import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // 必须包含此语句，否则将导致部署失败
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000, // 提高警告阈值到 1MB
    rollupOptions: {
      output: {
        manualChunks: {
          // 将大型依赖分割成单独的 chunk
          'vendor-excel': ['exceljs'],
          'vendor-pdf': ['html2pdf.js'],
          'vendor-docx': ['docx'],
          'vendor-utils': ['file-saver', 'jszip']
        }
      }
    }
  }
});
