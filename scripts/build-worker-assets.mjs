import { copyFile, cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('.worker-assets');
const files = [
  '.nojekyll',
  '_headers',
  'index.html',
  'robots.txt',
  'sitemap.xml',
  'trader-calculator.css',
  'trader-calculator.js',
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(files.map(file => copyFile(resolve(file), resolve(output, file))));
await cp(resolve('fonts'), resolve(output, 'fonts'), { recursive: true });
