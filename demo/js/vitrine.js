/* Valou — écrans de présentation : Professionnels, Notre moteur, Feuille de route.
   Les écrans « Professionnels » sont des simulations : ils montrent ce que reçoit chaque professionnel,
   à partir des maisons encodées dans le prototype. */
import { calculerBudget, coutTotal, mensualite, FIABILITE, prixLocaux, RAYONS, MIN_ARTISANS, unitePoste } from "./moteur.js?v=202611270256";
import { RACINE, img } from "./chemins.js?v=202611270256";
import { euros, euros2, nombre, esc } from "./format.js?v=202611270256";

/* ---------- métiers : quels postes reçoit chaque artisan ---------- */
/* une partie du projet : un poste dans une pièce (ou pour toute la maison) */
export const cleLigne = l => `${l.k}|${l.pieceId || "maison"}`;

export const METIERS = [
  { id: "general", t: "Entreprise générale", f: () => true },
  { id: "macon", t: "Maçon", f: k => /^i_(mb|mp|da|dem|dr)$/.test(k) },
  { id: "carreleur", t: "Carreleur", f: k => /^(sol|mur)_carrelage$/.test(k) },
  { id: "peintre", t: "Peintre", f: k => /^(mur_peinture|pl_peinture|i_es_1)$/.test(k) },
  { id: "plafonneur", t: "Plafonneur", f: k => /^(mur_plafonnage|pl_plafonnage|pl|i_cg)$/.test(k) },
  { id: "electricien", t: "Électricien", f: k => /^i_(re|co|mc)$/.test(k) },
  { id: "chauffagiste", t: "Chauffagiste et sanitaire", f: k => /^(i_(cha|pac|rad|chs|pl)|meu_sdb|wc_.+)$/.test(k) },
  { id: "menuisier", t: "Menuisier", f: k => /^(i_(ch|ca|bv|pe|pi|pg|vo)|sol_parquet|meu_cuisine)$/.test(k) },
  { id: "couvreur", t: "Couvreur", f: k => /^i_(dp|st|cv_\d|cp_\d|zi|no|vx_\d|to_\d)$/.test(k) },
];

/* ---------- chantiers types : l'artisan chiffre au forfait des chantiers définis par Valou, toujours les mêmes ;
   deux tailles du même travail donnent son fixe (déplacement, installation) et son prix par m² ---------- */
/* distance fixe pour tous les chantiers types : tous les artisans chiffrent sur la même base, ce qui permet d'en déduire le déplacement */
export const DISTANCE_CHANTIER = 5;
/* consignes communes à tous les chantiers types (affichées en rouge) */
export const CONSIGNES = [
  `Chantier à <b>${DISTANCE_CHANTIER} km</b> de votre dépôt, déplacement compris.`,
  "<b>Aucune fourniture comprise</b> : main-d'œuvre seule, le client achète les matériaux.",
  "Prix <b>hors TVA</b>, comme sur un devis pour un particulier.",
  "Maison habitée, accès facile, sans difficulté particulière.",
  "Évacuation des déchets et container non compris, sauf si c'est indiqué.",
];
export const blocConsignes = () => `<div class="consignes"><b>⚠️ Consignes pour tous les chantiers</b><ul>${CONSIGNES.map(c => `<li>${c}</li>`).join("")}</ul></div>`;
export const CHANTIERS_TYPES = {
  macon: [
    { id: "mac_mur", k: "i_mb", u: "m²", q: [10, 30], t: "Monter un mur intérieur en blocs béton de 14 cm",
      d: "Hauteur 2,50 m, maison habitée, accès facile. Enduit et évacuation non compris." },
    { id: "mac_dem", k: "i_dem", u: "m²", q: [15, 40], t: "Démolir des cloisons intérieures non porteuses",
      d: "Cloisons en briques de 10 cm, avec évacuation des gravats vers le container. Container non compris." },
    { id: "mac_baie", k: "i_mp", u: "forfait", q: [1], t: "Ouvrir une baie de 2 m de large dans un mur porteur",
      d: "Mur en briques de 30 cm. Étançonnement, linteau acier ou béton et finitions brutes compris. Étude de stabilité non comprise." },
    { id: "mac_dalle", k: "i_da", u: "m²", q: [15, 40], t: "Couler une dalle béton armée de 12 cm",
      d: "Sur sol déjà préparé et compacté, intérieur. Isolation et chape de finition non comprises." },
    { id: "mac_drain", k: "i_dr", u: "m", q: [10, 30], t: "Poser un drainage périphérique",
      d: "Tranchée de 1 m de profondeur, drain, gravier, membrane et remblai. Terrassement à la mini-pelle compris." },
  ],
  carreleur: [
    { id: "car_sol", k: "sol_carrelage", u: "m²", q: [15, 40], t: "Poser un carrelage de sol 60×60",
      d: "Collé sur chape existante plane, joints compris, plinthes non comprises." },
    { id: "car_mur", k: "mur_carrelage", u: "m²", q: [8, 20], t: "Poser une faïence murale 30×60 dans une salle de bain",
      d: "Sur murs plans et secs, joints et profilés d'angle compris." },
  ],
  peintre: [
    { id: "pei_peint", k: "mur_peinture", u: "m²", q: [40, 120], t: "Peindre des murs intérieurs",
      d: "Murs déjà plafonnés et secs : 1 couche de fond et 2 couches de finition, protections comprises." },
    { id: "pei_plafp", k: "pl_peinture", u: "m²", q: [15, 40], t: "Peindre des plafonds",
      d: "Plafonds déjà plafonnés et secs : 1 couche de fond et 2 couches de finition, protections comprises." },
    { id: "pei_enduit", k: "mur_enduit", u: "m²", q: [30, 80], t: "Enduire des murs avant peinture",
      d: "Enduit de lissage en 2 passes et ponçage, sur murs plafonnés ou plaques de plâtre, prêts à peindre." },
    { id: "pei_esc", k: "i_es_1", u: "forfait", q: [1], t: "Décaper et peindre un escalier en bois",
      d: "Escalier droit d'environ 14 marches avec contremarches et rampe : décapage, ponçage, 1 couche de fond et 2 couches de finition." },
    { id: "pei_portes", k: "pei_portes", u: "pièce", q: [1, 6], t: "Peindre des portes intérieures",
      d: "Porte et chambranle, 2 faces : ponçage, 1 couche de fond et 2 couches de finition." },
  ],
  plafonneur: [
    { id: "pei_plaf", k: "mur_plafonnage", u: "m²", q: [30, 80], t: "Plafonner des murs",
      d: "Enduit plâtre d'environ 1 cm sur maçonnerie, cornières d'angle comprises." },
    { id: "pla_plaf", k: "pl_plafonnage", u: "m²", q: [10, 30], t: "Plafonner un plafond",
      d: "Enduit plâtre sur plafond en béton ou hourdis, surface plane." },
    { id: "pei_pl", k: "pl", u: "m²", q: [15, 50], t: "Poser un plafond en plaques de plâtre",
      d: "Sur ossature métallique, joints et enduit de finition compris." },
    { id: "pei_cg", k: "i_cg", u: "m²", q: [10, 30], t: "Monter une cloison en plaques de plâtre (2 faces)",
      d: "Ossature métallique, isolant acoustique, joints compris, hauteur 2,50 m." },
  ],
  electricien: [
    { id: "ele_re", k: "i_re", u: "m²", q: [80, 150], t: "Refaire toute l'installation électrique d'une maison",
      d: "Surface habitable indiquée, maison vidée. Prises et points lumineux standards, contrôle de conformité compris. Tableau non compris." },
    { id: "ele_co", k: "i_co", u: "forfait", q: [1], t: "Remplacer le tableau électrique",
      d: "Maison unifamiliale, 1 tableau avec différentiels et disjoncteurs, raccordement compris." },
    { id: "ele_mc", k: "i_mc", u: "forfait", q: [1], t: "Mettre en conformité une installation existante",
      d: "Maison de 3 chambres : corrections nécessaires, schémas et contrôle par un organisme agréé compris." },
  ],
  chauffagiste: [
    { id: "cha_rad", k: "i_rad", u: "pièce", q: [1, 6], t: "Remplacer des radiateurs",
      d: "Au même emplacement, purge et remise en eau comprises." },
    { id: "cha_chaud", k: "i_cha", u: "forfait", q: [1], t: "Remplacer une chaudière gaz par une chaudière à condensation",
      d: "24 kW, maison de 120 m², raccordements, évacuation des fumées et mise en service compris." },
    { id: "cha_pac", k: "i_pac", u: "forfait", q: [1], t: "Installer une pompe à chaleur air-eau",
      d: "8 kW à la place d'une chaudière, raccordée aux radiateurs existants, mise en service comprise." },
    { id: "cha_chs", k: "i_chs", u: "m²", q: [20, 60], t: "Poser un chauffage au sol à eau",
      d: "Isolant, tubes et collecteur, raccordé à la production existante. Chape non comprise." },
    { id: "cha_pl", k: "i_pl", u: "m²", q: [50, 120], t: "Refaire les arrivées d'eau et les évacuations",
      d: "Surface habitable indiquée, cuisine, salle de bain et WC." },
    { id: "cha_sdb", k: "meu_sdb", u: "forfait", q: [1], t: "Équiper une salle de bain de 6 m²",
      d: "Pose d'une douche, d'un meuble lavabo et de la robinetterie, plomberie comprise. Carrelage non compris." },
    { id: "cha_wcsp", k: "wc_sp", u: "forfait", q: [1], t: "Poser un WC suspendu avec bâti",
      d: "Raccordements compris." },
    { id: "cha_wccl", k: "wc_cl", u: "forfait", q: [1], t: "Poser un WC classique sur pied",
      d: "Remplacement à l'identique, raccordements compris." },
    { id: "cha_ev", k: "wc_ev", u: "forfait", q: [1], t: "Poser un lave-mains",
      d: "Raccordement eau froide et évacuation compris." },
    { id: "cha_mb", k: "wc_mb", u: "forfait", q: [1], t: "Poser un meuble lavabo",
      d: "Fixation, raccordements et silicone compris." },
    { id: "cha_rb", k: "wc_rb", u: "forfait", q: [1], t: "Remplacer une robinetterie (mitigeur)",
      d: "Dépose de l'ancienne comprise." },
  ],
  menuisier: [
    { id: "men_ch", k: "i_ch", u: "pièce", q: [1, 8], t: "Remplacer des fenêtres PVC 120×140",
      d: "Pose en rénovation sur dormant existant, finitions intérieures comprises." },
    { id: "men_ca", k: "i_ca", u: "pièce", q: [1, 8], t: "Placer des fenêtres aluminium 120×140",
      d: "Double vitrage, dépose de l'ancienne fenêtre comprise." },
    { id: "men_bv", k: "i_bv", u: "forfait", q: [1], t: "Placer une baie vitrée coulissante 240×215",
      d: "Aluminium, double vitrage, dans une ouverture existante." },
    { id: "men_pe", k: "i_pe", u: "forfait", q: [1], t: "Placer une porte d'entrée isolante",
      d: "PVC ou aluminium, serrure 3 points, dépose de l'ancienne comprise." },
    { id: "men_pi", k: "i_pi", u: "pièce", q: [1, 6], t: "Poser des portes intérieures",
      d: "Blocs-portes standards, chambranles compris." },
    { id: "men_pg", k: "i_pg", u: "forfait", q: [1], t: "Placer une porte de garage sectionnelle motorisée",
      d: "240×200, dépose de l'ancienne comprise." },
    { id: "men_vo", k: "i_vo", u: "pièce", q: [1, 6], t: "Placer des volets roulants électriques",
      d: "Pour fenêtres 120×140, raccordement électrique compris." },
    { id: "men_parq", k: "sol_parquet", u: "m²", q: [15, 40], t: "Poser un parquet contrecollé flottant",
      d: "Sous-couche et plinthes comprises, sur sol plan." },
    { id: "men_cui", k: "meu_cuisine", u: "forfait", q: [1], t: "Monter et poser une cuisine équipée de 4 m",
      d: "Meubles et électroménager fournis par le client, raccordements et plan de travail compris." },
  ],
  couvreur: [
    { id: "cou_dp", k: "i_dp", u: "m²", q: [60, 120], t: "Déposer une ancienne couverture",
      d: "Tuiles et liteaux, évacuation vers le container. Container et échafaudage non compris." },
    { id: "cou_st", k: "i_st", u: "m²", q: [60, 120], t: "Poser une sous-toiture respirante",
      d: "Avec contre-lattes et liteaux." },
    { id: "cou_tb", k: "i_cv_0", u: "m²", q: [60, 120], t: "Couvrir en tuiles béton",
      d: "Toiture à 2 versants, pente courante, échafaudage compris." },
    { id: "cou_tc", k: "i_cv_1", u: "m²", q: [60, 120], t: "Couvrir en tuiles terre cuite",
      d: "Toiture à 2 versants, pente courante, échafaudage compris." },
    { id: "cou_aa", k: "i_cv_2", u: "m²", q: [60, 120], t: "Couvrir en ardoises artificielles",
      d: "Toiture à 2 versants, pente courante, échafaudage compris." },
    { id: "cou_an", k: "i_cv_3", u: "m²", q: [60, 120], t: "Couvrir en ardoises naturelles",
      d: "Toiture à 2 versants, pente courante, échafaudage compris." },
    { id: "cou_epdm", k: "i_cv_4", u: "m²", q: [20, 60], t: "Poser une toiture plate EPDM",
      d: "Sur support existant sain, relevés et rives compris." },
    { id: "cou_comb", k: "i_to_0", u: "m²", q: [40, 90], t: "Isoler les combles perdus",
      d: "Laine minérale de 22 cm posée au sol du grenier." },
    { id: "cou_ramp", k: "i_to_1", u: "m²", q: [40, 90], t: "Isoler sous les rampants",
      d: "Laine minérale de 22 cm et pare-vapeur, finition non comprise." },
    { id: "cou_sark", k: "i_to_2", u: "m²", q: [60, 120], t: "Isoler par sarking",
      d: "Panneaux isolants sur chevrons, au moment de refaire la couverture." },
    { id: "cou_cpt", k: "i_cp_0", u: "m²", q: [60, 120], t: "Traiter une charpente",
      d: "Brossage et traitement insecticide et fongicide par pulvérisation." },
    { id: "cou_cpr", k: "i_cp_1", u: "m²", q: [20, 60], t: "Remplacer une partie de charpente",
      d: "Chevrons et liteaux, surface de toiture concernée." },
    { id: "cou_zi", k: "i_zi", u: "m", q: [10, 30], t: "Poser des gouttières en zinc",
      d: "Demi-rondes, crochets et descentes compris." },
    { id: "cou_no", k: "i_no", u: "m", q: [5, 15], t: "Refaire des noues et abergements",
      d: "En zinc, autour d'une cheminée ou entre deux versants." },
    { id: "cou_vx0", k: "i_vx_0", u: "forfait", q: [1], t: "Remplacer une fenêtre de toit 78×98",
      d: "Raccords d'étanchéité compris." },
    { id: "cou_vx1", k: "i_vx_1", u: "forfait", q: [1], t: "Créer une nouvelle fenêtre de toit 78×98",
      d: "Chevêtre, raccords d'étanchéité et finitions brutes compris." },
  ],
};
/* prix d'un artisan à partir de ses réponses : 2 tailles → fixe + prix par unité ; 1 taille → forfait */
export function prixChantierType(c, v = []) {
  const [a, b] = v.map(x => (x === null || x === "" || x === undefined ? null : +x));
  if (c.q.length === 1) return a > 0 ? { forfait: a } : null;
  if (!(a > 0) || !(b > 0)) return null;
  const [q1, q2] = c.q, unit = (b - a) / (q2 - q1);
  if (!(unit > 0)) return { err: "Le grand chantier doit coûter plus cher que le petit : vérifiez vos deux prix." };
  const fixe = a - q1 * unit;
  const r2 = x => Math.round(x * 100) / 100; // au centime : 12,50 €/m² ne devient pas 13 €
  if (fixe < 0) return { unit: r2(b / q2), fixe: 0, note: "Vos deux prix donnent un fixe négatif : Valou garde le prix par m² du grand chantier." };
  return { unit: r2(unit), fixe: Math.round(fixe) };
}

const qte = (Q, u) => `${nombre(Q)} ${Q > 1 && (u === "pièce" || u === "escalier") ? u + "s" : u}`;
const badge = f => (f ? `<span class="badge b-${f}" title="${esc(FIABILITE[f].d)}">${esc(FIABILITE[f].t)}</span>` : "");
const simule = `<p class="simule">Démonstration : écran simulé à partir des maisons du prototype.</p>`;

/* ---------- Professionnels ---------- */
export function ecranPro(ctx, onglet, metier) {
  const { R, maisons, entete } = ctx;
  /* 4 profils, chacun avec ses propres onglets */
  const PROFILS = [
    { id: "artisan", t: "Je suis artisan", ico: "🔨", d: "Recevoir des projets déjà chiffrés, avec les photos des pièces.", tabs: [["artisan", "Demandes reçues"], ["tarifs", "Mes tarifs"]], demo: "#/demo-artisan",
      av: ["Des projets déjà chiffrés, avec les photos des pièces", "Un client qui connaît son budget : moins de devis refusés", "Vous choisissez : visite, devis ou pas disponible", "Vos tarifs restent confidentiels"] },
    { id: "negociant", t: "Je suis négociant", ico: "🧱", d: "Être vu des particuliers et des artisans de votre zone : vos matériaux, services, coordonnées et horaires.", tabs: [["negociant", "Ma fiche"], ["negprix", "Mes prix"]], demo: "#/demo-negociant",
      av: ["Visible sur les projets des maisons de votre zone", "Vos types de matériaux, services, coordonnées et horaires mis en avant", "Des clients avec un chantier déjà chiffré", "Aucune offre à envoyer : les clients viennent à vous"] },
    { id: "courtier", t: "Je suis courtier ou banque", ico: "🏦", d: "Recevoir des dossiers de crédit complets : achat, notaire et travaux (licence Valou Pro, forfait fixe).", tabs: [["courtier", "Dossiers reçus"]],
      av: ["Un dossier complet : achat, notaire, travaux poste par poste", "Moins de temps à reconstituer le budget du client", "Le PEB et les travaux énergétiques déjà identifiés"] },
    { id: "agence", t: "Je suis une agence", ico: "🏠", d: "Le rapport « vrai coût, travaux compris » à votre logo, pour vos annonces et vos acheteurs.", tabs: [["agence", "Mon annonce"]],
      av: ["Le vrai coût, travaux compris, à votre logo (licence Valou Pro)", "À joindre à vos annonces et à remettre aux acheteurs", "Des acheteurs qui osent visiter les maisons à rénover"] },
  ];
  if (!onglet) {
    return `${entete("pro")}<main><h1>Côté professionnels</h1>${simule}
      <p class="intro">Choisissez votre métier pour voir ce que Valou vous apporte.</p>
      <div class="profils">${PROFILS.map(P => `<a class="carte profil" href="#/pro/${P.tabs[0][0]}"><span class="pf-ico">${P.ico}</span><b>${esc(P.t)}</b><p class="mu">${esc(P.d)}</p><ul class="av-liste">${P.av.map(a => `<li>${esc(a)}</li>`).join("")}</ul><span class="go">Entrer →</span></a>`).join("")}</div>
    </main>`;
  }
  const profil = PROFILS.find(P => P.tabs.some(([id]) => id === onglet)) || PROFILS[0];
  const nav = `<div class="espace-tete"><a href="#/pro" class="retour">← Changer de profil</a>
      <h1><span>${profil.ico}</span> Espace ${esc(profil.t.replace(/^Je suis (une? )?/, ""))}</h1>
      ${profil.demo ? `<a class="btn sec petit-btn" href="${profil.demo}">🎬 Démo guidée</a>` : ""}</div>
    <div class="avantages"><b>Vos avantages</b><ul>${profil.av.map(a => `<li>${esc(a)}</li>`).join("")}</ul></div>
    ${profil.tabs.length > 1 ? `<div class="onglets" role="tablist">${profil.tabs.map(([id, t]) => `<a role="tab" class="onglet ${onglet === id ? "on" : ""}" href="#/pro/${id}" aria-selected="${onglet === id}">${t}</a>`).join("")}</div>` : ""}`;
  const L = maisons.map(m => { const b = calculerBudget(R, m); return { m, b, c: coutTotal(m, b) }; });
  let corps = "";

  if (onglet === "artisan") {
    const M = METIERS.find(x => x.id === metier) || METIERS[0];
    /* si le client n'a envoyé qu'une partie (ex. le séjour mais pas la salle de bain), l'artisan ne reçoit que cette partie */
    const partiesEnvoyees = (x, p) => {
      const E = x.m.envoiMetier && x.m.envoiMetier[M.id];
      if (!E || !E.parts) return p;
      const q = x.b.lignes.filter(l => l.k === p.k && !l.soiMeme && E.parts.includes(cleLigne(l))).reduce((s, l) => s + (Number(String(l.q).replace(",", ".")) || 0), 0);
      const r = p.QL ? q / p.QL : 0;
      return { ...p, QL: q, total: p.total.map(v => v * r) };
    };
    const demandes = L.map(x => ({ ...x, lots: x.b.postes.filter(p => M.f(p.k) && p.QL > 0).map(p => partiesEnvoyees(x, p)).filter(p => p.QL > 0) })).filter(x => x.lots.length)
      .sort((a, b) => (b.m.envoi ? 1 : 0) - (a.m.envoi ? 1 : 0));
    /* photos des pièces concernées par ce métier (toutes si « entreprise générale ») */
    const photosDemande = x => {
      const P = (ctx.photos ? ctx.photos(x.m) : []);
      const pieces = new Set(x.b.lignes.filter(l => l.pieceId && M.f(l.k)).map(l => l.piece.toLowerCase().trim()));
      return M.id === "general" ? P : P.filter(p => pieces.has(String(p.nomPiece).toLowerCase().trim()));
    };
    corps = `<div class="pro-intro"><h2>Des clients qui savent déjà ce que coûtent leurs travaux</h2>
      <p class="mu">L'artisan reçoit des projets déjà chiffrés et décrits poste par poste, avec le budget du client. Moins de visites pour rien, des devis plus rapides.</p></div>
      <label class="metier">Votre métier<select data-metier>${METIERS.map(x => `<option value="${x.id}" ${x.id === M.id ? "selected" : ""}>${esc(x.t)}</option>`).join("")}</select></label>
      ${demandes.length ? demandes.map(x => {
        const t = x.lots.reduce((s, p) => [s[0] + p.total[0], s[1] + p.total[1], s[2] + p.total[2]], [0, 0, 0]);
        const deja = (x.m.reponses || []).find(r => r.metier === M.id);
        const cle = `${x.m.id}:${M.id}`;
        return `<article class="carte demande ${demandesOuvertes.has(cle) ? "ouverte" : ""}" data-maison="${x.m.id}" data-metier="${M.id}">
          <details data-demande="${cle}" ${demandesOuvertes.has(cle) ? "open" : ""}><summary class="d-resume">
            <span class="badge ${deja ? "b-estimation" : "b-reference"}">${deja ? "Répondu" : "Nouvelle demande"}</span>
            <b class="d-adresse">📍 ${esc(x.m.commune || x.m.nom)}</b>
            <span class="d-voir">Voir le détail <span>▾</span></span></summary>
          <div class="d-tete"><div><b>La maison</b>
            <small class="mu">${esc([x.m.annee && `Maison de ${x.m.annee}`, x.m.surface && `${nombre(x.m.surface)} m²`].filter(Boolean).join(" · "))}</small></div>
            <div class="d-budget"><small>Budget estimé du client pour ces travaux</small><b>${euros(t[0], 100)} – ${euros(t[2], 100)}</b><small class="mu">TVA ${x.b.rate} % comprise</small></div></div>
          ${x.m.envoi ? `<p class="envoye">📨 Projet envoyé par le client le ${esc(new Date(x.m.envoi.date).toLocaleDateString("fr-BE"))}</p>` : ""}
          <table class="d-lots">${x.lots.map(p => `<tr><td>${esc(p.n)}</td><td class="r">${esc(qte(p.QL, p.u))}</td><td>${badge(p.fiab)}</td></tr>`).join("")}</table>
          ${((mats, note) => (mats.length || note ? `<div class="d-mats"><b>Souhaits du client</b>${mats.length ? `<ul>${mats.map(([o, v]) => `<li><span class="mu">${esc(o)} :</span> ${esc(v)}</li>`).join("")}</ul>` : ""}${note ? `<p>« ${esc(note)} »</p>` : ""}</div>` : ""))(
            Object.entries(x.m.materiaux || {}).filter(([c, v]) => v && x.lots.some(p => c.startsWith(p.k + "|")) && (!(x.m.envoiMetier && x.m.envoiMetier[M.id] && x.m.envoiMetier[M.id].parts) || x.m.envoiMetier[M.id].parts.includes(c)))
              .map(([c, v]) => { const [k, pid] = c.split("|"), pc = (x.m.pieces || []).find(y => y.id === pid); return [`${pc ? pc.nom : "Toute la maison"} – ${(x.lots.find(p => p.k === k) || {}).n || k}`, v]; }),
            (x.m.notesMetier || {})[M.id])}
          ${(P => (P.length ? `<div class="d-photos"><small class="mu">📷 ${P.length} photo${P.length > 1 ? "s" : ""} de la visite</small><div class="galerie mini">${P.slice(0, 8).map(p => `<figure class="vignette"><a href="${p.url}" target="_blank" rel="noopener"><img src="${p.url}" alt="${esc(p.nomPiece)}"></a><figcaption><small>${esc(p.nomPiece)}</small></figcaption></figure>`).join("")}</div></div>` : `<p class="mu petit-t">Pas encore de photos pour ces pièces.</p>`))(photosDemande(x))}
          <div class="d-pied"><small class="mu">${x.m.fin && x.m.fin.apport ? "✓ Dossier de financement préparé" : "Financement en préparation"} · Coordonnées du client transmises quand vous acceptez</small>
            ${deja ? `<span class="d-act ok">✓ Vous avez répondu : ${deja.type === "visite" ? "visite proposée" : deja.type === "devis" ? `devis de ${euros(deja.montant || 0)} envoyé` : "pas disponible"}.</span>`
              : `<span class="d-act"><button class="btn sec" data-action="pro-visite">Proposer une visite</button><button class="btn" data-action="pro-ok">Envoyer un devis</button><button class="btn lien" data-action="pro-non">Pas disponible</button></span>`}</div>
          </details>
        </article>`;
      }).join("") : `<div class="carte vide"><p>Aucune demande pour ce métier dans les maisons du prototype.</p></div>`}`;
  }

  if (onglet === "tarifs") {
    const M = METIERS.find(x => x.id === metier) || METIERS[0];
    const T = ctx.tarifs || { p: {} };
    const postes = R.liste.filter(p => p.mo && M.f(p.k));
    corps = `<div class="pro-intro"><h2>Vos tarifs restent les vôtres</h2>
      <p class="mu">Chaque artisan encode ses prix habituels. Valou s'en sert uniquement pour calculer le prix moyen autour de chaque chantier.</p></div>
      <div class="confidentiel carte">
        <b>🔒 Confidentialité de vos tarifs</b>
        <ul>
          <li>Vos prix ne sont <b>jamais montrés</b>, ni aux clients, ni aux autres artisans.</li>
          <li>Ils servent uniquement à calculer une moyenne, et <b>jamais avec moins de ${MIN_ARTISANS} artisans</b> : impossible de retrouver votre prix.</li>
          <li>Les moyennes sont montrées aux particuliers, <b>pas aux artisans</b>, pour respecter les règles de la concurrence.</li>
          <li>Vous pouvez modifier ou retirer vos tarifs à tout moment. Pensez à les mettre à jour tous les 6 mois : au-delà d'un an, ils ne sont plus comptés.</li>
        </ul>
      </div>
      <label class="metier">Votre métier<select data-metier>${METIERS.filter(x => x.id !== "general").map(x => `<option value="${x.id}" ${x.id === M.id ? "selected" : ""}>${esc(x.t)}</option>`).join("")}</select></label>
      ${(() => { const CT = CHANTIERS_TYPES[M.id]; if (!CT) return ""; const mode = (T.mode || {})[M.id] || "types";
        return `<div class="ct-choix"><span class="lbl">Comment donnez-vous vos prix ?</span><div class="seg">
          <button type="button" data-action="tarif-mode" data-mode="types" data-m="${M.id}" class="${mode === "types" ? "on" : ""}">Au forfait : je chiffre des chantiers types</button>
          <button type="button" data-action="tarif-mode" data-mode="m2" data-m="${M.id}" class="${mode === "m2" ? "on" : ""}">Au m² ou à la pièce</button></div></div>
        ${mode === "types" ? `<section class="carte chantiers-types"><h2>Vos prix sur des chantiers types</h2>
          ${blocConsignes()}
          <p class="mu">Les mêmes chantiers pour tous les artisans de votre métier : chiffrez-les comme pour un client, au forfait, hors TVA. Valou en déduit votre prix ; pour un même travail en deux tailles, il calcule votre fixe (déplacement, installation) et votre prix au m², au mètre ou à la pièce. Laissez vide ce que vous ne faites pas.</p>
          ${CT.map(c => { const v = (T.ct || {})[c.id] || [], r = prixChantierType(c, v);
            return `<article class="ct-carte"><h3>${esc(c.t)}</h3><p class="mu petit-t">${esc(c.d)}</p>
              <div class="ct-q">${c.q.map((q, i) => `<label>${c.u === "forfait" ? "Votre forfait" : qte(q, c.u)}<span class="saisie"><input type="number" min="0" step="any" inputmode="decimal" data-ct="${c.id}" data-ct-i="${i}" value="${esc(v[i] ?? "")}" aria-label="Votre prix pour ${esc(c.t)}${c.u === "forfait" ? "" : `, ${q} ${c.u}`}"><i>€ HTVA</i></span></label>`).join("")}</div>
              ${!r ? `<p class="mu petit-t">${c.q.length > 1 ? "Remplissez les deux tailles pour obtenir votre prix." : ""}</p>` : r.err ? `<p class="alerte-mini">⚠️ ${esc(r.err)}</p>` : `<p class="ct-res">${r.forfait != null ? `Votre forfait : <b>${euros(r.forfait)}</b>` : `Votre prix : <b>${Number.isInteger(r.unit) ? euros(r.unit) : euros2(r.unit)} / ${esc(c.u)}</b> + <b>${euros(r.fixe)}</b> de mise en route par chantier`}</p>${r.note ? `<p class="mu petit-t">${esc(r.note)}</p>` : ""}`}
              <label class="cb petit-t"><input type="checkbox" data-ct-non="${c.id}" ${((T.ctNon || {})[c.id]) ? "checked" : ""}> Je ne fais pas ce type de travail</label>
            </article>`; }).join("")}
          <label class="cb"><input type="checkbox" data-tarif-ok ${T.ok ? "checked" : ""}> J'accepte que mes tarifs servent uniquement au calcul de prix moyens anonymes, selon les règles ci-dessus.</label>
          ${T.ok && CT.some(c => { const r = prixChantierType(c, (T.ct || {})[c.id]); return r && !r.err; }) ? `<p class="d-act ok">✓ Tarifs enregistrés. Ils sont repris dans la simulation de « Notre moteur ».</p>` : `<p class="mu">Démonstration : vos tarifs restent sur cet appareil.</p>`}
        </section>` : ""}`; })()}
      ${CHANTIERS_TYPES[M.id] && ((T.mode || {})[M.id] || "types") === "types" ? "" : `<section class="carte"><table class="d-lots tarifs">
        <thead><tr><th>Poste</th><th>Votre prix (HTVA)</th></tr></thead>
        <tbody>${postes.map(p => {
          const u = unitePoste(p.u, p.k);
          return `<tr><td>${esc(p.n)}</td><td><span class="saisie"><input type="number" min="0" step="any" inputmode="decimal" data-tarif="${p.k}" value="${esc(T.p[p.k] ?? "")}" aria-label="Votre prix pour ${esc(p.n)}"><i>€/${esc(u === "pièce" ? "pièce" : u)}</i></span></td></tr>`;
        }).join("")}</tbody></table>
        <label class="cb"><input type="checkbox" data-tarif-ok ${T.ok ? "checked" : ""}> J'accepte que mes tarifs servent uniquement au calcul de prix moyens anonymes, selon les règles ci-dessus.</label>
        ${T.ok && Object.values(T.p).some(v => v > 0) ? `<p class="d-act ok">✓ Tarifs enregistrés. Ils sont repris dans la simulation de « Notre moteur ».</p>` : `<p class="mu">Démonstration : vos tarifs restent sur cet appareil.</p>`}
      </section>`}`;
  }

  if (onglet === "negociant") {
    const F = ctx.negFiche || {}, H = F.horaires || {};
    const champ = (k, t, ph = "", type = "text") => `<label>${t}<input type="${type}" data-negfiche="${k}" value="${esc(F[k] ?? "")}" placeholder="${esc(ph)}"></label>`;
    corps = `<div class="pro-intro"><h2>Soyez vu des particuliers et des artisans de votre zone</h2>
      <p class="mu">Votre fiche apparaît sur les projets des maisons proches de votre négoce : les matériaux que vous vendez, vos services, vos coordonnées et vos horaires. Les clients viennent chez vous ou vous appellent.</p></div>
      <div class="deux">
        <section class="carte"><h2>Ma fiche</h2><div class="champs">
          ${champ("nom", "Nom du négoce", "ex. Matériaux Dupont")}
          ${champ("adresse", "Adresse", "rue, numéro, code postal, commune")}
          ${champ("tel", "Téléphone", "", "tel")}
          ${champ("email", "E-mail", "", "email")}
          ${champ("site", "Site internet", "")}
          <fieldset class="large rayons-neg"><legend>Types de matériaux vendus <b class="oblig">obligatoire</b></legend>
            <p class="mu petit-t">Cochez tout ce que vous vendez : les particuliers et les artisans voient tout de suite si vous avez ce qu'il faut pour leurs travaux.</p>
            <div class="rayons-grille">${RAYONS_NEG.map(([id, ico, nom]) => `<label class="cb"><input type="checkbox" data-negrayon="${id}" ${(F.rayons || []).includes(id) ? "checked" : ""}> ${ico} ${esc(nom)}</label>`).join("")}</div>
            ${(F.rayons || []).length ? "" : `<p class="alerte-mini">⚠️ Cochez au moins un type de matériaux : sans cela, votre fiche n'apparaît pas sur les projets.</p>`}
          </fieldset>
          <label class="large">Services (un par ligne)<textarea data-negfiche="services" rows="5" placeholder="Livraison sur chantier&#10;Location de matériel&#10;Découpe sur mesure">${esc(F.services || "")}</textarea></label>
        </div>
        <h3>Horaires d'ouverture</h3>
        <div class="horaires">${JOURS.map(([k, j]) => `<label>${j}<input data-neghor="${k}" value="${esc(H[k] ?? "")}" placeholder="ex. 7h30–17h ou fermé"></label>`).join("")}</div>
        </section>
        <section><h2 class="petit-titre">Ce que voient les particuliers et les artisans</h2>${ficheNegociant(F)}</section>
      </div>
      <p class="mu petit-t">Les négociants n'envoient pas d'offres : les clients choisissent eux-mêmes de vous contacter.</p>`;
  }

  if (onglet === "negprix") {
    const PX = ctx.prixNeg || {};
    const arts = Object.values(R.art);
    corps = `<div class="pro-intro"><h2>Vos prix, dans les budgets des chantiers</h2>
      <p class="mu">Le négociant encode ses prix hors TVA. Valou les utilise pour les travaux faits par un artisan, dans les budgets des chantiers de sa zone.</p></div>
      <p class="simule">Démonstration : vos prix restent sur cet appareil et s'appliquent tout de suite aux maisons du prototype. Dans la vraie appli, ils passent par le tableau de bord des calculs.</p>
      <section class="carte"><table class="d-lots tarifs neg"><thead><tr><th>Article</th><th>Conditionnement</th><th class="r">Prix magasin HTVA</th><th>Votre prix HTVA</th></tr></thead><tbody>
      ${arts.map(a => { const m = a.prix != null ? Math.round(a.prix / 1.21 * 100) / 100 : null; return `<tr><td>${esc(a.id)} ${esc(a.nom)}</td><td><small>${esc(a.cond)}</small></td><td class="r">${m != null ? euros2(m) : `<span class="manque">à compléter</span>`}</td>
        <td><span class="saisie"><input type="number" min="0" step="0.01" inputmode="decimal" data-negprix="${esc(a.id)}" value="${esc(PX[a.id] ?? "")}" aria-label="Votre prix : ${esc(a.nom)}"><i>€</i></span></td></tr>`; }).join("")}
      </tbody></table>
      ${Object.keys(PX).length ? `<p class="d-act ok">✓ ${Object.keys(PX).length} prix encodé${Object.keys(PX).length > 1 ? "s" : ""} : ils sont utilisés dans les budgets (onglet « Négociant : commandes »).</p>` : ""}</section>`;
  }

  if (onglet === "courtier") {
    corps = `<div class="pro-intro"><h2>Des dossiers de crédit complets, travaux chiffrés compris</h2>
      <p class="mu">Le courtier reçoit le coût total du projet, achat et rénovation, avec le budget des travaux poste par poste et son niveau de fiabilité.</p></div>
      <div class="grille">${L.map(x => {
        const f = x.m.fin || {}, emprunt = Math.max(0, x.c.total[1] - (+f.apport || 0)), mens = mensualite(emprunt, f.taux, f.duree);
        const tot = x.b.postes.reduce((s, p) => s + p.total[1], 0) || 1;
        const det = Math.round((x.b.postes.filter(p => p.fiab === "reference" || p.fiab === "estimation").reduce((s, p) => s + p.total[1], 0) / tot) * 100);
        return `<article class="carte dossier-c"><span class="badge b-reference">Dossier prêt</span><h3>${esc(x.m.nom)}</h3><small class="mu">${esc(x.m.commune || "")}</small>
          <div class="recap">
            <div><span>Coût total du projet</span><b>${euros(x.c.total[1], 100)}</b></div>
            <div><span>dont travaux</span><b>${euros(x.c.travaux[1], 100)}</b></div>
            <div><span>Apport</span><b>${f.apport ? euros(+f.apport) : `<span class="manque">à compléter</span>`}</b></div>
            <div><span>Montant à emprunter</span><b>${euros(emprunt, 100)}</b></div>
            <div><span>Mensualité estimée</span><b>${mens ? euros(mens) + " / mois" : `<span class="manque">taux à proposer</span>`}</b></div>
            <div><span>Budget travaux calculé en détail</span><b>${det} %</b></div>
          </div>
          <a class="btn sec" href="#/dossier/${x.m.id}">Ouvrir le dossier</a></article>`;
      }).join("")}</div>`;
  }

  if (onglet === "agence") {
    const A = ctx.annonce || {}, x = L[0];
    corps = `<div class="pro-intro"><h2>Le vrai coût, à votre logo</h2>
      <p class="mu">L'agence garde son annonce telle qu'elle l'écrit. Avec la licence Valou Pro, elle y joint le rapport « vrai coût, travaux compris » à son logo, et le remet aux acheteurs qui visitent.</p></div>
      <div class="deux">
        <section class="carte"><h2>Mon annonce</h2><div class="champs">
          <label>Titre<input data-annonce="titre" value="${esc(A.titre ?? "")}" placeholder="ex. Maison 3 façades avec jardin"></label>
          <label>Prix demandé (€)<input type="number" min="0" data-annonce="prix" value="${esc(A.prix ?? "")}" placeholder="ex. 245000"></label>
          <label class="large">Texte de l'annonce<textarea data-annonce="texte" rows="6" placeholder="Décrivez le bien comme vous le souhaitez.">${esc(A.texte || "")}</textarea></label>
          <label class="cb large"><input type="checkbox" data-annonce="valou" ${A.valou ? "checked" : ""}> Joindre le rapport « vrai coût, travaux compris » (Valou Pro)</label>
        </div></section>
        <section><h2 class="petit-titre">Aperçu de l'annonce</h2>
          <article class="carte annonce seule">
            <div class="a-photo"><img src="${RACINE}photo-par-defaut.jpg" alt=""><span class="badge b-exemple">Exemple</span></div>
            <div class="a-corps"><h3>${esc(A.titre || "Titre de l'annonce")}</h3>
              ${A.prix ? `<div class="a-prix">${euros(+A.prix)}</div>` : ""}
              ${A.texte ? `<p class="a-texte">${esc(A.texte)}</p>` : `<p class="mu">Votre texte apparaîtra ici.</p>`}
              ${A.valou && x ? `<div class="a-valou"><img src="${img("favicon-valou-48.png")}" alt=""><div><small>Vrai coût, travaux compris · rapport Valou au logo de l'agence (${esc(x.m.nom)})</small><b>${x.c ? euros(x.c.total[1], 100) : ""}</b><small>dont travaux ${euros(x.b.T[0], 1000)} – ${euros(x.b.T[2], 1000)}</small></div></div>` : ""}
            </div>
          </article></section>
      </div>`;
  }

  return `${entete("pro")}<main>${nav}${simule}${corps}</main>`;
}

/* ---------- artisans de démonstration (fictifs) : 3 profils par métier ----------
   Noms, coordonnées et textes inventés pour la démonstration (aucun artisan réel). Le premier de chaque métier est celui qui répond dans la démo. */
const AR = (nom, lieu, km, desc, spe, tel, extra = {}) => ({ nom, lieu, km, desc, spe, tel, email: nom.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "").slice(0, 14) + "@exemple.be", horaires: "Lun–ven 7h30–17h", tarifs: true, ...extra });
export const ARTISANS = {
  general: [
    AR("Rénov' Complète", "Seraing", 3, "Entreprise générale : nous coordonnons tous les corps de métier, du gros œuvre aux finitions.", ["Rénovation complète", "Coordination de chantier", "Gros œuvre", "Finitions"], "04 000 01 01"),
    AR("Bâtir Ensemble", "Liège", 7, "Rénovations lourdes de maisons anciennes, avec un seul interlocuteur du début à la fin.", ["Maisons anciennes", "Extensions", "Démolition", "Planning de chantier"], "04 000 01 02"),
    AR("Maison Neuve Rénovation", "Ans", 14, "Petite équipe polyvalente pour rafraîchir une maison avant d'emménager.", ["Rafraîchissement", "Petits travaux", "Cuisine et salle de bain"], "04 000 01 03", { tarifs: false }),
  ],
  macon: [
    AR("Maçonnerie Mosane", "Seraing", 4, "Gros œuvre et transformations : murs porteurs, ouvertures, dalles et démolition.", ["Ouvertures de murs porteurs", "Murs en blocs", "Dalles et chapes", "Démolition"], "04 000 08 01"),
    AR("Les Bâtisseurs d'Ans", "Ans", 12, "Petite équipe de maçons pour les rénovations de maisons anciennes.", ["Maisons anciennes", "Briques et blocs", "Linteaux", "Drainage"], "04 000 08 02"),
    AR("Solide & Fils", "Liège", 7, "Maçonnerie traditionnelle depuis trois générations, devis au forfait.", ["Maçonnerie traditionnelle", "Rejointoyage", "Murs de jardin", "Fondations"], "04 000 08 03", { tarifs: false }),
  ],
  carreleur: [
    AR("Atelier du Carreau", "Seraing", 3, "Carrelage de sols et de murs, grands formats et salles de bain.", ["Grand format 120×60", "Salles de bain", "Douches à l'italienne", "Faïence murale"], "04 000 02 01"),
    AR("Pose Nette", "Grâce-Hollogne", 9, "Pose soignée, joints réguliers, chantier propre et rangé chaque soir.", ["Carrelage de sol", "Plinthes", "Terrasses", "Ragréage"], "04 000 02 02"),
    AR("Mosaïque Liégeoise", "Liège", 7, "Carreaux de ciment, mosaïques et pierre naturelle pour les maisons de caractère.", ["Carreaux de ciment", "Mosaïque", "Pierre naturelle", "Restauration"], "04 000 02 03", { tarifs: false }),
  ],
  peintre: [
    AR("Pinceau Clair", "Liège", 7, "Peinture intérieure, finitions lisses et teintes sur mesure.", ["Peinture intérieure", "Enduits lissés", "Escaliers", "Conseil couleurs"], "04 000 03 01"),
    AR("Teinte Juste", "Flémalle", 11, "Peinture et papier peint, protection complète des sols et des meubles.", ["Peinture", "Papier peint", "Boiseries", "Plafonds"], "04 000 03 02"),
    AR("Couleur Meuse", "Seraing", 3, "Rafraîchissement de maisons avant emménagement : murs, plafonds, portes.", ["Murs et plafonds", "Portes", "Décapage", "Peinture"], "04 000 03 03", { tarifs: false }),
  ],
  plafonneur: [
    AR("Atelier Blanc Mat", "Seraing", 3, "Plaques de plâtre, cloisons et faux plafonds pour les rénovations rapides.", ["Plaques de plâtre", "Cloisons", "Faux plafonds"], "04 000 09 01"),
    AR("Plâtre & Lisse", "Liège", 7, "Plafonnage traditionnel des murs et plafonds, finition prête à peindre.", ["Plafonnage", "Cornières", "Plafonds", "Enduits"], "04 000 09 02"),
    AR("Gyps'Ans", "Ans", 14, "Petite équipe de plafonneurs pour maisons anciennes.", ["Maisons anciennes", "Plafonnage", "Cloisons"], "04 000 09 03", { tarifs: false }),
  ],
  electricien: [
    AR("Fil Rouge Électricité", "Grâce-Hollogne", 9, "Électricité complète, mise en conformité et contrôle par un organisme agréé.", ["Installation complète", "Mise en conformité", "Tableau électrique", "Domotique"], "04 000 04 01"),
    AR("Lumen Installations", "Liège", 7, "Éclairage, prises et rénovation électrique pièce par pièce.", ["Éclairage LED", "Prises et interrupteurs", "Rénovation partielle"], "04 000 04 02"),
    AR("Circuit Net", "Ans", 14, "Dépannage et petites installations, intervention rapide.", ["Dépannage", "Bornes de recharge", "Petites installations"], "04 000 04 03", { tarifs: false }),
  ],
  chauffagiste: [
    AR("Chaleur Douce", "Seraing", 3, "Pompes à chaleur, chaudières à condensation et radiateurs, avec entretien.", ["Pompe à chaleur", "Chaudière gaz", "Radiateurs", "Entretien"], "04 000 05 01"),
    AR("Flamme Bleue Chauffage", "Liège", 7, "Remplacement de chaudières au mazout et démontage des cuves.", ["Remplacement de chaudière", "Démontage de cuve à mazout", "Chauffage au sol"], "04 000 05 02"),
    AR("Robinet Malin", "Flémalle", 11, "Sanitaire : salles de bain complètes, WC suspendus et plomberie.", ["Salles de bain", "WC suspendus", "Plomberie", "Chauffe-eau"], "04 000 05 03", { tarifs: false }),
  ],
  menuisier: [
    AR("Copeau d'Or", "Liège", 7, "Menuiserie intérieure et extérieure : châssis, portes et cuisines.", ["Châssis PVC et alu", "Portes intérieures", "Cuisines sur mesure", "Parquet"], "04 000 06 01"),
    AR("L'Établi", "Ans", 14, "Parquets, escaliers et placards sur mesure, en bois massif.", ["Parquet massif", "Escaliers", "Placards", "Rénovation de boiseries"], "04 000 06 02"),
    AR("Huisserie Nette", "Seraing", 3, "Remplacement de châssis et de portes d'entrée, pose en rénovation.", ["Châssis", "Portes d'entrée", "Volets", "Isolation des menuiseries"], "04 000 06 03", { tarifs: false }),
  ],
  couvreur: [
    AR("Tuile & Zinc", "Grâce-Hollogne", 9, "Toitures en tuiles et ardoises, zinguerie et isolation sous toiture.", ["Couverture", "Zinguerie", "Isolation de toiture", "Fenêtres de toit"], "04 000 07 01"),
    AR("Toit Sûr", "Liège", 7, "Rénovation complète de toitures et réparations après tempête.", ["Rénovation de toiture", "Réparations", "Gouttières", "Démoussage"], "04 000 07 02"),
    AR("Ardoise Bleue", "Flémalle", 11, "Ardoises naturelles, toitures plates EPDM et charpentes.", ["Ardoises naturelles", "Toiture plate EPDM", "Charpente"], "04 000 07 03", { tarifs: false }),
  ],
};
/* coordonnées montrées au client quand l'artisan répond (le premier profil de chaque métier) */
export const ARTISANS_EXEMPLE = Object.fromEntries(Object.entries(ARTISANS).map(([k, L]) => [k, { nom: L[0].nom, tel: L[0].tel }]));

/* demandes reçues par l'artisan : fermées par défaut (on ne voit que l'adresse), ouvertes d'un clic */
const demandesOuvertes = new Set();
document.addEventListener("toggle", e => {
  const d = e.target;
  if (!d.dataset || !d.dataset.demande) return;
  d.open ? demandesOuvertes.add(d.dataset.demande) : demandesOuvertes.delete(d.dataset.demande);
  d.closest(".demande")?.classList.toggle("ouverte", d.open);
}, true);

/* ---------- types de matériaux vendus par un négociant (à cocher, obligatoire) ---------- */
export const RAYONS_NEG = [
  ["gros", "🧱", "Gros œuvre (blocs, briques, ciment, béton)", ["general", "macon"]],
  ["toiture", "🏠", "Toiture et zinguerie", ["couvreur"]],
  ["isolation", "🧤", "Isolation", ["couvreur", "general"]],
  ["bois", "🪵", "Bois et panneaux", ["menuisier"]],
  ["menuiseries", "🚪", "Portes et châssis", ["menuisier"]],
  ["carrelage", "◼️", "Carrelage et revêtements de sol", ["carreleur"]],
  ["sanitaire", "🚿", "Sanitaire et plomberie", ["chauffagiste"]],
  ["chauffage", "🔥", "Chauffage", ["chauffagiste"]],
  ["electricite", "💡", "Électricité et éclairage", ["electricien"]],
  ["peinture", "🎨", "Peinture et plâtre", ["peintre", "plafonneur"]],
  ["cuisine", "🍳", "Cuisines", ["menuisier"]],
  ["exterieur", "🌳", "Extérieurs et aménagements", ["general"]],
  ["outillage", "🔧", "Outillage et petit matériel", []],
  ["engins", "🚜", "Location d'engins (mini-pelle, chargeuse…)", ["general", "macon"]],
  ["echafaudage", "🏗️", "Location d'échafaudages", ["couvreur", "general"]],
  ["conteneur", "🗑️", "Conteneurs à déchets", ["general", "macon"]],
];

/* ---------- fiche publique d'un négociant ---------- */
export const JOURS = [["lun", "Lundi"], ["mar", "Mardi"], ["mer", "Mercredi"], ["jeu", "Jeudi"], ["ven", "Vendredi"], ["sam", "Samedi"], ["dim", "Dimanche"]];
export function ficheNegociant(F, metiersMaison, compact) {
  if (!F || !F.nom) return `<div class="carte vide"><p class="mu">Aucun négociant inscrit pour l'instant.</p></div>`;
  const rayons = RAYONS_NEG.filter(r => (F.rayons || []).includes(r[0]));
  const utile = r => metiersMaison && r[3].some(id => metiersMaison.includes(id));
  const services = String(F.services || "").split("\n").map(x => x.trim()).filter(Boolean);
  const H = F.horaires || {};
  return `<article class="carte fiche-neg">
    <div class="fn-tete"><span class="pf-ico">🧱</span><div><b>${esc(F.nom)}</b>${F.fictif ? ` <span class="badge b-exemple">Exemple fictif</span>` : ""}${F.adresse ? `<small class="mu">${esc(F.adresse)}${F.km ? ` · à ${F.km} km` : ""}</small>` : ""}</div></div>
    ${rayons.length ? `<div class="fn-rayons"><small class="mu">Matériaux vendus${metiersMaison && rayons.some(utile) ? " · ✓ = utile pour vos travaux" : ""}</small><div>${rayons.map(r => `<span class="fn-rayon ${utile(r) ? "utile" : ""}">${utile(r) ? "✓ " : ""}${r[1]} ${esc(r[2])}</span>`).join("")}</div></div>` : ""}
    ${services.length ? `<ul class="fn-services">${services.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    <div class="fn-contact">${F.tel ? `<span>📞 ${esc(F.tel)}</span>` : ""}${F.email ? `<span>✉️ ${esc(F.email)}</span>` : ""}${F.site ? `<span>🌐 ${esc(F.site)}</span>` : ""}</div>
    ${JOURS.some(([k]) => H[k]) ? (t => (compact ? `<details class="fn-h"><summary>🕘 Horaires d'ouverture</summary>${t}</details>` : t))(`<table class="fn-horaires">${JOURS.map(([k, j]) => `<tr><td>${j}</td><td>${esc(H[k] || "—")}</td></tr>`).join("")}</table>`) : ""}
  </article>`;
}

/* ---------- Notre moteur ---------- */
/* tarifs d'artisans SIMULÉS : tirés au hasard dans la fourchette de référence du poste (jamais utilisés pour le budget) */
function hasard(graine) {
  let a = graine >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function artisansSimules(R, k, n) {
  const p = R.postes[k], id = Array.isArray(p.mo) ? p.mo[0] : p.mo, m = R.mos[id];
  const rnd = hasard([...k].reduce((s, c) => s * 31 + c.charCodeAt(0), 7));
  return Array.from({ length: n }, () => {
    const d = 25 * Math.sqrt(rnd()), a = rnd() * Math.PI * 2;
    return { d, a, p: Math.round((m.b + (m.h - m.b) * rnd()) * 2) / 2 };
  });
}

function simulation(R, sim, tarifs) {
  const postes = R.liste.filter(p => p.mo);
  const k = postes.some(p => p.k === sim.k) ? sim.k : postes[0].k, p = R.postes[k];
  const id = Array.isArray(p.mo) ? p.mo[0] : p.mo, ref = R.mos[id], u = unitePoste(p.u, k);
  const pts = artisansSimules(R, k, sim.n);
  const mien = tarifs && tarifs.ok && +tarifs.p[k] > 0 ? { d: 6, a: 2.2, p: +tarifs.p[k], vous: true } : null;
  if (mien) pts.push(mien);
  const res = prixLocaux(pts);
  const ech = 150 / 22, C = 170;
  const pt = x => [C + Math.cos(x.a) * x.d * ech, C + Math.sin(x.a) * x.d * ech];
  const carte = `<svg viewBox="0 0 340 340" class="carte-km" role="img" aria-label="Artisans autour du chantier, rayons de 5 à 20 km">
    ${[...RAYONS].reverse().map(r => `<circle cx="${C}" cy="${C}" r="${r * ech}" class="rayon ${res && r === res.rayon ? "on" : ""}"/><text x="${C + r * ech * 0.707 + 3}" y="${C - r * ech * 0.707 - 3}" class="km">${r} km</text>`).join("")}
    ${pts.map(x => { const [X, Y] = pt(x); const dedans = res && x.d <= res.rayon; return x.vous ? `<circle cx="${X}" cy="${Y}" r="7" class="pt vous"/>` : `<circle cx="${X}" cy="${Y}" r="5" class="pt ${dedans ? "on" : ""}"/>`; }).join("")}
    <g class="chantier"><circle cx="${C}" cy="${C}" r="9"/><text x="${C}" y="${C + 4}" text-anchor="middle">⌂</text></g>
  </svg>`;
  const eur = v => euros(v) + " /" + (u === "pièce" ? "pièce" : u);
  const ligne = (t, x) => `<div class="trois">${["Bas", "Moyen", "Haut"].map((l, i) => `<div class="${i === 1 ? "moy" : ""}"><small>${l}</small><b>${eur(x[i])}</b></div>`).join("")}</div><p class="mu petit-t">${t}</p>`;
  return `<section class="carte" id="prix-locaux"><h2>Demain : les prix des artisans autour du chantier</h2>
    <p class="simule">Simulation : artisans et tarifs fictifs, tirés dans la fourchette de référence. Le budget des maisons n'est pas modifié.</p>
    <p class="mu">Les artisans encodent leurs tarifs, gardés confidentiels. Pour chaque chantier, Valou prend le plus petit rayon (5, 10, 15 puis 20 km) qui compte au moins ${MIN_ARTISANS} artisans, écarte les prix anormaux et calcule bas / moyen / haut. Sinon, il garde la grille de référence.</p>
    <div class="sim-ctl">
      <label>Poste<select data-sim-k>${postes.map(x => `<option value="${x.k}" ${x.k === k ? "selected" : ""}>${esc(x.n)}</option>`).join("")}</select></label>
      <div><span class="lbl">Artisans inscrits dans la région</span><div class="seg">${[0, 3, 6, 12, 25, 40].map(n => `<button type="button" data-action="sim" data-sim-n="${n}" class="${n === sim.n ? "on" : ""}">${n}</button>`).join("")}</div></div>
    </div>
    <div class="sim">
      ${carte}
      <div class="sim-res">
        ${res
          ? `<span class="badge b-reference">Prix locaux</span><h3>${res.n} artisans dans un rayon de ${res.rayon} km</h3>${res.ecartes ? `<p class="mu petit-t">${res.ecartes} prix anormal écarté.</p>` : ""}${ligne("Bas = 1er quartile, moyen = médiane, haut = 3e quartile des prix déclarés.", [res.b, res.m, res.h])}`
          : `<span class="badge b-fourchette">Grille de référence</span><h3>Pas encore assez d'artisans</h3><p class="mu petit-t">Moins de ${MIN_ARTISANS} artisans dans un rayon de 20 km : aucune moyenne n'est calculée, pour protéger leurs tarifs.</p>`}
        <div class="ref-l"><small class="mu">Grille de référence (${esc(id)})</small>${ligne(`${esc(ref.n)}${ref.e ? " · tarif encore estimé" : ""}`, [ref.b, ref.m, ref.h])}</div>
        <ul class="legende-carte"><li><i class="pt on"></i>Artisan compté</li><li><i class="pt"></i>Artisan hors rayon</li>${mien ? `<li><i class="pt vous"></i>Vous (tarif encodé dans « Mes tarifs »)</li>` : ""}</ul>
      </div>
    </div>
  </section>`;
}

export function ecranMoteur(ctx) {
  const { R, entete } = ctx;
  const nb = { reference: 0, estimation: 0, fourchette: 0, incomplet: 0 };
  R.liste.forEach(p => { const b = calculerBudget(R, { annee: 1965, travaux: [{ k: p.k, q: 1 }] }, 2026); nb[b.postes[0].fiab]++; });
  const art = Object.values(R.art), artPrix = art.filter(a => a.prix != null).length;
  const mo = Object.values(R.mos), moE = mo.filter(m => m.e > 0).length;
  const d = s => (s ? new Date(s).toLocaleDateString("fr-BE") : "");
  const etapes = [
    ["Quantités", "Pièce par pièce : m² de sol et de murs, nombre de châssis, de radiateurs…"],
    ["Matériaux", "Consommation par m² + chutes, arrondie au conditionnement réel (boîte, sac, rouleau), × prix hors TVA."],
    ["Main-d'œuvre", "Tarif de référence bas / moyen / haut pour chaque poste. Rien si le client le fait lui-même."],
    ["TVA", "6 % pour un logement de plus de 10 ans, sinon 21 %. 21 % sur le matériel acheté soi-même."],
    ["Annexes et imprévus", "Container si démolition ; imprévus 10 %, ou 15 % pour une maison ancienne."],
    ["Coût total", "Prix d'achat + droits d'enregistrement + notaire + travaux : le vrai coût."],
  ];
  const tot = R.liste.length;
  const seg = k => `<span class="b-${k}" style="width:${(nb[k] / tot) * 100}%"></span>`;
  return `${entete("moteur")}<main>
    <h1>Notre moteur</h1>
    <p class="mu intro">Chaque chiffre affiché par Valou vient d'un calcul détaillé et traçable, pas d'une moyenne au m².</p>
    <div class="stats">
      <div class="carte stat"><b>${tot}</b><span>postes de travaux</span></div>
      <div class="carte stat"><b>${mo.length}</b><span>tarifs de main-d'œuvre</span><small class="mu">${mo.length - moE} de référence, ${moE} encore estimés</small></div>
      <div class="carte stat"><b>${art.length}</b><span>articles de matériaux</span><small class="mu">${artPrix} avec un prix relevé en magasin</small></div>
      <div class="carte stat"><b>3</b><span>niveaux par poste</span><small class="mu">bas, moyen, haut</small></div>
    </div>
    <section class="carte"><h2>Comment un budget est calculé</h2>
      <ol class="etapes">${etapes.map(([t, x], i) => `<li><span class="num">${i + 1}</span><div><b>${t}</b><p class="mu">${x}</p></div></li>`).join("")}</ol>
    </section>
    <div class="deux">
      <section class="carte"><h2>Fiabilité de la grille aujourd'hui</h2>
        <div class="barre fiab">${["reference", "estimation", "fourchette", "incomplet"].map(seg).join("")}</div>
        <ul class="f-liste nb">${["reference", "estimation", "fourchette", "incomplet"].filter(k => nb[k]).map(k => `<li>${badge(k)} <b>${nb[k]}</b> poste${nb[k] > 1 ? "s" : ""} : ${esc(FIABILITE[k].d)}</li>`).join("")}</ul>
        <p class="mu">Chaque devis réel d'artisan et chaque prix de négociant ajouté fait passer des postes vers « Référence détaillée ».</p>
      </section>
      <section class="carte"><h2>D'où viennent les prix</h2>
        <ul class="f-liste">
          <li><b>Main-d'œuvre</b> : ${esc(R.sources.mo || "")}${R.sources.moDate ? `, au ${d(R.sources.moDate)}` : ""}.</li>
          <li><b>Matériaux</b> : ${esc(R.sources.hubo || "")}${R.sources.huboDate ? `, au ${d(R.sources.huboDate)}` : ""}. Prix ramenés hors TVA.</li>
          <li><b>Tableau de bord des calculs</b> : les prix retenus avec les artisans participants sont publiés pour tous les utilisateurs, immédiatement${R.sources.pub ? ` (dernière publication : ${d(R.sources.pub)})` : ""}.</li>
          <li><b>Aucun prix inventé</b> : un prix absent est marqué « à compléter ».</li>
        </ul>
      </section>
    </div>
    ${simulation(R, ctx.sim, ctx.tarifs)}
  </main>`;
}

/* ---------- Feuille de route ---------- */
export function ecranFeuille(ctx) {
  const { entete } = ctx;
  const phases = [
    { t: "Aujourd'hui", s: "Démo fonctionnelle", on: true, l: ["Le vrai coût d'une maison : prix, droits, notaire et travaux", "Visite : photos par pièce, questionnaire papier lu automatiquement", "Pièces avec postes imposés, budget bas / moyen / haut et fiabilité", "Offre, financement et dossier pour la banque", "Comparaison de plusieurs maisons, PEB et aides", "Démos artisan, négociant, courtier et agence"] },
    { t: "2027", s: "Liège d'abord", l: ["Vendre avant de construire : 10 agences et courtiers signés", "Pilote à Liège et 20 km autour", "Envoi réel aux artisans, paiement en ligne", "Rapport « vrai coût » au logo de l'agence", "50 vrais devis pour recaler les prix", "Seuil A : 20 agences et courtiers, 60 artisans payants"] },
    { t: "2028", s: "Toute la Wallonie", l: ["Ouverture après le seuil A", "Mises en avant (boost) pour artisans et négociants", "Suivi de chantier", "Seuil B : rentable, 15 000 € de chiffre d'affaires par mois"] },
    { t: "2029", s: "Bruxelles", l: ["Ouverture après le seuil B", "Mode appartements, droits et primes bruxellois", "Commercial bilingue", "Seuil C : 25 agences à Bruxelles, 30 000 € par mois"] },
    { t: "2030", s: "Flandre", l: ["Ouverture après le seuil C", "Appli en néerlandais, règles flamandes", "Obligation flamande de rénover : un argument fort", "Anvers et Gand d'abord"] },
  ];
  const revenus = [
    ["Particuliers", "Gratuit, toujours : acheteurs et propriétaires qui rénovent"],
    ["Agences et courtiers (dès le mois 4)", "Licence « Valou Pro » : 99 € / mois (89 € avec engagement de 12 mois). Agence : rapport « vrai coût, travaux compris » à son logo. Courtier : dossiers achat + travaux, forfait fixe, jamais lié au crédit accordé"],
    ["Artisans (dès le mois 7)", "39 € / mois, demandes chiffrées illimitées dans sa zone ; 30 artisans fondateurs : gratuit jusqu'au mois 6, puis 27 € / mois s'ils partagent leurs tarifs ; ou 12 € par demande acceptée"],
    ["Négociants (dès le mois 7)", "49 € / mois : fiche visible sur les projets de sa zone"],
    ["Mises en avant (dès le mois 9)", "9 à 129 € pour 7 ou 15 jours, 3 places par zone"],
  ];
  return `${entete("feuille")}<main>
    <h1>Feuille de route</h1>
    <p class="mu intro">Commencer à Liège en vendant d'abord aux agences et aux courtiers, qui paient et apportent les acheteurs, puis aux artisans et aux négociants. Chaque nouvelle région s'ouvre quand un seuil chiffré est atteint, pas à une date fixe.</p>
    <ol class="phases">${phases.map(p => `<li class="carte phase ${p.on ? "on" : ""}"><small>${esc(p.t)}</small><h2>${esc(p.s)}</h2><ul>${p.l.map(x => `<li>${esc(x)}</li>`).join("")}</ul></li>`).join("")}</ol>
    <section class="carte"><h2>Modèle économique</h2><p class="mu">Prix hors TVA, à valider avec les premiers clients.</p>
      <div class="revenus">${revenus.map(([t, x]) => `<div><b>${esc(t)}</b><p class="mu">${esc(x)}</p></div>`).join("")}</div>
    </section>
  </main>`;
}

/* ---------- démos guidées pour les rendez-vous : artisan et négociant ---------- */
export function ecranDemoPro(ctx, type) {
  const { entete, maisonDemo } = ctx;
  const A = maisonDemo ? `#/maison/${maisonDemo.id}` : "#/";
  const D = type === "negociant" ? {
    titre: "Valou pour les négociants",
    accroche: "Soyez vu des particuliers et des artisans qui préparent des travaux près de chez vous.",
    atouts: [["🧱", "Votre fiche sur les projets", "Vos services, coordonnées et horaires apparaissent sur les projets des maisons de votre zone."],
      ["📍", "Des clients proches", "Particuliers et artisans de la région, avec un chantier déjà chiffré : ils savent ce qu'ils vont acheter."],
      ["🏷️", "Vos prix dans les budgets (option)", "Si vous le souhaitez, vos prix hors TVA servent aux budgets des chantiers de votre zone."]],
    etapes: [["#/pro/negociant", "Votre fiche", "Services, coordonnées et horaires d'ouverture : l'aperçu se met à jour pendant la saisie."],
      [A, "Ce que voit le particulier", "Sur la fiche de la maison, en bas : « Négociants de votre région »."],
      ["#/pro/negprix", "Vos prix (facultatif)", "Tapez un ou deux prix : ils servent aux budgets des maisons proches."],
      [A, "Le résultat", "Dans « Budget travaux », les postes utilisent vos prix."]],
  } : {
    titre: "Valou pour les artisans",
    accroche: "Des projets déjà chiffrés, avec les photos des pièces, sans vous déplacer pour comprendre.",
    atouts: [["📷", "Le projet avec les photos", "Pièce par pièce : travaux, surfaces et photos de la visite. Vous savez tout de suite si le chantier est pour vous."],
      ["💶", "Un client qui connaît son budget", "Le budget est calculé avant votre devis : moins de visites pour rien, moins de devis refusés."],
      ["🔒", "Vos tarifs restent confidentiels", "Ils servent seulement à des moyennes de 5 artisans ou plus, jamais montrées aux autres artisans."]],
    etapes: [[A, "La maison visitée", "Pièces, photos, vrai coût. En bas de la page : « Envoyer le projet aux artisans »."],
      ["#/pro/artisan", "La demande reçue", "Choisissez votre métier : travaux, budget du client et photos des pièces concernées."],
      ["#/pro/tarifs", "Vos tarifs confidentiels", "Encodez un ou deux prix et cochez l'accord."],
      ["#/moteur", "Les prix de votre zone", "En bas : la carte des prix moyens à 5, 10, 15 et 20 km, avec votre prix en vert."]],
  };
  return `${entete("pro")}<main class="demo-pro">
    <p class="simule">Démonstration : maisons fictives, aucun envoi réel.</p>
    <h1>${esc(D.titre)}</h1>
    <p class="intro">${esc(D.accroche)}</p>
    <div class="atouts">${D.atouts.map(([i, t, x]) => `<div class="carte atout"><span class="at-ico">${i}</span><b>${esc(t)}</b><p class="mu">${esc(x)}</p></div>`).join("")}</div>
    <h2>La démonstration en ${D.etapes.length} étapes</h2>
    <ol class="etapes-demo">${D.etapes.map(([h, t, x], i) => `<li><a class="carte etape-demo" href="${h}"><span class="num">${i + 1}</span><div><b>${esc(t)}</b><p class="mu">${esc(x)}</p></div><span class="go">→</span></a></li>`).join("")}</ol>
    <p><a class="btn sec" href="${type === "negociant" ? "#/demo-artisan" : "#/demo-negociant"}">Voir la démo ${type === "negociant" ? "artisan" : "négociant"}</a></p>
  </main>`;
}
