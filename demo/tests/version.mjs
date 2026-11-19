/* Numéro de version des fichiers de la démo : à chaque mise en ligne, le téléphone doit recharger les nouveaux fichiers
   au lieu de réutiliser ceux qu'il a gardés en mémoire. Lancer avant chaque mise en ligne : node demo/tests/version.mjs */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const demo = fileURLToPath(new URL("../", import.meta.url));
const d = new Date(), z = n => String(n).padStart(2, "0");
const v = `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}${z(d.getHours())}${z(d.getMinutes())}`;
const marque = s => s.replace(/(\.(?:js|css))(\?v=\w+)?(["'])/g, `$1?v=${v}$3`);
let n = 0;
for (const f of readdirSync(demo + "js").filter(f => f.endsWith(".js"))) {
  const p = demo + "js/" + f, s = readFileSync(p, "utf8");
  /* seulement les imports relatifs : from "./x.js" */
  const t = s.replace(/(from\s+["']\.\/[\w-]+\.js)(\?v=\w+)?(["'])/g, `$1?v=${v}$3`);
  if (t !== s) { writeFileSync(p, t); n++; }
}
for (const p of ["index.html", "artisan/index.html", "negociant/index.html", "particulier/index.html"].map(x => demo + x)) {
  const s = readFileSync(p, "utf8"), t = s.replace(/((?:src|href)="(?:\.\.\/)?(?:js\/app\.js|css\/valou\.css))(\?v=\w+)?(")/g, `$1?v=${v}$3`);
  if (t !== s) { writeFileSync(p, t); n++; }
}
console.log(`version ${v} : ${n} fichiers marqués`);
