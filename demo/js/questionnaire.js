/* Valou — questionnaire de visite à imprimer et à remplir à la main.
   Mêmes rubriques que l'appli : la maison, le chauffage, les pièces (postes imposés), structure / toiture / équipements.
   maisonDepuisQuestionnaire() transforme les réponses (lues sur la photo) en maison Valou. */
import { TYPES_PIECE, PLAFONDS, WC, CHAUFFAGE_ACTUEL, CHAUFFAGE_SOUHAITE } from "./moteur.js";
import { img } from "./chemins.js";
import { esc } from "./format.js";

/* pièces pré-imprimées : celles qui peuvent composer une grande maison (+ 2 lignes libres) */
export const PIECES_QUESTIONNAIRE = [
  ["Hall d'entrée", "standard"], ["Séjour / salon", "standard"], ["Salle à manger", "standard"], ["Cuisine", "cuisine"], ["Arrière-cuisine", "standard"],
  ["Buanderie", "standard"], ["WC (rez)", "wc"], ["Bureau", "standard"], ["Véranda", "standard"], ["Couloir / palier", "standard"],
  ["Chambre 1", "standard"], ["Chambre 2", "standard"], ["Chambre 3", "standard"], ["Chambre 4", "standard"], ["Salle de bain", "sdb"],
  ["Salle de douche", "sdb"], ["WC (étage)", "wc"], ["Grenier / combles", "standard"], ["Cave", "standard"], ["Garage", "garage"],
  ["Autre :", "standard"], ["Autre :", "standard"],
];
/* gros travaux hors pièces repris sur la page 1 */
export const GROS_TRAVAUX = [
  ["i_cv_1", "Toiture : couverture à refaire", "m²"], ["i_to_1", "Isolation de la toiture", "m²"], ["i_fa_3", "Isolation de façade (extérieure)", "m²"],
  ["i_fa_1", "Façade : enduit / crépi", "m²"], ["i_re", "Électricité complète", "m²"], ["i_co", "Tableau électrique", "pièce"],
  ["i_pe", "Porte d'entrée", "pièce"], ["i_pi", "Portes intérieures", "pièce"], ["i_dem", "Démolition intérieure", "m²"],
  ["i_zi", "Gouttières", "m"], ["i_es_1", "Escalier à peindre", "marches"], ["i_te", "Terrasse", "m²"],
];

const box = (l = "", u = "", large = false) => `<span class="q-champ ${large ? "large" : ""}"><span class="q-lab">${l}</span><span class="q-box"></span>${u ? `<span class="q-u">${u}</span>` : ""}</span>`;
const cases = L => L.map(t => `<span class="q-cb"><span class="q-carre"></span>${esc(t)}</span>`).join("");
const ligne = (t, contenu) => `<div class="q-ligne"><b>${t}</b><div>${contenu}</div></div>`;
const carre = `<span class="q-carre"></span>`;

export function ecranQuestionnaire(ctx) {
  const { entete } = ctx;
  const tete = (n, t) => `<header class="q-tete"><img src="${img("logo-valou.png")}" alt="Valou"><div><b>Questionnaire de visite</b><small>Page ${n} / 2 · ${t}</small></div></header>`;
  const p1 = `<article class="q-page">${tete(1, "à remplir au stylo, en chiffres bien lisibles")}
    <div class="q-deux">
      <div>
        <h2>La maison</h2>
        <div class="q-grille">${box("Nom", "", true)}${box("Commune", "", true)}${box("Prix demandé", "€")}${box("Année")}${box("Surface habitable", "m²")}</div>
        ${ligne("État général", cases(["Bon état", "À rafraîchir", "À rénover"]))}
        ${ligne("Seule habitation", cases(["Oui", "Non"]))}
        ${ligne("PEB (annonce)", cases(["A++", "A+", "A", "B", "C", "D", "E", "F", "G"]) + box("", "kWh/m²/an"))}
        <h2>Le chauffage de la maison</h2>
        ${ligne("Existant", cases(CHAUFFAGE_ACTUEL.map(c => c[1])))}
        ${ligne("Souhaité", cases(["Garder l'actuel", "Chaudière gaz à condensation", "Pompe à chaleur"]))}
        <h2>Notes</h2><div class="q-notes"></div>
      </div>
      <div>
        <h2>Gros travaux (hors pièces)</h2>
        <p class="q-petit">Quantité à prévoir. Laissez vide si rien n'est à faire.</p>
        ${GROS_TRAVAUX.map(([, t, u]) => `<div class="q-poste"><span>${esc(t)}</span><span class="q-box petit"></span><span class="q-u">${u}</span></div>`).join("")}
        <div class="q-poste"><span>Autre : ……………………………………</span><span class="q-box petit"></span><span class="q-u"></span></div>
        <div class="q-poste"><span>Autre : ……………………………………</span><span class="q-box petit"></span><span class="q-u"></span></div>
        <p class="q-petit q-aide2">Après la visite : photographiez les 2 pages bien à plat, avec de la lumière. Les murs (sol × 2,7) et le plafond (= sol) sont calculés par l'appli.</p>
      </div>
    </div>
  </article>`;
  const na = `<td class="q-na"></td>`;
  const lignes = PIECES_QUESTIONNAIRE.map(([nom, type]) => {
    const eq = type === "cuisine" ? `<td class="q-c">${carre}<small>cuisine</small></td>` : type === "sdb" ? `<td class="q-c">${carre}<small>SDB</small></td>` : type === "wc" ? `<td class="q-c q-wc">${carre}<small>susp.</small> ${carre}<small>class.</small></td>` : na;
    return `<tr><th>${esc(nom)}${nom === "Autre :" ? " <span class=\"q-trait\"></span>" : ""}</th>
      <td></td><td class="q-c">${carre}</td><td class="q-c">${carre}</td>
      <td class="q-c">${carre}</td><td class="q-c">${carre}</td><td class="q-c">${carre}</td>
      <td class="q-c">${carre}</td><td class="q-c">${carre}</td>
      ${type === "garage" ? `<td></td>${na}${na}` : `<td></td><td class="q-c">${carre}</td><td class="q-c">${carre}</td>`}
      ${type === "garage" ? `${na}${na}` : `<td></td><td class="q-c">${carre}</td>`}
      ${eq}<td></td></tr>`;
  }).join("");
  const p2 = `<article class="q-page">${tete(2, "les pièces : une ligne par pièce, cochez ce qui est à refaire")}
    <table class="q-table">
      <thead>
        <tr><th rowspan="2">Pièces</th><th rowspan="2">Sol<br>m²</th><th colspan="2">Sol à refaire</th><th colspan="3">Murs (à refaire)</th><th colspan="2">Plafond</th><th colspan="3">Châssis à remplacer</th><th colspan="2">Chauffage</th><th rowspan="2">Équipé /<br>à remplacer</th><th rowspan="2">Remarques</th></tr>
        <tr class="q-sous"><th>Carre&shy;lage</th><th>Par&shy;quet</th><th>Plafon&shy;nage</th><th>Pein&shy;ture</th><th>Carre&shy;lage</th><th>Pein&shy;ture</th><th>Pla&shy;ques</th><th>Nom&shy;bre</th><th>PVC</th><th>Alu</th><th>Radia&shy;teurs</th><th>Au sol</th></tr>
      </thead>
      <tbody>${lignes}</tbody>
    </table>
    <p class="q-petit">Garage : nombre de portes de garage dans la colonne « Châssis : nombre ». WC : cochez « susp. » (suspendu) ou « class. » (sur pied) si le WC est à remplacer. Le détail (moi-même, murs mesurés, équipements) se complète ensuite dans l'appli.</p>
  </article>`;
  return `${entete("")}
  <main class="questionnaire">
    <div class="no-print barre-outils"><a href="#/" class="retour">← Mes maisons</a><button class="btn" data-action="imprimer">Télécharger / imprimer (PDF)</button></div>
    <p class="no-print mu q-intro">2 pages A4 à l'horizontale (recto-verso), à imprimer avant la visite et à remplir à la main.</p>
    ${p1}${p2}
  </main>`;
}

/* ---------- réponses lues sur la photo → maison Valou ----------
   r = { maison: { nom, commune, prix, annee, surface, etat: "bon"|"rafraichir"|"renover", unique: true|false, peb: "A++"…"G", peb_conso },
         chauffage: { actuel, souhaite },
         pieces: [{ nom, type, sol, sol_refaire: "carrelage"|"parquet"|null, sol_moi, murs: ["plafonnage","peinture","carrelage"], carrelage_m2, murs_moi,
                    plafond: "peinture"|"plafonnage"|"plaques"|null, plafond_moi, chassis, chassis_type: "pvc"|"alu", radiateurs, chauffage_sol,
                    cuisine, sdb, wc: ["sp","cl",...], garage }],
         (le type de pièce vient de la ligne pré-imprimée : PIECES_QUESTIONNAIRE)
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
    peb: ["A++", "A+", "A", "B", "C", "D", "E", "F", "G"].includes(M.peb) ? M.peb : null, pebConso: nombreOuNull(M.peb_conso),
  };
  m.pieces = (r.pieces || []).filter(p => p && (p.nom || p.sol)).map((p, i) => {
    const murs = p.murs || [];
    const wc = (p.wc || []).filter(w => WC.some(x => x[0] === w));
    return {
      id: nouvelId(), c: i, nom: p.nom || `Pièce ${i + 1}`, type: TYPES_PIECE.some(t => t[0] === p.type) ? p.type : "standard", sol: nombreOuNull(p.sol), murs: null,
      sOn: !!p.sol_refaire, sT: p.sol_refaire === "parquet" ? "parquet" : "carrelage", sMe: !!p.sol_moi,
      mpf: murs.includes("plafonnage"), mpe: murs.includes("peinture"), mca: murs.includes("carrelage"), mcaM2: nombreOuNull(p.carrelage_m2), mMe: !!p.murs_moi,
      pOn: !!p.plafond, pT: PLAFONDS.some(x => x[0] === p.plafond) ? p.plafond : "peinture", pMe: !!p.plafond_moi,
      chOn: p.type !== "garage" && nombreOuNull(p.chassis) > 0, chN: nombreOuNull(p.chassis), chT: p.chassis_type === "alu" ? "alu" : "pvc",
      hc: p.chauffage_sol ? "sol" : nombreOuNull(p.radiateurs) > 0 ? "ra" : "", hr: !!p.chauffage_sol || nombreOuNull(p.radiateurs) > 0, hn: nombreOuNull(p.radiateurs),
      meu: !!(p.cuisine || p.sdb), wi: wc, pg: nombreOuNull(p.garage) ?? (p.type === "garage" ? nombreOuNull(p.chassis) : null),
    };
  });
  m.travaux = Object.entries(r.structure || {}).filter(([, q]) => nombreOuNull(q) > 0).map(([k, q]) =>
    /^i_es_/.test(k) ? { id: nouvelId(), piece: "Toute la maison", k, marches: +q } : { id: nouvelId(), piece: "Toute la maison", k, q: +q });
  return m;
}
