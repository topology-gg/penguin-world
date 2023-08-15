import replace from "@rollup/plugin-replace";
import { defineConfig, loadEnv } from "vite";

export default defineConfig({
  define: {
    "process.env": Object.assign(process.env, loadEnv("", process.cwd(), "")),
    "process.nextTick": process.nextTick,
  },
  resolve: {
    alias: {
      "readable-stream": "vite-compatible-readable-stream",
    },
  },
  build: {
    rollupOptions: {
      plugins: [
        //  Toggle the booleans here to enable / disable Phaser 3 features:
        replace({
          "typeof CANVAS_RENDERER": "'true'",
          "typeof WEBGL_RENDERER": "'true'",
          "typeof EXPERIMENTAL": "'true'",
          "typeof PLUGIN_CAMERA3D": "'false'",
          "typeof PLUGIN_FBINSTANT": "'false'",
          "typeof FEATURE_SOUND": "'true'",
        }),
      ],
    },
  },
});
