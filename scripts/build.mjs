import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const config = JSON.parse(await fs.readFile(path.join(root, 'site.config.json'), 'utf8'));
const categories = [
  { slug: 'vie-locale', name: 'Vie locale', deck: 'Les rues, les places et les gens qui font vivre Valombre.' },
  { slug: 'artisans-commerces', name: 'Artisans & commerces', deck: 'Derrière les enseignes, les mains qui font tourner la cité.' },
  { slug: 'routes-villages', name: 'Routes & villages', deck: 'Au-delà des portes, les chemins et les visages des environs.' },
  { slug: 'enquetes', name: 'Enquêtes', deck: 'Les affaires de Valombre, les faits connus et les questions ouvertes.' },
  { slug: 'memoire-culture', name: 'Mémoire & culture', deck: 'Ce que la cité garde, transmet et choisit de raconter.' },
];
const e = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const base = process.env.BASE_PATH ?? config.basePath;
const href = p => `${base}/${p}`.replace(/\/+/g, '/');
const icon = (name, cls = '') => {
  const shapes = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    print: '<path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z"/><path d="M16 11h1"/>',
    link: '<path d="m10 14 4-4m-6 2-2 2a4 4 0 0 0 6 6l3-3m-6-10 3-3a4 4 0 0 1 6 6l-2 2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  };
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.arrow}</svg>`;
};
const ornament = '<svg class="city-mark" viewBox="0 0 100 58" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 54h94M12 52V31h17v21M15 31V20l6-8 6 8v11M36 52V18h24v34M40 18v-7h5V3h6v8h5v7M67 52V28h19v24M70 28V17l7-10 6 10v11M8 42 2 46m91-4 5 4M43 28h10m-10 7h10m-9 17V42h8v10M18 39h5m51-3h6"/></svg>';

function inline(text) {
  return e(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
function markdown(source) {
  const blocks = source.trim().split(/\n\s*\n/);
  return blocks.map(block => {
    if (/^#{2,3} /.test(block)) {
      const match = block.match(/^(#{2,3}) (.*)$/s);
      return `<h${match[1].length}>${inline(match[2])}</h${match[1].length}>`;
    }
    if (block.startsWith('> ')) return `<blockquote><p>${inline(block.replace(/^> /gm, ''))}</p></blockquote>`;
    if (block.startsWith('- ')) return `<ul>${block.split('\n').map(line => `<li>${inline(line.replace(/^- /, ''))}</li>`).join('')}</ul>`;
    if (block.startsWith('|')) {
      const rows = block.split('\n').filter(line => !/^\|[\s:|-]+\|?$/.test(line));
      const cells = row => row.split('|').slice(1, -1).map(s => inline(s.trim()));
      return `<div class="table-wrap"><table><thead><tr>${cells(rows[0]).map(s => `<th scope="col">${s}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(row => `<tr>${cells(row).map(s => `<td>${s}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    return `<p>${inline(block.replace(/\n/g, ' '))}</p>`;
  }).join('\n');
}

const articles = [];
for (const filename of (await fs.readdir(path.join(root, 'content/articles'))).filter(s => s.endsWith('.md'))) {
  const source = (await fs.readFile(path.join(root, 'content/articles', filename), 'utf8')).replace(/\r/g, '');
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`En-tête manquant : ${filename}`);
  const meta = {};
  for (const line of match[1].split('\n').filter(Boolean)) {
    const split = line.indexOf(':');
    if (split < 1) throw new Error(`Métadonnée invalide : ${filename}`);
    const value = line.slice(split + 1).trim();
    meta[line.slice(0, split)] = value.startsWith('"') || value.startsWith('[') || /^(true|false|\d+)$/.test(value) ? JSON.parse(value) : value;
  }
  for (const required of ['title', 'slug', 'category', 'excerpt', 'image', 'alt', 'order']) if (!meta[required]) throw new Error(`${required} manquant : ${filename}`);
  if (!/^[a-z0-9-]+$/.test(meta.slug)) throw new Error(`Slug invalide : ${filename}`);
  const category = categories.find(c => c.slug === meta.category);
  if (!category) throw new Error(`Rubrique inconnue : ${filename}`);
  const body = match[2].trim();
  const minutes = Math.max(2, Math.ceil((body + meta.excerpt).split(/\s+/).length / 210));
  articles.push({ ...meta, body, minutes, categoryName: category.name, url: `articles/${meta.slug}/` });
}
articles.sort((a, b) => b.order - a.order);
if (new Set(articles.map(a => a.slug)).size !== articles.length) throw new Error('Slugs dupliqués');

const picture = (a, options = {}) => `<img src="${href(`assets/images/${a.image}`)}" alt="${e(a.alt)}" width="${options.width || 1200}" height="${options.height || 800}" ${options.eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
const kicker = a => `<span class="kicker">${e(a.label || a.categoryName)}</span>`;
const byline = a => `<span>${e(a.author || 'La rédaction')}</span><span class="meta-dot" aria-hidden="true">·</span><span>${a.minutes} min de lecture</span>`;
function card(a, variant = '') {
  return `<article class="story ${variant}"><a class="story-image" href="${href(a.url)}" tabindex="-1" aria-hidden="true">${picture(a)}</a><div class="story-copy">${kicker(a)}<h3><a href="${href(a.url)}">${e(a.title)}</a></h3><p>${e(a.excerpt)}</p><div class="meta">${byline(a)}</div></div></article>`;
}
const briefs = [
  { topic: 'Les Terrasses', text: 'Offres de travail et nouvelles du quartier : le panneau de la Guilde reste le rendez-vous des équipes.', slug: 'terrasses-avant-premier-marteau' },
  { topic: 'Aux Aulnes', text: 'À la Cruche, trois familles se relaient autour de la marmite. Une halte se prépare avant de prendre la route.', slug: 'cruche-aulnes-marmite-commune' },
  { topic: 'Au marché', text: 'Dix cuivres font un argent. Nos repères pour compter ses dépenses sans perdre le fil.', slug: 'une-piece-argent-journee' },
];
function page(title, content, options = {}) {
  const canonical = config.url + '/' + (options.path || '');
  const nav = `<a href="${href('')}" ${options.home ? 'aria-current="page"' : ''}>À la une</a>` + categories.map(c => `<a href="${href(`rubriques/${c.slug}/`)}" ${options.category === c.slug ? 'aria-current="page"' : ''}>${e(c.name)}</a>`).join('');
  const description = options.description || config.description;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f6f3ec"><title>${e(title)}${options.home ? '' : ' — La Gazette de Valombre'}</title><meta name="description" content="${e(description)}"><link rel="canonical" href="${e(canonical)}"><meta property="og:type" content="${options.article ? 'article' : 'website'}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(canonical)}"><meta property="og:image" content="${config.url}/assets/images/${options.image || 'valombre.webp'}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" type="image/svg+xml" href="${href('assets/favicon.svg')}"><link rel="preload" as="font" type="font/woff2" href="${href('assets/fonts/newsreader.woff2')}" crossorigin><link rel="stylesheet" href="${href('assets/styles.css')}"><script src="${href('assets/site.js')}" defer></script></head>
<body data-base="${e(base)}"><a class="skip-link" href="#contenu">Aller au contenu</a>
<header class="site-header"><div class="utility wrap"><span>Journal de la cité & des environs</span><span class="edition">${e(config.edition)}</span><a href="${href('archives/')}">Toutes les parutions ${icon('arrow')}</a></div><div class="masthead wrap"><span class="masthead-side">DES TERRASSES<br>AUX CHEMINS DE CALDRIS</span><a class="wordmark" href="${href('')}" aria-label="La Gazette de Valombre, accueil">${ornament}<span>La Gazette <i>de</i> Valombre<span class="wordmark-sub">${e(config.tagline)}</span></span></a><span class="masthead-side right">LES FAITS. LES GENS.<br>LA VIE D’ICI.</span></div><div class="nav-border"><div class="nav-wrap wrap"><nav class="primary-nav" aria-label="Rubriques">${nav}</nav><button class="search-trigger" type="button" data-search-open aria-label="Rechercher dans la Gazette">${icon('search')}<span>Rechercher</span></button></div></div></header>
<main id="contenu" class="wrap ${options.mainClass || ''}">${content}</main>
<footer class="site-footer"><div class="wrap footer-top"><a href="${href('')}" class="footer-wordmark">La Gazette <i>de</i> Valombre</a><p>Des nouvelles de la cité.<br>Et de ceux qui la font vivre.</p><div><a href="${href('archives/')}">Les archives ${icon('arrow')}</a><a href="${href('la-redaction/')}">Notre journal ${icon('arrow')}</a></div></div><div class="wrap footer-bottom"><span>Valombre · Les Terrasses · Les Aulnes · La Vieille Route</span><span>Une gazette fictive, des histoires à partager.</span></div></footer>
<dialog class="search-dialog" aria-labelledby="search-title"><div class="search-top"><div><span class="kicker">Dans les pages de la Gazette</span><h2 id="search-title">Que cherchez-vous ?</h2></div><button type="button" data-search-close aria-label="Fermer la recherche">${icon('close')}</button></div><label class="search-field">${icon('search')}<input id="site-search" type="search" placeholder="Un quartier, un nom, une affaire…" autocomplete="off"><span class="sr-only">Rechercher un article</span></label><p class="search-status" aria-live="polite"></p><div class="search-results"></div></dialog><div class="toast" role="status" aria-live="polite"></div></body></html>`;
}

await fs.mkdir(output, { recursive: true });
await fs.cp(path.join(root, 'public'), output, { recursive: true });
async function write(route, html) {
  const filename = path.join(output, route, 'index.html');
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, html);
}

const lead = articles.find(a => a.slug === 'academie-ulfric-syndicat') || articles[0];
const secondary = ['relais-pierre-feu-reponse', 'tibbet-fins-de-mois', 'cruche-aulnes-marmite-commune'].map(slug => articles.find(a => a.slug === slug)).filter(Boolean);
const local = ['terrasses-avant-premier-marteau', 'une-piece-argent-journee', 'beffroi-heure-marches', 'forge-thorgar-reparer'].map(slug => articles.find(a => a.slug === slug)).filter(Boolean);
const villages = articles.filter(a => a.category === 'routes-villages');
const memory = articles.filter(a => a.category === 'memoire-culture');
const heading = (title, route, subtitle = '') => `<div class="section-heading"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div><a href="${href(route)}">Toute la rubrique ${icon('arrow')}</a></div>`;
await write('', page(config.title, `
<div class="newsline"><span class="newsline-label">À LA UNE</span><p>Procès d’Ulfric : les questions que Valombre attend de voir éclaircies.</p><a href="${href(lead.url)}">Les faits ${icon('arrow')}</a></div>
<section class="front-page" aria-label="Les titres de cette édition"><article class="lead-story"><a href="${href(lead.url)}" class="lead-image" tabindex="-1" aria-hidden="true">${picture(lead, { eager: true, width: 1500, height: 850 })}<span class="image-tag">LE PROCÈS À VENIR</span></a><div class="lead-kicker">${kicker(lead)}<span class="small-caps">Justice · Affaire de l’Académie</span></div><h1><a href="${href(lead.url)}">Ulfric sera jugé.<br>Et l’Académie ?</a></h1><p class="lead-deck">Un procès se prépare à Valombre après l’arrestation d’Ulfric. L’affaire embarrasse l’Académie. Mais que sait-on, au juste, de ce qui sera présenté aux juges ?</p><div class="lead-bottom"><div class="meta">${byline(lead)}</div><a class="text-link" href="${href(lead.url)}">Lire l’article ${icon('arrow')}</a></div></article><aside class="front-sidebar" aria-label="À lire également"><div class="sidebar-title">Dans cette édition <span>◆</span></div>${secondary.map((a, i) => `<article class="side-story">${i === 1 ? `<a class="side-image" href="${href(a.url)}" tabindex="-1" aria-hidden="true">${picture(a)}</a>` : ''}${kicker(a)}<h2><a href="${href(a.url)}">${e(a.title)}</a></h2><p>${e(a.teaser || a.excerpt)}</p><div class="meta">${a.minutes} min de lecture ${icon('arrow')}</div></article>`).join('')}</aside></section>
<section class="local-section">${heading('La vie d’ici', 'rubriques/vie-locale/', 'Le quotidien mérite aussi ses gros titres.')}<div class="four-stories">${local.map(a => card(a)).join('')}</div></section>
<section class="city-interlude"><img src="${href('assets/images/valombre.webp')}" alt="La cité de Valombre étagée sur les montagnes, au-dessus des brumes" loading="lazy" width="1600" height="900"><div><span class="kicker light">Notre regard</span><h2>Une cité ne se raconte<br>pas depuis ses seules hauteurs.</h2><p>Un établi, une table de taverne, un départ de convoi : la Gazette prend le temps de regarder là où la vie se passe.</p><a href="${href('la-redaction/')}">L’esprit de la Gazette ${icon('arrow')}</a></div></section>
<section class="region-section">${heading('Au-delà des portes', 'rubriques/routes-villages/', 'Des nouvelles des chemins et des villages.')}<div class="region-layout"><div class="region-stories">${villages.map(a => card(a, 'horizontal')).join('')}</div><aside class="noticeboard"><span class="board-ornament">✦</span><h2>L’Affichoir de Valombre</h2><p class="board-intro">Les annonces de la cité et des environs.</p><div class="fiction-ad"><span class="kicker">Annonce commerciale</span><h3>Cordonnerie Tibbet</h3><p>Faites durer vos bottes.</p><span>Vieille Ville · Réparations de chaussures</span></div>${briefs.map(b => `<div class="brief"><span class="kicker">${e(b.topic)}</span><p>${e(b.text)}</p><a href="${href(`articles/${b.slug}/`)}">En savoir plus ${icon('arrow')}</a></div>`).join('')}</aside></div></section>
<section class="memory-section">${heading('La mémoire des pierres', 'rubriques/memoire-culture/')}<div class="memory-grid">${memory.map(a => card(a, 'memory-card')).join('')}</div></section>
<div class="edition-end"><span>✦</span><p>Les nouvelles passent. Les histoires restent.</p><a href="${href('archives/')}">Feuilleter toutes les parutions ${icon('arrow')}</a></div>`, { home: true }));

for (const category of categories) {
  const selected = articles.filter(a => a.category === category.slug);
  const route = `rubriques/${category.slug}/`;
  await write(route, page(category.name, `<div class="page-heading"><span class="kicker">Les rubriques de la Gazette</span><h1>${e(category.name)}</h1><p>${e(category.deck)}</p><span class="edition-count">${selected.length} articles à feuilleter</span></div><div class="category-stories">${selected.map(a => card(a)).join('')}</div>`, { path: route, category: category.slug, description: category.deck }));
}

for (const article of articles) {
  const chronology = articles.filter(a => a.category === 'enquetes').sort((a,b) => a.order-b.order);
  const position = chronology.findIndex(a => a.slug === article.slug);
  const neighbours = position < 0 ? '' : `<nav class="chronicle-navigation" aria-label="Chroniques de la campagne">${position > 0 ? `<a href="${href(chronology[position-1].url)}">← Chronique précédente</a>` : '<span></span>'}${position < chronology.length-1 ? `<a href="${href(chronology[position+1].url)}">Chronique suivante →</a>` : ''}</nav>`;
  const sections = [...article.body.matchAll(/^## (.+)$/gm)];
  let sectionIndex = 0;
  const articleHtml = markdown(article.body).replace(/<h2>/g, () => `<h2 id="section-${++sectionIndex}">`);
  const contents = sections.length < 3 ? '' : `<details class="article-contents"><summary>Dans cet article</summary><ol>${sections.map((section,i) => `<li><a href="#section-${i+1}">${e(section[1])}</a></li>`).join('')}</ol></details>`;
  const related = articles.filter(a => a.slug !== article.slug).sort((a, b) => Number(b.category === article.category) - Number(a.category === article.category)).slice(0, 3);
  const figure = `<figure class="article-figure">${picture(article, { eager: true, width: 1500, height: 850 })}<figcaption>${e(article.caption || article.alt)} · Illustration de la Gazette</figcaption></figure>`;
  await write(article.url, page(article.title, `<div class="breadcrumb"><a href="${href('')}">La une</a><span>/</span><a href="${href(`rubriques/${article.category}/`)}">${e(article.categoryName)}</a></div><article class="full-article"><header class="article-heading">${kicker(article)}<h1>${e(article.title)}</h1><p class="article-deck">${e(article.excerpt)}</p><div class="article-meta"><div class="meta">${byline(article)}<span class="meta-dot" aria-hidden="true">·</span><span>${e(article.edition || config.edition)}</span></div><div class="article-actions"><button type="button" data-copy-link aria-label="Copier le lien" title="Copier le lien">${icon('link')}<span>Copier le lien</span></button><button type="button" data-print aria-label="Imprimer l’article" title="Imprimer l’article">${icon('print')}<span>Imprimer</span></button></div></div></header>${figure}<div class="article-content-layout"><aside class="article-margin"><span class="kicker">${e(article.location || 'Valombre')}</span><span class="margin-line"></span><p>Une histoire de la cité<br>et de ses habitants.</p><a href="${href(`rubriques/${article.category}/`)}">Dans cette rubrique ${icon('arrow')}</a></aside><div class="article-body">${contents}${articleHtml}${neighbours}<div class="article-endmark" aria-hidden="true">◆</div></div></div></article><section class="related-section">${heading('La lecture continue', 'archives/')}<div class="three-stories">${related.map(a => card(a)).join('')}</div></section>`, { path: article.url, article: true, category: article.category, description: article.excerpt, image: article.image, mainClass: 'article-page' }));
}

await write('archives', page('Les archives', `<div class="page-heading"><span class="kicker">Toute la Gazette</span><h1>Les nouvelles passent.<br>Les archives restent.</h1><p>Les affaires de la cité, les histoires de ses quartiers et les chroniques de ses environs.</p></div><div class="archive-controls"><label>Rechercher dans les archives<input type="search" id="archive-search" placeholder="Un mot, un lieu, un nom…"></label><label>Choisir une rubrique<select id="archive-category"><option value="">Toutes les rubriques</option>${categories.map(c => `<option value="${c.slug}">${e(c.name)}</option>`).join('')}</select></label></div><p class="archive-count" role="status" aria-live="polite">${articles.length} articles</p><div class="archive-list">${articles.map((a, i) => `<article class="archive-row" data-category="${a.category}" data-search="${e(`${a.title} ${a.excerpt} ${a.categoryName} ${a.location || ''}`)}"><span class="archive-number">${String(i + 1).padStart(2, '0')}</span><a class="archive-image" href="${href(a.url)}" tabindex="-1" aria-hidden="true">${picture(a)}</a><div>${kicker(a)}<h2><a href="${href(a.url)}">${e(a.title)}</a></h2><p>${e(a.excerpt)}</p></div><span class="archive-reading">${a.minutes} min ${icon('arrow')}</span></article>`).join('')}</div><p class="archive-empty" hidden>Aucun article ne correspond à cette recherche. Essayez un autre mot ou une autre rubrique.</p>`, { path: 'archives/' }));

await write('la-redaction', page('L’esprit de la Gazette', `<div class="page-heading"><span class="kicker">Notre journal</span><h1>Toute la cité.<br>Pas seulement ses notables.</h1><p>La Gazette de Valombre raconte les grandes affaires sans oublier les petites rues.</p></div><div class="about-layout"><img src="${href('assets/images/vieille-ville.webp')}" alt="Les rues pavées et les boutiques de la Vieille Ville" width="1000" height="800"><div class="article-body"><h2>Regarder à hauteur d’habitant</h2><p>Une cité se compose de bien davantage que de ses proclamations. Elle vit dans les ateliers, autour des braseros, sur les routes et aux tables où l’on partage le repas. Nous donnons une place à ces histoires.</p><h2>Demander des comptes</h2><p>Une accusation n’est pas un verdict. Un récit officiel n’épuise pas les faits. Nos enquêtes distinguent ce qui est établi, ce qui est rapporté et ce qui demande encore une réponse.</p><h2>Garder une mémoire</h2><p>Les parutions restent consultables dans les archives. On peut suivre une affaire, retrouver un lieu ou simplement prendre le temps de lire une chronique oubliée.</p><h2>Un journal dans un monde imaginaire</h2><p>La Gazette est une publication fictive consacrée à Valombre. Ses nouvelles et ses illustrations appartiennent à un univers de jeu de rôle. On y vient pour découvrir la cité au fil de ses histoires.</p></div></div>`, { path: 'la-redaction/' }));

const missing = page('Cette page a quitté la tournée', `<div class="not-found"><span class="kicker">Page introuvable · 404</span><h1>Cette nouvelle n’est pas<br>à cette adresse.</h1><p>Un feuillet égaré, peut-être. La une et les archives vous attendent.</p><a class="solid-link" href="${href('')}">Retrouver la une ${icon('arrow')}</a><a href="${href('archives/')}">Consulter les archives</a></div>`);
await fs.writeFile(path.join(output, '404.html'), missing);
await fs.writeFile(path.join(output, '.nojekyll'), '');
await fs.writeFile(path.join(output, 'assets/search-index.json'), JSON.stringify(articles.map(a => ({ title: a.title, excerpt: a.excerpt, category: a.categoryName, location: a.location, path: href(a.url) }))));
const urls = ['', 'archives/', 'la-redaction/', ...categories.map(c => `rubriques/${c.slug}/`), ...articles.map(a => a.url)];
await fs.writeFile(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${e(config.url + '/' + u)}</loc></url>`).join('')}</urlset>`);
await fs.writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${config.url}/sitemap.xml\n`);
console.log(`${articles.length} articles · ${categories.length} rubriques · ${urls.length} pages construites dans dist/`);
