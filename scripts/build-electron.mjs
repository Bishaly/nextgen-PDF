import esbuild from 'esbuild';

try {
  await esbuild.build({
    entryPoints: ['electron/main.ts', 'electron/preload.ts'],
    outdir: 'dist-electron',
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    outExtension: { '.js': '.cjs' },
    external: ['electron'],
    sourcemap: true,
  });
  console.log('Successfully bundled electron/main.ts and electron/preload.ts to dist-electron/');
} catch (err) {
  console.error('Failed to bundle electron scripts:', err);
  process.exit(1);
}
