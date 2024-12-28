import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts'],
  format: ['iife'],
  globalName: 'ReactInteractionTracker',
  minify: false,
  clean: true,

  target: 'es2020',
  platform: 'browser',

});
