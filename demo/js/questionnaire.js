/* Valou — questionnaire de visite à imprimer et à remplir à la main.
   Mêmes rubriques que l'appli : la maison, le chauffage, les pièces (postes imposés), structure / toiture / équipements.
   maisonDepuisQuestionnaire() transforme les réponses (lues sur la photo) en maison Valou. */
import { TYPES_PIECE, SOLS, MURS, PLAFONDS, WC, POSTES_PIECES, CHAUFFAGE_ACTUEL, CHAUFFAGE_SOUHAITE, MARCHES_PAR_ESCALIER, unitePoste } from "./moteur.js";
import { esc } from "./format.js";

export const NB_PIECES = 10; // blocs « pièce » imprimés (2 par page)

const box = (l = "", u = "", large = false) => `<span class="q-champ ${large ? "large" : ""}"><span class="q-lab">${l}</span><span class="q-box"></span>${u ? `<span class="q-u">${u}</span>` : ""}</span>`;
const cases = L => L.map(t => `<span class="q-cb"><span class="q-carre"></span>${esc(t)}</span>`).join("");
const ligne = (t, contenu) => `<div class="q-ligne"><b>${t}</b><div>${contenu}</div></div>`;

function blocPiece(n) {
  return `<section class="q-piece">
    <div class="q-ptete"><span class="q-num">Pièce ${n}</span>${box("Nom", "", true)}${box("Sol", "m²")}</div>
    ${ligne("Type", cases(TYPES_PIECE.map(t => t[1])))}
    ${ligne("Sol à refaire", cases(SOLS.map(s => s[1])) + `<span class="q-cb"><span class="q-carre"></span><i>moi-même</i></span>`)}
    ${ligne("Murs", cases(MURS.map(m => m[1])) + box("carrelage mural", "m²") + `<span class="q-cb"><span class="q-carre"></span><i>moi-même</i></span>`)}
    ${ligne("Plafond à refaire", cases(PLAFONDS.map(p => p[1])) + `<span class="q-cb"><span class="q-carre"></span><i>moi-même</i></span>`)}
    ${ligne("Châssis", box("à remplacer", "nombre"))}
    ${ligne("Chauffage", box("radiateurs à poser / remplacer", "nombre") + cases(["Chauffage au sol à poser"]))}
    ${ligne("Cuisine / SDB", cases(["Remplacer la cuisine équipée", "Remplacer la salle de bain équipée"]))}
    ${ligne("WC", cases(WC.map(w => w[1])))}
    ${ligne("Garage", box("portes de garage", "nombre"))}
  </section>`;
}

export function ecranQuestionnaire(ctx) {
  const { R, entete } = ctx;
  const fixes = R.liste.filter(p => !POSTES_PIECES.test(p.k));
  const groupes = [...new Set(fixes.map(p => p.g))];
  const tete = (n, total) => `<header class="q-tete"><img src="../logo.png" alt="Valou"><div><b>Questionnaire de visite</b><small>Page ${n} / ${total} · à remplir au stylo, en lettres et chiffres bien lisibles</small></div></header>`;
  const pagesPieces = Math.ceil(NB_PIECES / 2), total = 2 + pagesPieces;
  const p1 = `<article class="q-page">${tete(1, total)}
    <h2>La maison</h2>
    <div class="q-grille">${box("Nom (pour vous)", "", true)}${box("Commune", "", true)}${box("Prix demandé", "€")}${box("Année de construction")}${box("Surface habitable", "m²")}</div>
    ${ligne("État général", cases(["Bon état", "À rafraîchir", "À rénover (support abîmé)"]))}
    ${ligne("Seule habitation, occupée par moi", cases(["Oui", "Non"]))}
    <h2>Le chauffage</h2>
    ${ligne("Chauffage existant", cases(CHAUFFAGE_ACTUEL.map(c => c[1])))}
    ${ligne("Chauffage souhaité", cases(CHAUFFAGE_SOUHAITE.map(c => c[1])))}
    <h2>Mode d'emploi</h2>
    <ol class="q-aide">
      <li>Cochez ce qui est à refaire et écrivez les chiffres dans les cases.</li>
      <li>Une pièce par bloc, dans l'ordre de la visite (pages suivantes). Les murs et le plafond sont calculés par l'appli à partir du sol.</li>
      <li>Après la visite, photographiez chaque page bien à plat, avec de la lumière.</li>
    </ol>
    <h2>Notes</h2><div class="q-notes"></div>
  </article>`;
  const pp = Array.from({ length: pagesPieces }, (_, i) => `<article class="q-page">${tete(i + 2, total)}<h2>Les pièces</h2>${blocPiece(i * 2 + 1)}${i * 2 + 2 <= NB_PIECES ? blocPiece(i * 2 + 2) : ""}</article>`).join("");
  const pf = `<article class="q-page">${tete(total, total)}
    <h2>Structure, toiture et équipements</h2>
    <p class="q-petit">Écrivez la quantité à prévoir. Laissez vide si rien n'est à faire. Escalier : nombre de marches (${MARCHES_PAR_ESCALIER} marches = 1 escalier).</p>
    <div class="q-colonnes">${groupes.map(g => `<div class="q-grp"><h3>${esc(g)}</h3>${fixes.filter(p => p.g === g).map(p => `<div class="q-poste"><span>${esc(p.n)}</span><span class="q-box petit"></span><span class="q-u">${/escalier/.test(p.u) ? "marches" : esc(unitePoste(p.u, p.k))}</span></div>`).join("")}</div>`).join("")}</div>
  </article>`;
  return `${entete("")}
  <main class="questionnaire">
    <div class="no-print barre-outils"><a href="#/" class="retour">← Mes maisons</a><button class="btn" data-action="imprimer">Télécharger / imprimer (PDF)</button></div>
    <p class="no-print mu q-intro">À imprimer avant la visite (${total} pages A4). Remplissez-le à la main pendant la visite.</p>
    ${p1}${pp}${pf}
  </main>`;
}

/* ---------- réponses lues sur la photo → maison Valou ----------
   r = { maison: { nom, commune, prix, annee, surface, etat: "bon"|"rafraichir"|"renover", unique: true|false },
         chauffage: { actuel, souhaite },
         pieces: [{ nom, type, sol, sol_refaire: "carrelage"|"parquet"|null, sol_moi, murs: ["plafonnage","peinture","carrelage"], carrelage_m2, murs_moi,
                    plafond: "peinture"|"plafonnage"|"plaques"|null, plafond_moi, chassis, radiateurs, chauffage_sol, cuisine, sdb, wc: ["sp",...], garage }],
         structure: { "<code poste>": quantité, ... },   (pour l'escalier : nombre de marches)
         notes } */
const nombreOuNull = v => (v === "" || v == null || isNaN(+v) ? null : +v);

export function maisonDepuisQuestionnaire(r, nouvelId) {
  const M = r.maison || {}, C = r.chauffage || {};
  const etat = ["bon", "rafraichir", "renover"].includes(M.etat) ? M.etat : "rafraichir";
  const m = {
    id: nouvelId(), nom: M.nom || "Maison visitée", commune: M.commune || "", prix: nombreOuNull(M.prix) || 0, annee: nombreOuNull(M.annee), surface: nombreOuNull(M.surface) || 0,
    etat, uniqueHabitation: M.unique !== false, fraisNotaire: null, rep: { etat: etat === "renover" ? "oui" : "non" },
    chauffage: { actuel: CHAUFFAGE_ACTUEL.some(c => c[0] === C.actuel) ? C.actuel : "gaz", souhaite: CHAUFFAGE_SOUHAITE.some(c => c[0] === C.souhaite) ? C.souhaite : "garder" },
    description: r.notes || "", source: "questionnaire",
  };
  m.pieces = (r.pieces || []).filter(p => p && (p.nom || p.sol)).map((p, i) => {
    const murs = p.murs || [];
    const wc = (p.wc || []).filter(w => WC.some(x => x[0] === w));
    return {
      id: nouvelId(), c: i, nom: p.nom || `Pièce ${i + 1}`, type: TYPES_PIECE.some(t => t[0] === p.type) ? p.type : "standard", sol: nombreOuNull(p.sol), murs: null,
      sOn: !!p.sol_refaire, sT: p.sol_refaire === "parquet" ? "parquet" : "carrelage", sMe: !!p.sol_moi,
      mpf: murs.includes("plafonnage"), mpe: murs.includes("peinture"), mca: murs.includes("carrelage"), mcaM2: nombreOuNull(p.carrelage_m2), mMe: !!p.murs_moi,
      pOn: !!p.plafond, pT: PLAFONDS.some(x => x[0] === p.plafond) ? p.plafond : "peinture", pMe: !!p.plafond_moi,
      chOn: nombreOuNull(p.chassis) > 0, chN: nombreOuNull(p.chassis),
      hc: p.chauffage_sol ? "sol" : nombreOuNull(p.radiateurs) > 0 ? "ra" : "", hr: !!p.chauffage_sol || nombreOuNull(p.radiateurs) > 0, hn: nombreOuNull(p.radiateurs),
      meu: !!(p.cuisine || p.sdb), wi: wc, pg: nombreOuNull(p.garage),
    };
  });
  m.travaux = Object.entries(r.structure || {}).filter(([, q]) => nombreOuNull(q) > 0).map(([k, q]) =>
    /^i_es_/.test(k) ? { id: nouvelId(), piece: "Toute la maison", k, marches: +q } : { id: nouvelId(), piece: "Toute la maison", k, q: +q });
  return m;
}
