# La Gazette de Valombre

Journal fictif de presse locale consacré à Valombre et à ses environs.

**Site : https://kithain.github.io/gazette-de-valombre/**

Le site comprend une une éditorialisée, cinq rubriques, des articles illustrés, des archives filtrables, une recherche, le partage des liens et une présentation adaptée à l’impression. Il fonctionne sur ordinateur et téléphone.

## Ajouter un article depuis GitHub

1. Ouvrir le dossier `content/articles` et choisir **Add file → Create new file**.
2. Nommer le fichier, par exemple `nouvelle-du-marche.md`.
3. Copier le modèle de `content/modele-article.md`, puis remplir les métadonnées et le texte.
4. Enregistrer sur la branche `main`. Le workflow **Publier la Gazette** reconstruit, vérifie et publie le site.

Le champ `order` détermine l’ordre d’affichage, du plus grand au plus petit. Le `slug` doit être unique, en minuscules sans accents, avec des tirets.

Les rubriques disponibles sont `vie-locale`, `artisans-commerces`, `routes-villages`, `enquetes` et `memoire-culture`.

Pour une illustration supplémentaire, déposer un fichier WebP dans `public/assets/images`, puis indiquer son nom dans `image`. Le champ `alt` décrit l’image ; `caption` permet d’ajouter une légende.

La une met en avant l’affaire du relais et une sélection d’articles. Pour modifier cette sélection, adapter les listes `lead`, `secondary`, `local` et `briefs` dans `scripts/build.mjs`. Tous les nouveaux articles apparaissent automatiquement dans leur rubrique, les archives et la recherche.

## Ligne éditoriale

Les articles publiés relatent les séances déjà jouées ou décrivent la vie quotidienne de la cité. Les chroniques d’ambiance développent les métiers, les commerces et les usages ordinaires de l’univers. Les préparations de séance et les notes du MJ restent en dehors de ce dépôt public.

Les dossiers d’archives s’en tiennent aux éléments publics de l’univers. Les informations privées issues des apartés ne sont pas publiées. Les quatre articles de campagne ont été adaptés à partir des textes préparés pour les joueurs ; les dix autres sont des chroniques de vie locale.

## Travailler en local

Node.js 20 ou supérieur suffit. Aucune dépendance npm n’est nécessaire.

```sh
npm run build
npm run check
npm run dev
```

L’aperçu local est disponible à `http://127.0.0.1:4173/gazette-de-valombre/`.

Les textes sont dans `content/articles`, la mise en page dans `public/assets/styles.css` et les interactions dans `public/assets/site.js`. Le générateur produit `dist`, qui est transmis à GitHub Pages par le workflow. Les fichiers de l’univers et les notes de rédaction ne sont pas nécessaires à la construction du site.

Pour utiliser un autre nom de dépôt ou un domaine personnalisé, modifier `url` et `basePath` dans `site.config.json`.

## Illustrations et typographies

Les illustrations proviennent de l’univers de campagne. Les polices Newsreader et Manrope sont hébergées avec le site ; leurs licences SIL Open Font License figurent dans `public/assets/fonts`.
