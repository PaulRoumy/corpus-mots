// Garde de la règle « aucune valeur en dur » (UX-DR-1) : dans src/app (hors client généré api/), aucun fichier
// .scss, .css, .ts ou .html ne contient de couleur, d'ombre, de typographie, de z-index ni de longueur littérale.
// Les valeurs vivent dans les jetons (src/styles/_jetons.scss) et se référencent par var(--mat-sys-*) ou var(--cm-*).
// Lancé par `npm test` (pretest) ; sort en erreur et liste chaque écart trouvé. Les commentaires sont ignorés.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = fileURLToPath(new URL('..', import.meta.url));
const app = join(racine, 'src', 'app');
const exclus = [join(app, 'api')];

const regles = [
  {
    nom: 'couleur hexadécimale',
    motif: /(?<![\w&$-])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
  },
  {
    nom: 'couleur ou ombre par fonction',
    motif: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|drop-shadow)\(/gi,
  },
  {
    nom: 'couleur nommée',
    motif:
      /\b(?:color|background(?:-color)?|border(?:-[a-z]+)*|outline(?:-color)?|fill|stroke)\s*:[^;{}]*\b(?:white|black|red|green|blue|yellow|orange|purple|gray|grey|pink|brown)\b/gi,
  },
  {
    nom: 'ombre littérale',
    motif: /\b(?:box|text)-shadow\s*:(?!\s*(?:var\(|none\b|inherit\b|initial\b|unset\b))/gi,
  },
  {
    nom: 'typographie littérale',
    motif: /\b(?:font-weight|font-size|line-height)\s*:(?!\s*(?:var\(|inherit\b))/gi,
  },
  { nom: 'z-index littéral', motif: /\bz-index\s*:\s*-?\d/gi },
  { nom: 'longueur px/rem/em/vh/vw', motif: /(?<![\w.-])-?\d*\.?\d+(?:px|rem|em|vh|vw)\b/gi },
];

/** Retire les commentaires en gardant les retours à la ligne, donc les numéros de ligne. */
function sansCommentaires(texte) {
  const blanc = (commentaire) => commentaire.replace(/[^\n]/g, '');
  return texte
    .replace(/\/\*[\s\S]*?\*\//g, blanc)
    .replace(/<!--[\s\S]*?-->/g, blanc)
    .replace(/(?<![:'"\\])\/\/.*$/gm, '');
}

function fichiers(dossier) {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name);
    if (exclus.includes(chemin)) {
      return [];
    }
    if (entree.isDirectory()) {
      return fichiers(chemin);
    }
    return /\.(scss|css|ts|html)$/.test(entree.name) ? [chemin] : [];
  });
}

const ecarts = [];
for (const fichier of fichiers(app)) {
  const lignes = sansCommentaires(readFileSync(fichier, 'utf8')).split(/\r?\n/);
  lignes.forEach((ligne, index) => {
    for (const { nom, motif } of regles) {
      for (const trouve of ligne.matchAll(motif)) {
        const chemin = relative(racine, fichier).split(sep).join('/');
        ecarts.push(`${chemin}:${index + 1} : ${nom} « ${trouve[0].trim() || ligne.trim()} »`);
      }
    }
  });
}

if (ecarts.length > 0) {
  console.error('Valeurs littérales hors des jetons (utiliser var(--mat-sys-*) ou var(--cm-*)) :');
  for (const ecart of ecarts) {
    console.error(`  ${ecart}`);
  }
  process.exit(1);
}
console.log('verifier-jetons : aucune valeur littérale dans src/app.');
