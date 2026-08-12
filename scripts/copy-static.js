import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function main() {
  await mkdir('dist', { recursive: true });
  await cp('manifest.json', 'dist/manifest.json');
  await cp('public', 'dist/public', { recursive: true });
  if (existsSync('src/popup/popup.css')) {
    await mkdir('dist/src/popup', { recursive: true });
    await cp('src/popup/popup.css', 'dist/src/popup/popup.css');
  }
  if (existsSync('src/options/options.css')) {
    await mkdir('dist/src/options', { recursive: true });
    await cp('src/options/options.css', 'dist/src/options/options.css');
  }
  console.log('Static assets copied to dist/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
