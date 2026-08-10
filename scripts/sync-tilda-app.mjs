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
const headerScript = '<script>(function(){var r=document.getElementById("aristocks-calculator"),b=r&&r.querySelector(".menu-toggle"),n=r&&r.querySelector(".site-nav");if(!b||!n)return;b.addEventListener("click",function(){var o=b.getAttribute("aria-expanded")==="true";b.setAttribute("aria-expanded",String(!o));n.classList.toggle("open",!o)});n.addEventListener("click",function(){b.setAttribute("aria-expanded","false");n.classList.remove("open")})})();<\/script>';
const root = `<div id="aristocks-calculator">${body}</div>${headerScript}`;

const embedRootStart = embed.indexOf('<div id="aristocks-calculator">');
const embedRootEnd = embed.indexOf('<script>\nwindow.ARISTOCKS_CALCULATOR_ROOT', embedRootStart);
if (embedRootStart < 0 || embedRootEnd < 0) throw new Error('Calculator root not found in Tilda embed');
embed = embed.slice(0, embedRootStart) + root + '\n' + embed.slice(embedRootEnd);

const headerCss = '<style id="aristocks-header-css">#aristocks-calculator header{position:sticky;z-index:20;top:0;height:88px;padding:0 max(28px,calc((100vw - 1240px)/2));display:flex;align-items:center;justify-content:space-between;gap:30px;border-bottom:1px solid rgba(24,32,31,.12);background:rgba(243,245,242,.92);backdrop-filter:blur(14px)}#aristocks-calculator .brand{color:var(--violet);font:300 27px/1 "Roboto Condensed","Arial Narrow",sans-serif;letter-spacing:.025em}#aristocks-calculator .site-nav{display:flex;align-items:center;gap:31px;font-size:14px;font-weight:500}#aristocks-calculator .site-nav a{transition:color .2s ease}#aristocks-calculator .site-nav a:hover{color:var(--violet)}#aristocks-calculator .site-nav .nav-action{padding:12px 17px;border:1px solid var(--ink);border-radius:3px}#aristocks-calculator .menu-toggle{display:none;border:0;background:transparent}#aristocks-calculator .title-row #data-status{width:max-content;margin-bottom:12px}@media(max-width:980px){#aristocks-calculator header{height:74px;padding-inline:18px}#aristocks-calculator .menu-toggle{display:grid;gap:6px;padding:13px 0 13px 13px}#aristocks-calculator .menu-toggle span{display:block;width:25px;height:2px;background:var(--ink)}#aristocks-calculator .site-nav{position:absolute;top:74px;left:0;width:100%;padding:24px 18px 30px;display:none;align-items:stretch;flex-direction:column;gap:20px;background:var(--bg);border-bottom:1px solid var(--line)}#aristocks-calculator .site-nav.open{display:flex}#aristocks-calculator .site-nav .nav-action{text-align:center}}</style>';
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
