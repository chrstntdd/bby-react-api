const { FuseBox, Sparky, QuantumPlugin } = require('fuse-box');
const fuse = FuseBox.init({
  homeDir: 'src',
  output: 'dist/$name.js',
  target: 'server'
});

let isProduction = false;

Sparky.task('build', () => {
  const fuse = FuseBox.init({
    homeDir: 'src',
    output: 'dist/$name.js',
    log: true,
    sourceMaps: !isProduction,
    target: 'server',
    cache: !isProduction,
    plugins: [
      isProduction &&
        QuantumPlugin({
          uglify: true,
          treeshake: true
        })
    ]
  });

  const app = fuse.bundle('index').instructions('> [index.ts]');
  if (isProduction) {
    app.hmr().watch();
  }

  return fuse.run();
});

Sparky.task('clean', () => Sparky.src('dist/*').clean('dist/'));

// YARN START
Sparky.task('default', ['clean', 'build'], () => {});
