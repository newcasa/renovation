/* Valou — questionnaire de visite à imprimer et à remplir à la main.
   Mêmes rubriques que l'appli : la maison, le chauffage, les pièces (postes imposés), structure / toiture / équipements.
   maisonDepuisQuestionnaire() transforme les réponses (lues sur la photo) en maison Valou. */
import { TYPES_PIECE, PLAFONDS, WC, CHAUFFAGE_ACTUEL, CHAUFFAGE_SOUHAITE } from "./moteur.js?v=202611221421";
import { img, DEMO_DIR } from "./chemins.js?v=202611221421";
import { esc } from "./format.js?v=202611221421";

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
  ["i_cv_1", "Toiture : couverture", "m²"], ["i_to_1", "Isolation de la toiture", "m²"], ["i_fa_3", "Isolation de façade (extérieure)", "m²"],
  ["i_fa_1", "Façade : enduit / crépi", "m²"], ["i_re", "Électricité complète", "m²"], ["i_co", "Tableau électrique", "pièce"],
  ["i_pe", "Porte d'entrée", "pièce"], ["i_pi", "Portes intérieures", "pièce"], ["i_dem", "Démolition intérieure", "m²"],
  ["i_zi", "Gouttières", "m"], ["i_es_1", "Escalier à peindre", "marches"], ["i_te", "Terrasse", "m²"],
];

/* rappels pendant la visite (feuille papier et appli) */
export const RAPPELS_VISITE = [
  ["chassis", "Tester chaque châssis (ouverture, joints, buée entre les vitres)"],
  ["plans", "Demander à voir les plans"],
  ["peb", "Demander le certificat PEB"],
  ["elec", "Demander le contrôle de l'installation électrique"],
  ["chaudiere", "Âge et entretien de la chaudière (factures)"],
  ["toiture", "Âge de la toiture, regarder la charpente au grenier"],
  ["humidite", "Traces d'humidité : cave, bas des murs, plafonds"],
  ["eau", "Ouvrir les robinets, tirer la chasse (pression, évacuation)"],
  ["amiante", "Maison d'avant 2001 : repérer ce qui pourrait contenir de l'amiante"],
  ["photos", "Photographier chaque pièce et ce qui pose question"],
];
const box = (l = "", u = "", large = false) => `<span class="q-champ ${large ? "large" : ""}"><span class="q-lab">${l}</span><span class="q-box"></span>${u ? `<span class="q-u">${u}</span>` : ""}</span>`;
const cases = L => L.map(t => `<span class="q-cb"><span class="q-carre"></span>${esc(t)}</span>`).join("");
const ligne = (t, contenu) => `<div class="q-ligne"><b>${t}</b><div>${contenu}</div></div>`;
const carre = `<span class="q-carre"></span>`;

/* pièces imprimées sur la feuille (une seule page) : les plus courantes + 2 lignes libres */
export const PIECES_FEUILLE = [
  ["Hall d'entrée", "standard"], ["Séjour / salon", "standard"], ["Cuisine", "cuisine"], ["WC", "wc"], ["Salle de bain", "sdb"],
  ["Chambre 1", "standard"], ["Chambre 2", "standard"], ["Chambre 3", "standard"], ["Chambre 4", "standard"], ["Couloir / palier", "standard"],
  ["Bureau", "standard"], ["Buanderie", "standard"], ["Grenier / combles", "standard"], ["Garage", "garage"], ["Autre :", "standard"], ["Autre :", "standard"],
];

export function ecranQuestionnaire(ctx) {
  const { entete } = ctx;
  const pdf = DEMO_DIR + "questionnaire-visite.pdf"; // feuille A4 prête à imprimer (même mise en page, régénérée par demo/tests/pdf-questionnaire.mjs)

  /* l'essentiel seulement : la surface, le sol à refaire, et une grande zone de remarques (le détail se fait plus tard dans l'appli) */
  const lignes = PIECES_FEUILLE.map(([nom]) => `<tr><th>${esc(nom)}${nom === "Autre :" ? " <span class=\"q-trait\"></span>" : ""}</th>
      <td></td><td class="q-c">${carre}</td><td class="q-c">${carre}</td><td></td><td class="q-rem">${nom === "Cuisine" ? `<small class="q-ouvert">Cuisine ouverte sur le séjour : tout le m² ici, laissez Séjour / salon vide</small>` : ""}</td></tr>`).join("");
  const page = `<article class="q-page q-une">
    <header class="q-tete"><img src="${img("logo-valou.png")}" alt="Valou"><div><b>Questionnaire de visite</b><small>Une page, à remplir au stylo, en chiffres bien lisibles</small></div></header>
    <div class="q-bandeau">
      <div class="q-b1">${box("Adresse", "", true)}${box("Commune", "", true)}${box("Prix", "€")}${box("Année")}${box("Surface", "m²")}${box("Étages", "rez +")}${box("Façades", "2/3/4")}${box("Largeur façade", "m")}${box("Profondeur", "m")}</div>
      <div class="q-b2">
        <span class="q-bl"><b>État</b>${cases(["Bon", "À rafraîchir", "À rénover"])}</span>
        <span class="q-bl"><b>Seule habitation</b>${cases(["Oui", "Non"])}</span>
        <span class="q-bl"><b>PEB</b>${cases(["A++", "A+", "A", "B", "C", "D", "E", "F", "G"])}${box("", "kWh/m²/an")}</span>
      </div>
      <div class="q-b2">
        <span class="q-bl"><b>Chauffage existant</b>${cases(CHAUFFAGE_ACTUEL.map(c => c[1]))}</span>
      </div>
    </div>
    <div class="q-rappels"><b>À ne pas oublier</b><div>${RAPPELS_VISITE.map(([, t]) => `<span class="q-cb"><span class="q-carre"></span>${esc(t)}</span>`).join("")}</div></div>
    <div class="q-corps">
      <table class="q-table">
        <thead>
          <tr><th>Pièces</th><th>Sol<br>m²</th><th>Sol à<br>refaire</th><th>Murs à<br>refaire</th><th>Châssis à<br>remplacer<br>(nombre)</th><th class="q-rem-t">Remarques</th></tr>
        </thead>
        <tbody>${lignes}</tbody>
      </table>
      <aside class="q-gt">
        <h2>Gros travaux (hors pièces)</h2>
        <p class="q-petit">Cochez ce qui est à refaire : les quantités se complètent plus tard dans l'appli.</p>
        ${GROS_TRAVAUX.map(([, t]) => `<div class="q-poste q-coche"><span class="q-carre"></span><span>${esc(t)}</span></div>`).join("")}
        <div class="q-poste q-coche"><span class="q-carre"></span><span>Autre : ……………………</span></div>
      </aside>
    </div>
    <div class="q-pied"><b>Notes</b><span class="q-petit"><b>Séjour ouvert sur la cuisine : comptez la totalité des m² sur la ligne « Cuisine » et laissez vides les lignes Séjour / salon, salle à manger ou séjour.</b> Pièce non imprimée : une ligne « Autre ». Le détail (type de sol, plafond, type de châssis, futur chauffage) se complète plus tard dans l'appli. Après la visite : une photo de la feuille, bien à plat.</span></div>
  </article>`;
  return `${entete("")}
  <main class="questionnaire">
    <div class="no-print barre-outils"><a href="#/" class="retour">← Mes maisons</a><span class="actions-g"><a class="btn" href="${pdf}" download="Valou-questionnaire-de-visite.pdf">📄 Télécharger le PDF (A4)</a><button class="btn sec" data-action="imprimer">🖨️ Imprimer</button></span></div>
    <p class="no-print mu q-intro">Une seule page A4 à l'horizontale, à imprimer avant la visite et à remplir à la main. Depuis un téléphone, prenez le PDF : il sort toujours au bon format.</p>
    ${page}
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
    etages: nombreOuNull(M.etages), facades: [2, 3, 4].includes(+M.facades) ? +M.facades : null,
    toitDim: { larg: nombreOuNull(M.largeur), prof: nombreOuNull(M.profondeur) },
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
