import { createReadStream, readFileSync } from 'node:fs';
import chromeWebstoreUpload from 'chrome-webstore-upload';

const required = [
  'CHROME_EXTENSION_ID',
  'CHROME_CLIENT_ID',
  'CHROME_CLIENT_SECRET',
  'CHROME_REFRESH_TOKEN',
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const zipPath = `turbolt-v${version}.zip`;

const store = chromeWebstoreUpload({
  extensionId: process.env.CHROME_EXTENSION_ID,
  clientId: process.env.CHROME_CLIENT_ID,
  clientSecret: process.env.CHROME_CLIENT_SECRET,
  refreshToken: process.env.CHROME_REFRESH_TOKEN,
});

const token = await store.fetchToken();

console.log(`Uploading ${zipPath}...`);
const uploadResponse = await store.uploadExisting(createReadStream(zipPath), token);
if (uploadResponse.uploadState !== 'SUCCESS') {
  console.error('Upload failed:', JSON.stringify(uploadResponse, null, 2));
  process.exit(1);
}
console.log('Upload succeeded, submitting for review...');

const publishResponse = await store.publish('default', token);
console.log('Publish response:', JSON.stringify(publishResponse, null, 2));
