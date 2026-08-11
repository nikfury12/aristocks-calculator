import { readFile, writeFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const embedPath = new URL('../tilda-calculator-embed.html', import.meta.url);
const indexPath = new URL('../index.html', import.meta.url);
const appPath = new URL('../trader-calculator.js', import.meta.url);

let embed = await readFile(embedPath, 'utf8');
const index = await readFile(indexPath, 'utf8');
const appSource = await readFile(appPath, 'utf8');
const app = (await transform(appSource, { loader: 'js', minify: true, target: 'es2020', charset: 'utf8', legalComments: 'none' })).code.trim();

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

const headerCss = '<style id="aristocks-header-css">#aristocks-calculator header{position:static;height:88px;padding:0 max(28px,calc((100vw - 1240px)/2));display:grid;grid-template-columns:1fr auto 1fr;align-items:center;border-bottom:1px solid rgba(24,32,31,.12);background:rgba(243,245,242,.92)}#aristocks-calculator .brand{font-size:27px;letter-spacing:.025em}#aristocks-calculator .header-socials{justify-self:end;gap:18px;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.06em}#aristocks-calculator .header-socials .social-primary{padding:11px 13px;border-width:1px;border-radius:3px}@media(max-width:720px){#aristocks-calculator header{height:92px;padding-inline:20px;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;align-content:center;row-gap:7px}#aristocks-calculator .brand{grid-column:1;grid-row:1;font-size:27px}#aristocks-calculator #data-status{grid-column:1;grid-row:2;justify-self:start;font-size:8px}#aristocks-calculator .header-socials{grid-column:2;grid-row:1/3;align-self:center;gap:11px;font-size:9px;letter-spacing:.03em}#aristocks-calculator .header-socials .social-primary{padding:9px 10px}}</style>';
const socialButtonCss = '<style id="aristocks-social-button-css">#aristocks-calculator .header-socials .social-primary{min-height:42px;padding:0 17px}@media(max-width:720px){#aristocks-calculator .header-socials .social-primary{min-height:36px;padding:0 10px}}</style>';
embed = embed.replace(/<style id="aristocks-social-button-css">[\s\S]*?<\/style>/, socialButtonCss);
if (!embed.includes('id="aristocks-social-button-css"')) {
  const insertAt = embed.indexOf('<div id="aristocks-calculator">');
  embed = embed.slice(0, insertAt) + socialButtonCss + embed.slice(insertAt);
}
embed = embed.replace(/<style id="aristocks-header-css">[\s\S]*?<\/style>/, headerCss);
if (!embed.includes('id="aristocks-header-css"')) {
  const insertAt = embed.indexOf('<div id="aristocks-calculator">');
  embed = embed.slice(0, insertAt) + headerCss + embed.slice(insertAt);
}

const directionCss = '<style id="aristocks-direction-css">#aristocks-calculator .unit-risk:not([hidden]){display:flex;align-items:center;gap:10px}#aristocks-calculator .unit-risk strong{font:600 10px/1 var(--mono);letter-spacing:.06em}#aristocks-calculator .unit-risk[data-direction="long"] strong{color:var(--green)}#aristocks-calculator .unit-risk[data-direction="short"] strong{color:var(--red)}#aristocks-calculator .risk-amount{display:block;margin:9px 0 -8px;color:#59625f;font:500 10px/1.4 var(--mono)}#aristocks-calculator .risk-amount[hidden]{display:none}</style>';
embed = embed.replace(/<style id="aristocks-direction-css">[\s\S]*?<\/style>/, directionCss);
if (!embed.includes('id="aristocks-direction-css"')) {
  const insertAt = embed.indexOf('<div id="aristocks-calculator">');
  embed = embed.slice(0, insertAt) + directionCss + embed.slice(insertAt);
}

const toggleCss = '<style id="aristocks-toggle-css">#aristocks-calculator .instrument-control>button{top:0;bottom:0;height:auto;display:block;padding:0;font-size:0}#aristocks-calculator .instrument-control>button::before{content:"";position:absolute;left:50%;top:50%;width:12px;height:8px;border:0;background:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath d=\'M1 1l5 5 5-5\' fill=\'none\' stroke=\'%2325302d\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E") center/12px 8px no-repeat;transform:translate(-50%,-50%)}</style>';
embed = embed.replace(/<style id="aristocks-toggle-css">[\s\S]*?<\/style>/, toggleCss);
if (!embed.includes('id="aristocks-toggle-css"')) {
  const insertAt = embed.indexOf('<div id="aristocks-calculator">');
  embed = embed.slice(0, insertAt) + toggleCss + embed.slice(insertAt);
}

const accessibilityCss = '<style id="aristocks-accessibility-css">#aristocks-calculator :focus-visible{outline-color:var(--violet)}#aristocks-calculator .field input:focus-visible,#aristocks-calculator .field select:focus-visible{outline:3px solid var(--violet);outline-offset:2px}#aristocks-calculator .risk-head input:focus-visible+span{outline:3px solid var(--violet);outline-offset:2px}#aristocks-calculator .field input[aria-invalid="true"]{border-color:var(--red)}#aristocks-calculator .instrument-field small,#aristocks-calculator .unit-risk{color:#59625f}#aristocks-calculator .answer .risk-targets #targets-panel>p{color:rgba(255,255,255,.55)}#aristocks-calculator .utility-footer{color:#59625f}</style>';
embed = embed.replace(/<style id="aristocks-accessibility-css">[\s\S]*?<\/style>/, accessibilityCss);
if (!embed.includes('id="aristocks-accessibility-css"')) {
  const insertAt = embed.indexOf('<div id="aristocks-calculator">');
  embed = embed.slice(0, insertAt) + accessibilityCss + embed.slice(insertAt);
}

const scriptStart = embed.lastIndexOf('<script>');
const scriptEnd = embed.indexOf('</script>', scriptStart);
if (scriptStart < 0 || scriptEnd < 0) throw new Error('Calculator app script not found in Tilda embed');
const fallbackDecoder = `if(window.ARISTOCKS_FUTURES_FALLBACK_GZIP&&typeof DecompressionStream!=='undefined'){try{const bytes=Uint8Array.from(atob(window.ARISTOCKS_FUTURES_FALLBACK_GZIP),char=>char.charCodeAt(0));const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),rows=JSON.parse(await new Response(stream).text());window.ARISTOCKS_FUTURES_FALLBACK=rows.map(([secid,name,assetCode,expiry,minStep,stepPrice,margin])=>({secid,name,assetCode,expiry,minStep,stepPrice,margin}))}catch{}}`;
const finalScript = `(async()=>{if(!document.documentElement.lang)document.documentElement.lang='ru';${fallbackDecoder}${app}})();`;
new Function(finalScript);
embed = embed.slice(0, scriptStart) + `<script>${finalScript}\n` + embed.slice(scriptEnd);

await writeFile(embedPath, embed, 'utf8');
console.log(JSON.stringify({ bytes: Buffer.byteLength(embed), rootChars: root.length, appChars: app.length }));
