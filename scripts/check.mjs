import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const config = JSON.parse(await fs.readFile(path.join(root, 'site.config.json'), 'utf8'));
const base = process.env.BASE_PATH ?? config.basePath;
const errors = [];
async function walk(directory) {
  const files = [];
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, item.name);
    files.push(...(item.isDirectory() ? await walk(filename) : [filename]));
  }
  return files;
}
const files = await walk(dist);
const htmlFiles = files.filter(file => file.endsWith('.html'));
let checkedLinks = 0;
for (const filename of htmlFiles) {
  const html = await fs.readFile(filename, 'utf8');
  assert.match(html, /<html lang="fr">/, `Langue : ${filename}`);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `Un titre principal : ${filename}`);
  assert.match(html, /<meta name="description" content="[^"]+">/, `Description : ${filename}`);
  assert.match(html, /<main id="contenu"/, `Contenu principal : ${filename}`);
  assert.doesNotMatch(html, /(?:file:\/\/|D:[\\/]|C:[\\/]|obsidian:|SKILL\.md|statut: preparation|source_transcription)/i, `Donnée interne : ${filename}`);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    let link = match[1];
    if (/^(https?:|mailto:|#|data:)/.test(link)) continue;
    if (base && !link.startsWith(base + '/')) { errors.push(`Mauvais préfixe : ${link}`); continue; }
    link = decodeURIComponent(link.slice(base.length)).split(/[?#]/)[0];
    let target = path.join(dist, link);
    const info = await fs.stat(target).catch(() => null);
    if (info?.isDirectory()) target = path.join(target, 'index.html');
    if (!(await fs.stat(target).catch(() => null))?.isFile()) errors.push(`Lien absent : ${link} dans ${path.relative(dist, filename)}`);
    checkedLinks++;
  }
  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    assert.match(match[0], /alt="[^"]+"/, `Description d’image : ${filename}`);
    assert.match(match[0], /width="\d+"/, `Dimensions d’image : ${filename}`);
  }
}
const entries = JSON.parse(await fs.readFile(path.join(dist, 'assets/search-index.json'), 'utf8'));
const articleSources = (await fs.readdir(path.join(root, 'content/articles'))).filter(name => name.endsWith('.md'));
assert.equal(entries.length, articleSources.length, 'Index complet');
assert.equal(new Set(entries.map(entry => entry.path)).size, entries.length, 'Articles uniques');
for (const entry of entries) {
  assert.ok(entry.title && entry.excerpt && entry.category, 'Résultat de recherche complet');
  assert.ok((await fs.stat(path.join(dist, entry.path.slice(base.length), 'index.html'))).isFile(), 'Article consultable');
}
for (const filename of ['styles.css', 'site.js', 'fonts/newsreader.woff2', 'fonts/manrope.woff2']) {
  assert.ok((await fs.stat(path.join(dist, 'assets', filename))).size > 0, `Ressource présente : ${filename}`);
}
const css = await fs.readFile(path.join(dist, 'assets/styles.css'), 'utf8');
for (const match of css.matchAll(/url\(['"]?([^)'" ]+)['"]?\)/g)) assert.ok((await fs.stat(path.join(dist, 'assets', match[1]))).isFile(), `Ressource CSS : ${match[1]}`);
if (errors.length) throw new Error(errors.join('\n'));
console.log(`OK · ${entries.length} articles · ${htmlFiles.length} pages HTML · ${checkedLinks} liens locaux · ressources et données publiques vérifiées`);
