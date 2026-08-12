import { createWriteStream, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const outFile = `turbolt-v${version}.zip`;

const output = createWriteStream(outFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Packaged ${outFile} (${archive.pointer()} bytes)`);
});
archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.directory('dist/', false);
await archive.finalize();
