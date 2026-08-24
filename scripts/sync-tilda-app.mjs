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
embed = `<meta charset="utf-8">\n${schemaScript}\n${embed.slice(firstStyle)}`;

const rootStart = index.indexOf('  <header>');
const rootEnd = index.indexOf('\n  <script type="application/ld+json">', rootStart);
if (rootStart < 0 || rootEnd < 0) throw new Error('Calculator body not found in index.html');
const body = index.slice(rootStart, rootEnd).trim().replace(/>\s+</g, '><');
const root = `<div id="aristocks-calculator">${body}</div>`;

const embedRootStart = embed.indexOf('<div id="aristocks-calculator">');
const embedRootEnd = embed.indexOf('<script>\nwindow.ARISTOCKS_CALCULATOR_ROOT', embedRootStart);
if (embedRootStart < 0 || embedRootEnd < 0) throw new Error('Calculator root not found in Tilda embed');
embed = embed.slice(0, embedRootStart) + root + '\n' + embed.slice(embedRootEnd);

const pageShellCss = '<style id="aristocks-page-shell-css">html:has(#aristocks-calculator){margin:0;min-height:100%;background:#f3f5f2}body:has(#aristocks-calculator){margin:0;min-height:100vh;background:#f3f5f2}#aristocks-calculator{min-height:100vh}</style>';
embed = embed.replace(/<style id="aristocks-page-shell-css">[\s\S]*?<\/style>/, pageShellCss);
if (!embed.includes('id="aristocks-page-shell-css"')) {
  const insertAt = embed.indexOf('<div id="aristocks-calculator">');
  embed = embed.slice(0, insertAt) + pageShellCss + embed.slice(insertAt);
}

const headerCss = '<style id="aristocks-header-css">#aristocks-calculator header{position:static;height:88px;padding:0 max(28px,calc((100vw - 1060px)/2));display:grid;grid-template-columns:1fr auto 1fr;align-items:center;border-bottom:1px solid rgba(24,32,31,.12);background:rgba(243,245,242,.92)}#aristocks-calculator .brand{font-size:27px;letter-spacing:.025em}#aristocks-calculator .header-socials{justify-self:end;gap:18px;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.06em}#aristocks-calculator .header-socials .social-primary{width:100px;height:42px;padding:0;display:grid;place-items:center;border-width:1px;border-radius:3px}@media(max-width:720px){#aristocks-calculator header{height:92px;padding-inline:20px;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;align-content:center;row-gap:7px}#aristocks-calculator .brand{grid-column:1;grid-row:1;font-size:27px}#aristocks-calculator #data-status{grid-column:1;grid-row:2;justify-self:start;font-size:8px}#aristocks-calculator .header-socials{grid-column:2;grid-row:1/3;align-self:center;gap:11px;font-size:9px;letter-spacing:.03em}#aristocks-calculator .header-socials .social-primary{width:88px;height:36px;padding:0}}</style>';
const socialButtonCss = '<style id="aristocks-social-button-css">#aristocks-calculator .header-socials .social-primary{width:100px;height:42px;min-height:0;padding:0;display:grid;place-items:center}@media(max-width:720px){#aristocks-calculator .header-socials .social-primary{width:88px;height:36px;min-height:0;padding:0}}</style>';
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

const directionCss = '<style id="aristocks-direction-css">#aristocks-calculator .unit-risk{padding:8px 10px;border-left:2px solid var(--violet);color:#38413f;background:#f7f5ff}#aristocks-calculator .unit-risk:not([hidden]){display:flex;align-items:center;gap:10px}#aristocks-calculator .unit-risk strong{font:600 10px/1 var(--mono);letter-spacing:.06em}#aristocks-calculator #unit-risk-value{font-weight:600}#aristocks-calculator .unit-risk[data-direction="long"] strong{color:var(--green)}#aristocks-calculator .unit-risk[data-direction="short"] strong{color:var(--red)}#aristocks-calculator .risk-amount{display:block;margin:9px 0 -8px;color:#38413f;font:600 10px/1.4 var(--mono)}#aristocks-calculator .risk-amount[hidden]{display:none}</style>';
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

const accessibilityCss = '<style id="aristocks-accessibility-css">#aristocks-calculator :focus-visible{outline-color:var(--violet)}#aristocks-calculator .field input::placeholder{color:#858d8a}#aristocks-calculator .field input:focus-visible,#aristocks-calculator .field select:focus-visible{outline:3px solid var(--violet);outline-offset:2px}#aristocks-calculator .risk-head label span{width:auto;min-width:78px;height:32px;padding:0 10px;font-size:9px}#aristocks-calculator .risk-head label+label span{min-width:67px}#aristocks-calculator .risk-head input:focus-visible+span{outline:3px solid var(--violet);outline-offset:2px}#aristocks-calculator .field input[aria-invalid="true"]{border-color:var(--red)}#aristocks-calculator .instrument-field small,#aristocks-calculator .unit-risk{color:#59625f}#aristocks-calculator .answer .risk-targets #targets-panel>p{color:rgba(255,255,255,.55)}#aristocks-calculator .utility-footer{color:#59625f}</style>';
embed = embed.replace(/<style id="aristocks-accessibility-css">[\s\S]*?<\/style>/, accessibilityCss);
if (!embed.includes('id="aristocks-accessibility-css"')) {
  const insertAt = embed.indexOf('<div id="aristocks-calculator">');
  embed = embed.slice(0, insertAt) + accessibilityCss + embed.slice(insertAt);
}

const aboutMobileCss = '<style id="aristocks-about-mobile-css">#aristocks-calculator .prices input::placeholder{font-size:inherit}@media(max-width:720px){#aristocks-calculator .about-strip{margin:12px 16px 0;padding:18px 16px;grid-template-columns:38px minmax(0,1fr);align-items:start;column-gap:14px;row-gap:16px}#aristocks-calculator .about-copy{min-width:0}#aristocks-calculator .about-copy span{display:block;font-size:8px;line-height:1.45;letter-spacing:.07em}#aristocks-calculator .about-copy p{margin-top:8px;font-size:10px;line-height:1.55}#aristocks-calculator .about-proof{grid-column:1/-1;padding:13px 0 0;display:flex;align-items:baseline;gap:8px;border-top:1px solid var(--line);border-left:0}#aristocks-calculator .social-actions{grid-column:1/-1;width:100%;min-width:0}}</style>';
embed = embed.replace(/<style id="aristocks-about-mobile-css">[\s\S]*?<\/style>/, aboutMobileCss);
if (!embed.includes('id="aristocks-about-mobile-css"')) {
  const insertAt = embed.indexOf('<div id="aristocks-calculator">');
  embed = embed.slice(0, insertAt) + aboutMobileCss + embed.slice(insertAt);
}

const instrumentListCss = '<style id="aristocks-instrument-list-css">#aristocks-calculator .instrument-option small{color:#c8d1ce;font-size:10px;line-height:1.35}@media(max-width:720px){#aristocks-calculator .instrument-list-title{font-size:9px;line-height:1.2}#aristocks-calculator .instrument-option{min-height:58px;padding:10px 12px;display:grid;grid-template-columns:1fr;align-content:center;justify-items:start;gap:5px}#aristocks-calculator .instrument-option strong{font-size:13px;line-height:1.25}#aristocks-calculator .instrument-option small{color:#c8d1ce;font-size:11px;line-height:1.3;white-space:normal}}</style>';
embed = embed.replace(/<style id="aristocks-instrument-list-css">[\s\S]*?<\/style>/, instrumentListCss);
if (!embed.includes('id="aristocks-instrument-list-css"')) {
  const insertAt = embed.indexOf('<div id="aristocks-calculator">');
  embed = embed.slice(0, insertAt) + instrumentListCss + embed.slice(insertAt);
}

const resultJumpCss = '<style id="aristocks-result-jump-css">#aristocks-calculator .result-jump{display:none}@media(max-width:720px){#aristocks-calculator .result-jump:not([hidden]){width:100%;min-height:48px;margin-top:18px;padding:0 15px;display:flex;align-items:center;justify-content:space-between;border:1px solid var(--violet);color:#fff;background:var(--violet);font:600 11px/1.2 var(--body);cursor:pointer}#aristocks-calculator .result-jump b{font:500 10px/1 var(--mono);text-transform:uppercase;letter-spacing:.04em}#aristocks-calculator .result-jump:focus-visible{outline:3px solid #25302d;outline-offset:2px}}</style>';
embed = embed.replace(/<style id="aristocks-result-jump-css">[\s\S]*?<\/style>/, resultJumpCss);
if (!embed.includes('id="aristocks-result-jump-css"')) {
  const insertAt = embed.indexOf('<div id="aristocks-calculator">');
  embed = embed.slice(0, insertAt) + resultJumpCss + embed.slice(insertAt);
}

const modesCss = '<style id="aristocks-modes-css">#aristocks-calculator .calculation-mode{margin:0 0 24px;padding:0 0 20px;display:grid;grid-template-columns:1fr 1fr;gap:8px;border:0;border-bottom:1px solid var(--line)}#aristocks-calculator .calculation-mode legend{margin-bottom:10px;color:#59625f;font-size:10px;font-weight:600}#aristocks-calculator .calculation-mode label{position:relative;min-width:0}#aristocks-calculator .calculation-mode input{position:absolute;opacity:0}#aristocks-calculator .calculation-mode span{min-height:58px;padding:11px 12px;display:flex;flex-direction:column;justify-content:center;gap:5px;border:1px solid var(--line);color:#59625f;background:#fbfcfb;cursor:pointer}#aristocks-calculator .calculation-mode b{color:var(--ink);font-size:10px;font-weight:600}#aristocks-calculator .calculation-mode small{font-size:8px;line-height:1.35}#aristocks-calculator .calculation-mode input:checked+span{border-color:var(--violet);box-shadow:inset 3px 0 0 var(--violet);background:#f7f5ff}#aristocks-calculator .calculation-mode input:focus-visible+span{outline:3px solid var(--violet);outline-offset:2px}#aristocks-calculator .position-controls{margin-top:22px;padding-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px;border-top:1px solid var(--line)}#aristocks-calculator .position-controls[hidden],#aristocks-calculator #risk-controls[hidden],#aristocks-calculator .position-summary[hidden],#aristocks-calculator #stop-optional[hidden],#aristocks-calculator .direction-choice[hidden]{display:none}#aristocks-calculator .direction-choice{margin:0;padding:0;border:0}#aristocks-calculator .direction-choice legend{margin-bottom:8px;color:#59625f;font-size:10px;font-weight:600}#aristocks-calculator .direction-choice label{position:relative;display:inline-block;width:50%}#aristocks-calculator .direction-choice input{position:absolute;opacity:0}#aristocks-calculator .direction-choice span{height:50px;display:grid;place-items:center;border:1px solid var(--line);color:#59625f;background:#fbfcfb;font:500 10px/1 var(--mono);cursor:pointer}#aristocks-calculator .direction-choice label+label span{border-left:0}#aristocks-calculator .direction-choice input:checked+span{color:#fff;border-color:var(--violet);background:var(--violet)}#aristocks-calculator .direction-choice input:focus-visible+span{outline:3px solid var(--violet);outline-offset:2px}#aristocks-calculator .field>span small{margin-left:5px;color:#8a918f;font-size:8px;font-weight:400}#aristocks-calculator .target-result{min-height:17px;font-size:11px;line-height:1.5}#aristocks-calculator .targets-total{margin-top:14px;color:#25302d;font-size:12px;font-weight:600;line-height:1.55}#aristocks-calculator .target-result.positive{color:#177d61}#aristocks-calculator .target-result.negative{color:#a3463d}#aristocks-calculator .answer #profit-row{grid-column:1/-1;padding-left:0;border-left:0}#aristocks-calculator .answer #profit-row small{margin-top:8px;color:rgba(142,217,196,.86);font-size:10px;line-height:1.5}#aristocks-calculator .answer #profit-row.negative dd,#aristocks-calculator .answer #profit-row.negative small{color:#eeaaa4}#aristocks-calculator .position-summary{margin:0 0 18px;padding:16px 0 0;border-top:1px solid rgba(255,255,255,.13)}#aristocks-calculator .position-summary h2{margin:0 0 11px;color:rgba(255,255,255,.78);font:500 10px/1 var(--mono)}#aristocks-calculator .position-summary dl{grid-template-columns:repeat(2,1fr)}#aristocks-calculator .position-summary dl div{min-height:58px;padding:12px 10px}#aristocks-calculator .position-summary dl div:first-child{padding-left:0}#aristocks-calculator .position-summary dl div:nth-child(even){padding-left:10px}#aristocks-calculator .position-summary dl div+div{border-left:1px solid rgba(255,255,255,.13)}#aristocks-calculator .position-summary dd{font-size:13px}#aristocks-calculator .answer .position-summary>p{min-height:0;margin:10px 0 0;font-size:8px;line-height:1.45}#aristocks-calculator .main-answer #position-label{grid-column:1/-1;margin-bottom:8px;color:rgba(255,255,255,.55);font-size:11px}@media(max-width:720px){#aristocks-calculator .calculation-mode{grid-template-columns:1fr;margin-bottom:22px}#aristocks-calculator .calculation-mode span{min-height:52px}#aristocks-calculator .calculation-mode b{font-size:11px}#aristocks-calculator .calculation-mode small{font-size:9px}#aristocks-calculator .position-controls{grid-template-columns:1fr}#aristocks-calculator .direction-choice span{height:44px}#aristocks-calculator .position-summary dl{grid-template-columns:1fr 1fr}#aristocks-calculator .position-summary dd{font-size:14px}#aristocks-calculator .target-result{font-size:12px}#aristocks-calculator .targets-total{font-size:13px}}</style>';
embed = embed.replace(/<style id="aristocks-modes-css">[\s\S]*?<\/style>/, modesCss);
if (!embed.includes('id="aristocks-modes-css"')) {
  const insertAt = embed.indexOf('<div id="aristocks-calculator">');
  embed = embed.slice(0, insertAt) + modesCss + embed.slice(insertAt);
}

const readabilityCss = '<style id="aristocks-readability-css">#aristocks-calculator .target-result{font-size:12px}#aristocks-calculator .targets-total{font-size:11px;font-weight:500;line-height:1.6}#aristocks-calculator .answer #profit-row small{font-size:11px}#aristocks-calculator .calculation-mode legend{font-size:11px}#aristocks-calculator .calculation-mode span{min-height:64px}#aristocks-calculator .calculation-mode b{font-size:13px}#aristocks-calculator .calculation-mode small{font-size:11px;line-height:1.45}@media(max-width:720px){#aristocks-calculator .calculation-mode span{min-height:60px}#aristocks-calculator .calculation-mode b{font-size:13px}#aristocks-calculator .calculation-mode small{font-size:11px}#aristocks-calculator .targets-total{font-size:11px}}</style>';
embed = embed.replace(/<style id="aristocks-readability-css">[\s\S]*?<\/style>/, readabilityCss);
if (!embed.includes('id="aristocks-readability-css"')) {
  const insertAt = embed.indexOf('<div id="aristocks-calculator">');
  embed = embed.slice(0, insertAt) + readabilityCss + embed.slice(insertAt);
}

const conversionCss = '<style id="aristocks-conversion-css">#aristocks-calculator .result-social{margin-top:14px;padding:16px;border:1px solid rgba(142,217,196,.28);background:rgba(142,217,196,.06)}#aristocks-calculator .result-social[hidden]{display:none}#aristocks-calculator .result-social>strong{display:block;color:#fff;font:600 13px/1.3 var(--body)}#aristocks-calculator .answer .result-social>p{min-height:0;margin:7px 0 13px;color:rgba(255,255,255,.66);font-size:10px;line-height:1.5}#aristocks-calculator .result-social>div{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px}#aristocks-calculator .result-social a{min-height:36px;padding:0 11px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.24);color:#fff;font:500 10px/1.2 var(--mono);text-align:center}#aristocks-calculator .result-social a:hover{border-color:#fff}#aristocks-calculator .result-social .result-social-primary{border-color:var(--violet);background:var(--violet)}@media(min-width:721px){#aristocks-calculator .social-actions{min-width:245px}}@media(max-width:720px){#aristocks-calculator .result-social{padding:16px 14px}#aristocks-calculator .result-social>strong{font-size:14px}#aristocks-calculator .answer .result-social>p{font-size:11px}#aristocks-calculator .result-social a{font-size:10px}}</style>';
embed = embed.replace(/<style id="aristocks-conversion-css">[\s\S]*?<\/style>/, conversionCss);
if (!embed.includes('id="aristocks-conversion-css"')) {
  const insertAt = embed.indexOf('<div id="aristocks-calculator">');
  embed = embed.slice(0, insertAt) + conversionCss + embed.slice(insertAt);
}

const mobileTypographyCss = '<style id="aristocks-mobile-typography-css">@media(max-width:720px){#aristocks-calculator #data-status{font-size:10px}#aristocks-calculator .header-socials{font-size:10px}#aristocks-calculator .calculation-mode legend{font-size:13px}#aristocks-calculator .calculation-mode span{min-height:64px;padding:12px 13px}#aristocks-calculator .calculation-mode b{font-size:14px}#aristocks-calculator .calculation-mode small{font-size:12px}#aristocks-calculator .instrument-heading label,#aristocks-calculator .field>span,#aristocks-calculator .risk-head>span,#aristocks-calculator .direction-choice legend{font-size:14px}#aristocks-calculator .instrument-reset{font-size:12px}#aristocks-calculator .instrument-field>small{font-size:13px;line-height:1.45}#aristocks-calculator .instrument-field>strong{font-size:12px}#aristocks-calculator .instrument-option small{font-size:12px}#aristocks-calculator .field input,#aristocks-calculator .field select{min-height:54px;font-size:16px}#aristocks-calculator .prices input{font-size:20px}#aristocks-calculator .unit-risk{font-size:13px}#aristocks-calculator .unit-risk strong{font-size:12px}#aristocks-calculator .risk-head label span{min-width:72px;height:44px;font-size:12px}#aristocks-calculator .risk-amount{font-size:13px}#aristocks-calculator summary{font-size:14px}#aristocks-calculator .target-result{font-size:13px}#aristocks-calculator .add-target{font-size:13px}#aristocks-calculator .targets-total{font-size:13px}#aristocks-calculator .direction-choice span{height:48px;font-size:13px}#aristocks-calculator .answer-head{font-size:11px}#aristocks-calculator .main-answer>span,#aristocks-calculator .main-answer #position-label{font-size:14px}#aristocks-calculator .answer dt{font-size:12px}#aristocks-calculator .answer dd{font-size:18px}#aristocks-calculator .answer p{font-size:13px}#aristocks-calculator .answer #note.notice-warning,#aristocks-calculator .answer #note.notice-critical{font-size:13px}#aristocks-calculator .answer .targets-toggle{font-size:13px}#aristocks-calculator .targets-grid span{font-size:11px}#aristocks-calculator .targets-grid strong{font-size:15px}#aristocks-calculator .targets-grid small{font-size:12px}#aristocks-calculator .answer .risk-targets #targets-panel>p{font-size:12px}#aristocks-calculator .position-summary h2{font-size:12px}#aristocks-calculator .answer .position-summary>p{font-size:12px}#aristocks-calculator .answer button{min-height:50px;font-size:13px}#aristocks-calculator .result-jump:not([hidden]){font-size:13px}#aristocks-calculator .result-jump b{font-size:12px}#aristocks-calculator .about-copy span{font-size:11px}#aristocks-calculator .about-copy p{font-size:13px}#aristocks-calculator .about-proof strong{font-size:14px}#aristocks-calculator .about-proof span{font-size:11px}#aristocks-calculator .about-telegram span{font-size:10px}#aristocks-calculator .about-telegram b{font-size:13px}#aristocks-calculator .social-alternatives a{font-size:10px}#aristocks-calculator .utility-footer{font-size:11px}#aristocks-calculator .guide-heading>span,#aristocks-calculator .method span{font-size:11px}#aristocks-calculator .guide h2{font-size:24px}#aristocks-calculator .guide-heading>p,#aristocks-calculator .guide-grid p,#aristocks-calculator .method p,#aristocks-calculator .faq p{font-size:14px}#aristocks-calculator .guide-grid h3{font-size:16px}#aristocks-calculator .faq summary{font-size:14px}}</style>';
embed = embed.replace(/<style id="aristocks-mobile-typography-css">[\s\S]*?<\/style>/, mobileTypographyCss);
if (!embed.includes('id="aristocks-mobile-typography-css"')) {
  const insertAt = embed.indexOf('<div id="aristocks-calculator">');
  embed = embed.slice(0, insertAt) + mobileTypographyCss + embed.slice(insertAt);
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
