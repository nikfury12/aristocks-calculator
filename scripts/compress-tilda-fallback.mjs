import { gzipSync } from 'node:zlib';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const embedPath = resolve('tilda-calculator-embed.html');
const fallbackPath = resolve('fallback-contracts.json');
const payload = JSON.parse(await readFile(fallbackPath, 'utf8'));
const contracts = Array.isArray(payload.contracts) ? payload.contracts : payload;
const compactContracts = contracts.map(({ secid, name, assetCode, expiry, minStep, stepPrice, margin }) => [secid, name, assetCode, expiry, minStep, stepPrice, margin]);
const packed = gzipSync(Buffer.from(JSON.stringify(compactContracts))).toString('base64');
let embed = await readFile(embedPath, 'utf8');

const packedLine = `window.ARISTOCKS_FUTURES_FALLBACK_GZIP='${packed}';`;
if (/^window\.ARISTOCKS_FUTURES_FALLBACK=.*$/m.test(embed)) {
  embed = embed.replace(/^window\.ARISTOCKS_FUTURES_FALLBACK=.*$/m, packedLine);
} else if (/^window\.ARISTOCKS_FUTURES_FALLBACK_GZIP=.*$/m.test(embed)) {
  embed = embed.replace(/^window\.ARISTOCKS_FUTURES_FALLBACK_GZIP=.*$/m, packedLine);
} else {
  throw new Error('Fallback marker not found');
}

const syncStart = '<script>\n(()=>{\nconst builtInFallback=';
const asyncStart = `<script>\n(async()=>{\nif(window.ARISTOCKS_FUTURES_FALLBACK_GZIP&&typeof DecompressionStream!=='undefined'){try{const bytes=Uint8Array.from(atob(window.ARISTOCKS_FUTURES_FALLBACK_GZIP),char=>char.charCodeAt(0));const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),rows=JSON.parse(await new Response(stream).text());window.ARISTOCKS_FUTURES_FALLBACK=rows.map(([secid,name,assetCode,expiry,minStep,stepPrice,margin])=>({secid,name,assetCode,expiry,minStep,stepPrice,margin}))}catch{}}\nconst builtInFallback=`;
if (embed.includes(syncStart)) embed = embed.replace(syncStart, asyncStart);
else {
  const oldDecoder = "const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));window.ARISTOCKS_FUTURES_FALLBACK=JSON.parse(await new Response(stream).text())";
  const compactDecoder = "const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),rows=JSON.parse(await new Response(stream).text());window.ARISTOCKS_FUTURES_FALLBACK=rows.map(([secid,name,assetCode,expiry,minStep,stepPrice,margin])=>({secid,name,assetCode,expiry,minStep,stepPrice,margin}))";
  if (embed.includes(oldDecoder)) embed = embed.replace(oldDecoder, compactDecoder);
  else if (!embed.includes(compactDecoder)) throw new Error('App wrapper marker not found');
}

await writeFile(embedPath, embed);
console.log(JSON.stringify({ contracts: contracts.length, packedChars: packed.length, fileBytes: Buffer.byteLength(embed) }));
