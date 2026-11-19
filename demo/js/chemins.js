/* Valou — les 4 versions de la démo (une tuile chacune sur l'écran d'accueil) :
   complete (hoono.be/demo/), artisan (/demo/artisan/), negociant (/demo/negociant/), particulier (/demo/particulier/).
   Chaque version garde ses propres données sur l'appareil : maisons, photos, fiche négociant, avis. */
export const VERSION = (typeof document !== "undefined" && document.documentElement.dataset.version) || "complete";
export const DEMO_DIR = new URL("../", import.meta.url).href; // dossier de la démo (img/, maison-demo.json)
export const RACINE = new URL("../../", import.meta.url).href; // racine du site (tarifs, prix, photo par défaut)
/* nom de stockage propre à la version (la version complète garde les anciens noms) */
export const cle = k => (VERSION === "complete" ? k : `${k}__${VERSION}`);
export const img = f => `${DEMO_DIR}img/${f}`;
