// Checks index.html without a browser: node check.mjs
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

const html = readFileSync(new URL('index.html', import.meta.url), 'utf8');
const local = (path) => new URL(path, import.meta.url);

const links = [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
assert.ok(links.length > 20, 'found too few links to be checking the right file');
for (const link of links) {
  if (link.startsWith('#')) {
    assert.ok(html.includes(`id="${link.slice(1)}"`), `no element with id ${link}`);
  } else if (/^[a-z]+:/.test(link)) {
    assert.match(link, /^(https:\/\/|mailto:)/, `not https: ${link}`);
  } else {
    assert.ok(existsSync(local(link)), `missing file: ${link}`);
  }
}

const images = html.match(/<img\b[^>]*>/g);
for (const img of images) {
  assert.match(img, /\salt="[^"]{10,}"/, `no alt text: ${img}`);
  assert.match(img, /\swidth="\d+" height="\d+"/, `no size: ${img}`);
  const src = img.match(/\ssrc="([^"]+)"/)[1];
  assert.ok(statSync(local(src)).size <= 300_000, `over 300 kB: ${src}`);
}

// the page promises to make no requests beyond its own files
assert.doesNotMatch(html, /<(script|link|img|source|iframe)\b[^>]*\s(src|href)="https?:(?![^"]*gitguy268\.github\.io)/i);
assert.doesNotMatch(readFileSync(local('glass.js'), 'utf8'), /fetch\(|XMLHttpRequest|import\(/);

console.log(`ok: ${links.length} links, ${images.length} images`);

// Every presentation reads these canonical articles. IDs must remain stable and unique.
const cards = [...html.matchAll(/<article class="project"([^>]*)>([\s\S]*?)<\/article>/g)];
assert.equal(cards.length, 48, 'preserve all 48 projects');
const ids = cards.map(([,attrs]) => attrs.match(/data-project="([^"]+)"/)[1]);
assert.equal(new Set(ids).size, ids.length, 'duplicate project ID');
const categories = new Set(['players','spot','editors','games','tools','terminal-ai','experiments']);
for (const [,attrs,body] of cards) {
  assert.ok(categories.has(attrs.match(/data-category="([^"]+)"/)[1]));
  assert.match(body, /<h3>.+<\/h3>/);
  assert.match(body, /class="note project-credit"/);
  if (attrs.includes('data-status="unpublished"')) assert.doesNotMatch(attrs, /data-demo=/);
  if (attrs.includes('data-status="public"')) assert.match(attrs, /data-demo="https:\/\//);
}
const allIds = [...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(allIds).size, allIds.length, 'duplicate HTML ID');
for (const file of ['styles/base.css','styles/site.css','styles/shell.css','styles/desktop.css','docs/docs.css']) {
  const css=readFileSync(local(file),'utf8');
  for(const [,asset] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    assert.ok(!/^https?:/.test(asset), 'serve assets locally');
    assert.ok(existsSync(new URL(asset,local(file))), `missing CSS asset ${asset} in ${file}`);
  }
}
for (const file of ['scripts/app.js','scripts/terminal.js','scripts/desktop.js','scripts/mines.js','scripts/docs.js','glass.js']) {
  const source=readFileSync(local(file),'utf8');
  assert.doesNotMatch(source,/\beval\s*\(|new Function\s*\(|fetch\s*\(|XMLHttpRequest/,`unexpected remote access or executable input in ${file}`);
}
assert.doesNotMatch(html, /<script[^>]+src="(?:glass.js|scripts\/(?:desktop|mines|terminal).js)"/, 'load experiences only when selected');
assert.ok(existsSync(local('404.html')));
assert.equal(cards.filter(([,attrs])=>attrs.includes('data-status="public"')).length,47,'publication status must stay consistent');
assert.equal(cards.filter(([,attrs,body])=>body.includes('Fork of')).length,10,'retain all fork credits');
assert.doesNotMatch(readFileSync(local('scripts/app.js'),'utf8'),/loadScript\('scripts\/mines.js'\)/,'defer the game until its app is opened');
console.log('ok: 48 canonical projects, unique IDs, local CSS assets, lazy experience scripts');

// The docs page: same rules for links, images and requests, and one page per project.
const docsHtml = readFileSync(local('docs/index.html'), 'utf8');
const inDocs = (path) => new URL(path, local('docs/index.html'));
const docsIds = [...docsHtml.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(docsIds).size, docsIds.length, 'duplicate HTML ID in the docs');
for (const link of [...docsHtml.matchAll(/\s(?:src|href)="([^"]+)"/g)].map((m) => m[1])) {
  if (link.startsWith('#')) assert.ok(docsIds.includes(link.slice(1)), `docs: no element with id ${link}`);
  else if (/^[a-z]+:/.test(link)) assert.match(link, /^https:\/\//, `docs: not https: ${link}`);
  else assert.ok(existsSync(inDocs(link.replace(/[?#].*/, ''))), `docs: missing file: ${link}`);
}
for (const img of docsHtml.match(/<img\b[^>]*>/g)) {
  assert.match(img, /\salt="[^"]{10,}"/, `docs: no alt text: ${img}`);
  assert.match(img, /\swidth="\d+" height="\d+"/, `docs: no size: ${img}`);
}
assert.doesNotMatch(docsHtml, /<(script|link|img|source|iframe)\b[^>]*\s(src|href)="https?:(?![^"]*gitguy268\.github\.io)/i);
const pages = [...docsHtml.matchAll(/<article class="doc" id="([^"]+)"/g)].map(m=>m[1]);
for (const id of ids) {
  assert.ok(pages.includes(id), `no docs page for ${id}`);
  assert.ok(html.includes(`href="docs/index.html#${id}"`), `no Docs link on the card for ${id}`);
  assert.ok(docsHtml.includes(`<li><a href="#${id}">`), `${id} is missing from the docs sidebar`);
}
for (const [, page, body] of docsHtml.matchAll(/<article class="doc" id="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)) {
  for (const [, section] of body.matchAll(/<h2 id="([^"]+)"/g)) assert.ok(section.startsWith(page + '-'), `section ${section} should start with ${page}-`);
}
console.log(`ok: docs with ${pages.length} pages, one for each project`);
