import { defineConfig } from 'vite';
import replace from '@rollup/plugin-replace';

console.log(process.nextTick)
export default defineConfig({
  define: {
    'process.env': process.env,
    'process.nextTick' : process.nextTick
  },
  resolve: {
    alias: {
      "readable-stream": "vite-compatible-readable-stream",
      "simple-peer" : "simple-peer/simplepeer.min.js"
    },
  },
  build: {
    rollupOptions: {
      plugins: [
        //  Toggle the booleans here to enable / disable Phaser 3 features:
        replace({
          'typeof CANVAS_RENDERER': "'true'",
          'typeof WEBGL_RENDERER': "'true'",
          'typeof EXPERIMENTAL': "'true'",
          'typeof PLUGIN_CAMERA3D': "'false'",
          'typeof PLUGIN_FBINSTANT': "'false'",
          'typeof FEATURE_SOUND': "'true'"
        })
      ]
    }
  }
});
