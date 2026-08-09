import { readFile, writeFile } from 'node:fs/promises';

const embedPath = new URL('../tilda-calculator-embed.html', import.meta.url);
const indexPath = new URL('../index.html', import.meta.url);
const appPath = new URL('../.tilda-script-output.js', import.meta.url);

let embed = await readFile(embedPath, 'utf8');
const index = await readFile(indexPath, 'utf8');
let app = null;
try {
  app = (await readFile(appPath, 'utf8')).trim();
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const schemaStart = index.indexOf('  <script type="application/ld+json">');
const schemaEnd = index.indexOf('  </script>', schemaStart);
if (schemaStart < 0 || schemaEnd < 0) throw new Error('Structured data not found in index.html');
const schemaScript = index.slice(schemaStart, schemaEnd + '  </script>'.length).trim();
const firstStyle = embed.indexOf('<style>');
if (firstStyle < 0) throw new Error('Tilda styles not found');
embed = `${schemaScript}\n${embed.slice(firstStyle)}`;

const rootStart = index.indexOf('  <header>');
const rootEnd = index.indexOf('\n  <script type="application/ld+json">', rootStart);
if (rootStart < 0 || rootEnd < 0) throw new Error('Calculator body not found in index.html');
const body = index.slice(rootStart, rootEnd).trim().replace(/>\s+</g, '><');
const root = `<div id="aristocks-calculator">${body}</div>`;

const embedRootStart = embed.indexOf('<div id="aristocks-calculator">');
const embedRootEnd = embed.indexOf('<script>\nwindow.ARISTOCKS_CALCULATOR_ROOT', embedRootStart);
if (embedRootStart < 0 || embedRootEnd < 0) throw new Error('Calculator root not found in Tilda embed');
embed = embed.slice(0, embedRootStart) + root + '\n' + embed.slice(embedRootEnd);

const directionCss = '<style id="aristocks-direction-css">#aristocks-calculator .unit-risk:not([hidden]){display:flex;align-items:center;gap:10px}#aristocks-calculator .unit-risk strong{font:600 10px/1 var(--mono);letter-spacing:.06em}#aristocks-calculator .unit-risk[data-direction="long"] strong{color:var(--green)}#aristocks-calculator .unit-risk[data-direction="short"] strong{color:var(--red)}#aristocks-calculator .risk-amount{display:block;margin:9px 0 -8px;color:#59625f;font:500 10px/1.4 var(--mono)}#aristocks-calculator .risk-amount[hidden]{display:none}</style>';
embed = embed.replace(/<style id="aristocks-direction-css">[\s\S]*?<\/style>/, directionCss);
if (!embed.includes('id="aristocks-direction-css"')) {
  const insertAt = embed.indexOf('<div id="aristocks-calculator">');
  embed = embed.slice(0, insertAt) + directionCss + embed.slice(insertAt);
}

if (app) {
  const scriptStart = embed.lastIndexOf('<script>');
  const scriptEnd = embed.indexOf('</script>', scriptStart);
  if (scriptStart < 0 || scriptEnd < 0) throw new Error('Calculator app script not found in Tilda embed');
  const finalScript = `(()=>{${app}})();`;
  new Function(finalScript);
  embed = embed.slice(0, scriptStart) + `<script>${finalScript}\n` + embed.slice(scriptEnd);
}

await writeFile(embedPath, embed, 'utf8');
console.log(JSON.stringify({ bytes: Buffer.byteLength(embed), rootChars: root.length, appChars: app?.length ?? 0, appPreserved: !app }));
