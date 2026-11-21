/* Valou — prototype de démonstration. Écrans : accueil, ajouter une maison, le vrai coût d'une maison, comparer, dossier pour la banque. */
import { chargerReferences } from "./donnees.js?v=202611200931";
import { VERSION, DEMO_DIR, cle, img } from "./chemins.js?v=202611200931";
import { calculerBudget, coutTotal, mensualite, HYPOTHESES, FIABILITE, unitePoste, mursPiece, RATIO_MURS, travauxChauffage, CHAUFFAGE_ACTUEL, CHAUFFAGE_SOUHAITE, EMETTEURS, TYPES_PIECE, SOLS, MURS, PLAFONDS, WC, POSTES_PIECES, MARCHES_PAR_ESCALIER, CHASSIS, LABELS_PEB, COULEURS_PEB, OBLIGATION_PEB, concerneParObligation, travauxEnergie } from "./moteur.js?v=202611200931";
import { lireMaisons, ecrireMaisons, nouvelId } from "./stockage.js?v=202611200931";
import { euros, euros2, nombre, esc } from "./format.js?v=202611200931";
import { ecranPro, ecranMoteur, ecranFeuille, ecranDemoPro, METIERS, ficheNegociant, ARTISANS_EXEMPLE, ARTISANS, RAYONS_NEG, cleLigne } from "./vitrine.js?v=202611200931";
import { ecranQuestionnaire, PIECES_QUESTIONNAIRE, maisonDepuisQuestionnaire } from "./questionnaire.js?v=202611200931";
import { ajouterPhoto, listerPhotos, renommerPhoto, supprimerPhoto, supprimerPhotosMaison, memeNom, pieceDePhoto } from "./photos.js?v=202611200931";

let R = null;
let maisons = lireMaisons();
/* l'estimation rapide (cases cochées à l'ajout) n'existe plus : ses lignes « toute la maison » pour des postes de pièce sont retirées.
   Les postes de la maison (toiture, électricité…) restent : on les retrouve dans « Rénovations générales ». */
maisons.forEach(m => { m.fraisNotaire = null; delete m.notaireReel; }); // les frais de notaire sont toujours calculés (plus de montant encodé)
maisons.forEach(m => { if (m.travaux) m.travaux = m.travaux.filter(l => l.pieceId || l.src === "chauffage" || !POSTES_PIECES.test(l.k)); });
const $app = document.getElementById("app");
const sauver = () => ecrireMaisons(maisons);
const trouver = id => maisons.find(m => m.id === id);
/* version d'essai pour les particuliers (hoono.be/demo/#/essai) : sans les maisons de démonstration ni les pages pour les professionnels */
let essai = VERSION === "particulier";
try { if (VERSION === "complete") essai = localStorage.getItem(cle("valou_mode")) === "essai"; } catch (e) {}
const changerMode = v => {
  if (VERSION === "particulier") v = true; // la version Particuliers reste toujours en mode essai
  else if (VERSION !== "complete") v = false; // les versions Artisans et Négociants n'ont pas de mode essai
  essai = v; try { v ? localStorage.setItem(cle("valou_mode"), "essai") : localStorage.removeItem(cle("valou_mode")); } catch (e) {} };
const visibles = () => maisons; // les maisons d'exemple sont aussi montrées dans la version d'essai (étiquetées « Fictive »)
/* deux parcours : « J'achète une maison » (prix, droits, notaire, travaux) et « Je rénove ma maison » (travaux seuls) */
const projetDe = m => (m && m.projet === "renovation" ? "renovation" : "achat");
let parcours = "achat";
try { parcours = localStorage.getItem(cle("valou_parcours")) === "renovation" ? "renovation" : "achat"; } catch (e) {}
const choisirParcours = p => { parcours = p === "renovation" ? "renovation" : "achat"; try { localStorage.setItem(cle("valou_parcours"), parcours); } catch (e) {} };
const achats = () => visibles().filter(m => projetDe(m) === "achat");

/* ---------- regroupement des postes pour l'affichage ---------- */
const GROUPES = ["Cuisine et salle de bain", "Finitions intérieures", "Menuiseries", "Électricité", "Sanitaire et chauffage", "Gros œuvre", "Isolation", "Toiture", "Extérieurs", "Escalier"];
const groupe = p => (/^(meu_|wc_)/.test(p.k) ? "Cuisine et salle de bain" : p.g === "Espaces" ? "Finitions intérieures" : p.g === "Sanitaire" ? "Sanitaire et chauffage" : p.g);

/* ---------- petits composants ---------- */
const badge = f => (f ? `<span class="badge b-${f}" title="${esc(FIABILITE[f].d)}">${esc(FIABILITE[f].t)}</span>` : "");
const qte = (Q, u) => `${nombre(Q)} ${Q > 1 && (u === "pièce" || u === "escalier") ? u + "s" : u}`;
const pebBadge = (l, grand) => (l ? `<span class="peb ${grand ? "grand" : ""}" style="--peb:${COULEURS_PEB[l]}" title="Label PEB ${l}">PEB ${l}</span>` : "");
const fourchette = t => `${euros(t[0], 100)} – ${euros(t[2], 100)}`;

function entete(actif) {
  const lien = (h, t, id) => `<a class="nav-i ${actif === id ? "on" : ""}" href="${h}">${t}</a>`;
  const plusActif = ["pro", "moteur", "feuille", "plus"].includes(actif);
  const nbDevis = R ? devisAUtiliser() : 0; // devis reçus pas encore utilisés dans un dossier
  /* barre du bas (téléphone) : 4 boutons au pouce */
  const bas = (h, ico, t, on) => `<a class="bb-i ${on ? "on" : ""}" href="${h}"${on ? ' aria-current="page"' : ""}><span class="bb-ico" aria-hidden="true">${ico}</span><span>${t}</span></a>`;
  return `<header class="top">
    <a href="#/" class="marque" aria-label="Valou, accueil"><img src="${img("logo-valou.png")}" alt="Valou"></a>
    <nav class="nav-haut" aria-label="Menu">${lien("#/", "Mes maisons", "maisons")}${lien("#/comparer", "Comparer", "comparer")}${lien("#/contacts", `Contacter${nbDevis ? ` <span class="pastille">${nbDevis}</span>` : ""}`, "contacts")}${essai
      ? lien("#/avis", "💬 Mon avis", "avis")
      : `${lien("#/pro", "Professionnels", "pro")}${lien("#/moteur", "Notre moteur", "moteur")}${lien("#/feuille-de-route", "Feuille de route", "feuille")}`}</nav>
    <span class="top-d">${essai ? `<span class="badge-essai">Version d'essai</span>` : ""}<button class="aide-btn" data-action="tuto" title="Voir le didacticiel pour cette page" aria-label="Voir le didacticiel pour cette page">❔<span> Didacticiel</span></button></span>
  </header>
  <nav class="barre-bas" aria-label="Menu principal">
    ${bas("#/", "🏠", "Maisons", actif === "maisons")}${bas("#/comparer", "⚖️", "Comparer", actif === "comparer")}${bas("#/contacts", `📨${nbDevis ? `<span class="pastille bb-p">${nbDevis}</span>` : ""}`, "Contacter", actif === "contacts")}${essai
      ? bas("#/avis", "💬", "Mon avis", actif === "avis")
      : bas("#/plus", "☰", "Plus", plusActif)}
  </nav>`;
}

/* ---------- écran « Plus » (téléphone) : les autres pages ---------- */
function ecranPlus() {
  const L = [
    ["#/pro", "💼", "Professionnels", "Artisans, négociants, courtiers et agences"],
    ["#/moteur", "⚙️", "Notre moteur", "D'où viennent les prix, les prix locaux"],
    ["#/feuille-de-route", "🗺️", "Feuille de route", "Le modèle et les prochaines étapes"],
    ["#/questionnaire", "📝", "Questionnaire de visite", "Une page à imprimer pour la visite"],
  ];
  return `${entete("plus")}<main class="etroit">
    <h1>Plus</h1>
    <div class="plus-liste">${L.map(([h, i, t, d]) => `<a class="plus-i" href="${h}"><span class="plus-ico">${i}</span><span><b>${t}</b><small>${d}</small></span><span class="fl">›</span></a>`).join("")}</div>
    ${DEMO ? `<p class="reinit"><button class="btn lien" data-action="presentation">🎬 Préparer une présentation (tout remettre à zéro)</button></p>` : ""}
  </main>`;
}

/* ---------- écran : accueil ---------- */
function carteMaison(m) {
  const b = calculerBudget(R, m), c = coutTotal(m, b), reno = projetDe(m) === "renovation";
  return `<div class="m-case"><a class="carte maison ${reno ? "m-reno" : ""}" href="#/maison/${m.id}">
    <div class="m-tete"><b>${esc(m.nom || "Maison sans nom")}</b>${pebBadge(m.peb)}${m.exemple ? `<span class="badge b-exemple">Fictive</span>` : ""}</div>
    <div class="mu">${esc(m.commune || "")}${m.annee ? ` · ${esc(m.annee)}` : ""}${+m.facades ? ` · ${m.facades} façades` : ""}${m.surface ? ` · ${nombre(m.surface)} m²` : ""}</div>
    <div class="m-chiffres">${reno
      ? `<div><small>Budget de la rénovation</small><b class="or">${euros(c.total[1], 100)}</b></div><div><small>Pièces</small><b>${(m.pieces || []).length}</b></div>`
      : `<div><small>Prix demandé</small><b>${euros(c.prix)}</b></div><div><small>Vrai coût estimé</small><b class="or">${euros(c.total[1], 100)}</b></div>`}</div>
  </a><button class="m-suppr" data-action="suppr-demande" data-id="${m.id}" aria-label="Supprimer ${esc(m.nom || "cette maison")}" title="Supprimer">🗑</button></div>`;
}
const PARCOURS = {
  achat: { ico: "🏠", t: "J'achète une maison", d: "Le vrai coût avant de faire une offre : prix, droits, notaire et travaux.",
    h: `Combien cette maison va-t-elle <em>vraiment</em> vous coûter ?`, p: "Prix d'achat, droits d'enregistrement, notaire et travaux : le vrai budget, poste par poste, avant de faire une offre.",
    ajout: "＋ Ajouter une maison à acheter",
    av: ["Le vrai coût avant de faire une offre : prix, droits, notaire et travaux", "Vos maisons comparées sur leur vrai coût, PEB compris", "La visite guidée pièce par pièce, avec les photos", "Un dossier complet pour la banque", "Votre projet envoyé aux artisans, qui le comprennent sans se déplacer"] },
  renovation: { ico: "🔨", t: "Je rénove ma maison", d: "Le budget de vos travaux, les aides et vos artisans.",
    h: `Combien va <em>vraiment</em> coûter votre rénovation ?`, p: "Pièce par pièce, le budget de vos travaux. Puis les aides, le prêt travaux et votre projet envoyé aux artisans de votre choix.",
    ajout: "＋ Ajouter ma maison à rénover",
    av: ["Le budget de vos travaux, pièce par pièce", "Les travaux qui améliorent votre PEB", "Les aides à la rénovation et le prêt travaux", "Un dossier pour la banque", "Votre projet envoyé aux artisans de votre choix, métier par métier"] },
};
function ecranAccueil() {
  const P = PARCOURS[parcours], L = visibles().filter(m => projetDe(m) === parcours);
  const nb = p => visibles().filter(m => projetDe(m) === p).length;
  return `${entete("maisons")}
  <main>
    <div class="parcours" role="tablist" aria-label="Votre projet">${["achat", "renovation"].map(k => `<button class="pc-choix ${parcours === k ? "on" : ""}" data-action="parcours" data-p="${k}" role="tab" aria-selected="${parcours === k}">
      <span class="pc-c-ico">${PARCOURS[k].ico}</span><span><b>${PARCOURS[k].t}</b><small>${PARCOURS[k].d}</small></span>${nb(k) ? `<span class="pc-nb">${nb(k)}</span>` : ""}</button>`).join("")}</div>
    <section class="hero">
      <h1>${P.h}</h1>
      <p>${esc(P.p)}</p>
      <span class="actions-g"><a class="btn" href="#/ajouter">${P.ajout}</a>${parcours === "achat" ? `<a class="btn sec" href="#/questionnaire">📝 Questionnaire de visite à imprimer</a>` : ""}</span>
    </section>
    ${essai ? `<section class="carte essai-info"><b>Version d'essai</b>
      <p>Vos maisons restent <b>sur ce téléphone</b> : pas de compte, rien n'est envoyé. L'envoi aux artisans et à la banque est simulé, et les artisans et négociants affichés sont fictifs.</p>
      <a class="btn sec petit-btn" href="#/avis">💬 Donner mon avis</a></section>` : ""}
    <section class="avantages av-particulier"><b>Pour vous, c'est gratuit</b><ul>${P.av.map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>
    ${L.length ? `<h2>${parcours === "achat" ? "Les maisons que je visite" : "Ma maison à rénover"}</h2><div class="grille">${L.map(carteMaison).join("")}</div>`
      : `<div class="vide carte"><p>${parcours === "achat" ? "Ajoutez la maison que vous visitez : son vrai coût s'affiche tout de suite." : "Ajoutez votre maison : vous verrez le budget de vos travaux, pièce par pièce."}</p><a class="btn" href="#/ajouter">${P.ajout}</a></div>`}
    ${DEMO && !essai ? `<p class="reinit"><button class="btn lien" data-action="presentation">🎬 Préparer une présentation (tout remettre à zéro)</button></p>` : ""}
  </main>`;
}

/* ---------- écran : ajouter une maison ---------- */
let brouillon = null;
const FACADES = [[2, "2 façades (mitoyenne)"], [3, "3 façades (semi-mitoyenne)"], [4, "4 façades (isolée)"]];
const txtFacades = m => (+m.facades ? `${m.facades} façades` : "");
const ETAGES = [[0, "Rez seul (plain-pied)"], [1, "Rez + 1 étage"], [2, "Rez + 2 étages"], [3, "Rez + 3 étages"]];
const HAUTEUR_ETAGE = 3; // m par niveau
const txtEtages = m => (m.etages == null || m.etages === "" ? "" : +m.etages ? `rez + ${m.etages}` : "plain-pied");
const brouillonVide = () => ({ nom: "", commune: "", prix: "", annee: "", surface: "", facades: "", etages: "", etat: "rafraichir", uniqueHabitation: true, choix: {}, chauffage: { actuel: "gaz", souhaite: "garder", emetteurs: "garder" } });

/* bloc chauffage, utilisé dans le formulaire et sur la fiche maison */
function blocChauffage(ch, attr, sansEmetteurs) {
  const c = { actuel: "gaz", souhaite: "garder", emetteurs: "garder", ...(ch || {}) };
  const sel = (f, t, L) => `<label>${t}<select ${attr}="${f}">${L.map(([v, x]) => `<option value="${v}" ${c[f] === v ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label>`;
  return `<div class="champs chauffage">
    ${sel("actuel", "Chauffage existant", CHAUFFAGE_ACTUEL)}
    ${sel("souhaite", "Chauffage souhaité", CHAUFFAGE_SOUHAITE)}
    ${sansEmetteurs ? "" : sel("emetteurs", "Radiateurs ou chauffage au sol", EMETTEURS)}
    ${sansEmetteurs ? "" : c.emetteurs === "rad" ? `<label>Nombre de radiateurs<input type="number" min="0" inputmode="numeric" ${attr}="nbRad" value="${esc(c.nbRad ?? "")}"></label>` : ""}
    ${sansEmetteurs ? "" : c.emetteurs === "sol" ? `<label>Surface chauffée au sol (m²)<input type="number" min="0" inputmode="numeric" ${attr}="solM2" value="${esc(c.solM2 ?? "")}" placeholder="surface habitable"></label>` : ""}
  </div>`;
}

function ecranAjouter() {
  if (!brouillon || brouillon.projet !== parcours) brouillon = { ...brouillonVide(), projet: parcours };
  const b = brouillon, reno = parcours === "renovation";
  const champ = (id, t, type = "text", extra = "") =>
    `<label>${t}<input name="${id}" type="${type}" value="${esc(b[id])}" ${extra}></label>`;
  return `${entete("")}
  <main class="etroit">
    <a href="#/" class="retour">← Mes maisons</a>
    <h1>${reno ? "Ajouter ma maison à rénover" : "Ajouter une maison à acheter"}</h1>
    <form id="f-ajout" class="carte">
      <h2>La maison</h2>
      <div class="champs">
        ${champ("nom", "Nom (pour vous)", "text", `placeholder="${reno ? "Ex. : ma maison" : "Ex. : maison rue des Tilleuls"}" required`)}
        ${champ("commune", "Commune", "text", 'placeholder="Ex. : Seraing"')}
        ${reno ? "" : champ("prix", "Prix demandé (€)", "number", 'min="0" inputmode="numeric" required')}
        ${champ("annee", "Année de construction", "number", 'min="1800" max="2030" inputmode="numeric" required')}
        ${champ("surface", "Surface habitable (m²)", "number", 'min="10" inputmode="numeric" required')}
        <label>Nombre d'étages<select name="etages" required><option value="" disabled ${b.etages === "" ? "selected" : ""}>Choisir…</option>${ETAGES.map(([v, t]) => `<option value="${v}" ${b.etages !== "" && +b.etages === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
        <label>Nombre de façades<select name="facades"><option value="">Je ne sais pas</option>${FACADES.map(([v, t]) => `<option value="${v}" ${+b.facades === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
        <label>${reno ? "Label PEB (si vous avez un certificat)" : "Label PEB (certificat de l'annonce)"}<select name="peb"><option value="">Je ne sais pas</option>${LABELS_PEB.map(l => `<option ${b.peb === l ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        ${champ("pebConso", "Consommation (kWh/m²/an)", "number", 'min="0" inputmode="numeric" placeholder="sur le certificat"')}
        <label>État général<select name="etat">
          ${[["bon", "Bon état"], ["rafraichir", "À rafraîchir"], ["renover", "À rénover (support abîmé)"]].map(([v, t]) => `<option value="${v}" ${b.etat === v ? "selected" : ""}>${t}</option>`).join("")}
        </select></label>
${reno ? "" : `<label class="cb large"><input type="checkbox" name="uniqueHabitation" ${b.uniqueHabitation ? "checked" : ""}> Ce sera ma seule habitation, et j'y habiterai (droits d'enregistrement réduits à 3 % en Wallonie)</label>`}
      </div>
      <p class="mu">Ensuite, sur la fiche de la maison : ajoutez les pièces dans l'onglet « Espaces », puis le chauffage et la structure dans l'onglet « Technique ». C'est là que le budget devient précis.</p>
      <button class="btn" type="submit">${reno ? "Voir le budget de la rénovation →" : "Voir le vrai coût →"}</button>
    </form>
  </main>`;
}

function creerMaison(b, exemple = false) {
  const m = {
    id: nouvelId(),
    projet: b.projet === "renovation" ? "renovation" : "achat",
    nom: b.nom, commune: b.commune, prix: b.projet === "renovation" ? 0 : +b.prix || 0, annee: +b.annee || null, surface: +b.surface || 0, facades: +b.facades || null, etages: b.etages === "" || b.etages == null ? null : +b.etages,
    etat: b.etat, uniqueHabitation: !!b.uniqueHabitation, fraisNotaire: null, exemple, peb: b.peb || null, pebConso: +b.pebConso || null,
    rep: { etat: b.etat === "renover" ? "oui" : "non" },
  };
  m.travaux = [];
  m.chauffage = { ...b.chauffage };
  appliquerChauffage(m);
  maisons.unshift(m);
  sauver();
  return m;
}

/* (re)génère les lignes du chauffage à partir des choix */
function appliquerChauffage(m) {
  /* avec des pièces, les radiateurs et le chauffage au sol se remplissent pièce par pièce */
  const r = travauxChauffage((m.pieces || []).length ? { ...m.chauffage, emetteurs: "garder" } : m.chauffage, m.surface);
  m.travaux = (m.travaux || []).filter(l => l.src !== "chauffage").concat(r.lignes.map(l => ({ ...l, id: nouvelId() })));
  m.rep = { ...(m.rep || {}), rad: r.rad };
}

/* maisons de démonstration : demo/maison-demo.json (fictives, à remplacer par de vraies maisons) */
let DEMO = null;
function chargerDemo() {
  if (!DEMO || !DEMO.maisons) return null;
  maisons = maisons.filter(m => !m.demo);
  const L = DEMO.maisons.map(d => {
    const m = { ...JSON.parse(JSON.stringify(d)), id: nouvelId(), demo: true, exemple: true, demoVersion: DEMO.version, rep: { ...(d.rep || {}) }, pieces: (d.pieces || []).map(p => ({ ...p, wi: [...(p.wi || [])] })), travaux: d.travaux.map(t => ({ ...t, id: nouvelId() })) };
    if (m.chauffage) appliquerChauffage(m);
    return m;
  });
  maisons.unshift(...L);
  selection = null;
  sauver();
  return L[0];
}

const boutonPhotosMaison = m => { const n = photosDe(m).length; return `<a class="btn sec" href="#/maison/${m.id}/photos">📷 Photos de la visite${n ? ` (${n})` : ""}</a>`; };

/* ---------- « Je rénove ma maison » : financement ---------- */
/* courtiers et banque (fictifs) : on leur envoie le dossier pour la banque */
const COURTIERS = [
  { id: "c1", nom: "Crédit Clair", lieu: "Liège", desc: "Courtier en crédit hypothécaire : compare les offres de plusieurs banques pour vous.", tel: "04 000 09 01", email: "creditclair@exemple.be" },
  { id: "c2", nom: "Prêt Malin", lieu: "Seraing", desc: "Prêts achat et travaux, prêts rénovation et Rénopack.", tel: "04 000 09 02", email: "pretmalin@exemple.be" },
  { id: "banque", nom: "Ma banque", lieu: "", desc: "Envoyer le dossier directement au conseiller de votre banque.", tel: "", email: "" },
];
function blocCourtier(m, cO) {
  const E = m.envoiCourtier || {};
  return `<section class="carte courtier">
    <h2>🏦 Courtier et banque</h2>
    <p class="mu">Envoyez votre dossier complet (coût total${projetDe(m) === "achat" && m.offre ? " avec votre offre" : ""}, financement, travaux et devis retenus) à un courtier ou à votre banque. Coût total : <b>${euros(cO.total[1], 100)}</b>.</p>
    <div class="co-liste">${COURTIERS.map(k => `<div class="co-i">
      <div><b>${esc(k.nom)}</b>${k.id !== "banque" ? ` <span class="badge b-exemple">Exemple fictif</span>` : ""}<small class="mu">${esc([k.lieu, k.desc].filter(Boolean).join(" · "))}</small>${k.tel ? `<small class="mu">📞 ${esc(k.tel)} · ✉️ ${esc(k.email)}</small>` : ""}</div>
      ${E[k.id] ? `<span class="dr-ok">✓ Dossier envoyé le ${esc(new Date(E[k.id]).toLocaleDateString("fr-BE"))}</span>` : `<button class="btn sec petit-btn" data-action="courtier-envoyer" data-id="${k.id}">📨 Envoyer mon dossier</button>`}
    </div>`).join("")}</div>
    <p class="mu petit-t">Démonstration : aucun envoi réel. <a href="#/dossier/${m.id}">Voir mon dossier pour la banque</a>.</p>
  </section>`;
}
/* ---------- type de toiture : on clique sur le schéma ---------- */
const TOITS = [ // dessins en 3D (vue de trois quarts : façade, côté et pans du toit)
  ["plat", "Toit plat", '<polygon class="f-mur" points="5.2,49.9 45.2,49.9 45.2,31.9 5.2,31.9"/><polygon class="f-cote" points="45.2,49.9 62.6,38.1 62.6,20.1 45.2,31.9"/><polygon class="f-trou" points="22.2,49.9 28.2,49.9 28.2,38.9 22.2,38.9"/><polygon class="f-vitre" points="10.2,42.9 18.2,42.9 18.2,36.9 10.2,36.9"/><polygon class="f-vitre" points="32.2,42.9 40.2,42.9 40.2,36.9 32.2,36.9"/><polygon class="f-vitre2" points="50.8,39.1 56.4,35.3 56.4,29.3 50.8,33.1"/><polygon class="f-toit2" points="46.0,32.7 65.8,19.3 65.8,16.3 46.0,29.7"/><polygon class="f-toit" points="2.0,32.7 46.0,32.7 46.0,29.7 2.0,29.7"/><polygon class="f-toit3" points="2.0,29.7 46.0,29.7 65.8,16.3 21.8,16.3"/>'],
  ["appentis", "Une pente", '<polygon class="f-mur" points="5.2,49.9 45.2,49.9 45.2,31.9 5.2,31.9"/><polygon class="f-cote" points="45.2,49.9 62.6,38.1 62.6,6.1 45.2,31.9"/><polygon class="f-trou" points="22.2,49.9 28.2,49.9 28.2,38.9 22.2,38.9"/><polygon class="f-vitre" points="10.2,42.9 18.2,42.9 18.2,36.9 10.2,36.9"/><polygon class="f-vitre" points="32.2,42.9 40.2,42.9 40.2,36.9 32.2,36.9"/><polygon class="f-vitre2" points="50.8,39.1 56.4,35.3 56.4,29.3 50.8,33.1"/><polygon class="f-toit" points="3.0,33.7 45.0,33.7 63.6,6.1 21.6,6.1"/>'],
  ["batiere", "Deux pentes", '<polygon class="f-mur" points="5.2,49.9 45.2,49.9 45.2,31.9 5.2,31.9"/><polygon class="f-cote" points="45.2,49.9 62.6,38.1 62.6,20.1 45.2,31.9"/><polygon class="f-trou" points="22.2,49.9 28.2,49.9 28.2,38.9 22.2,38.9"/><polygon class="f-vitre" points="10.2,42.9 18.2,42.9 18.2,36.9 10.2,36.9"/><polygon class="f-vitre" points="32.2,42.9 40.2,42.9 40.2,36.9 32.2,36.9"/><polygon class="f-vitre2" points="50.8,39.1 56.4,35.3 56.4,29.3 50.8,33.1"/><polygon class="f-cote" points="45.2,31.9 62.6,20.1 53.9,11.0"/><polygon class="f-toit" points="3.0,33.7 45.0,33.7 54.9,11.0 12.9,11.0"/>'],
  ["croupe", "Quatre pans", '<polygon class="f-mur" points="5.2,49.9 45.2,49.9 45.2,31.9 5.2,31.9"/><polygon class="f-cote" points="45.2,49.9 62.6,38.1 62.6,20.1 45.2,31.9"/><polygon class="f-trou" points="22.2,49.9 28.2,49.9 28.2,38.9 22.2,38.9"/><polygon class="f-vitre" points="10.2,42.9 18.2,42.9 18.2,36.9 10.2,36.9"/><polygon class="f-vitre" points="32.2,42.9 40.2,42.9 40.2,36.9 32.2,36.9"/><polygon class="f-vitre2" points="50.8,39.1 56.4,35.3 56.4,29.3 50.8,33.1"/><polygon class="f-toit2" points="45.0,33.7 64.8,20.3 42.9,11.0"/><polygon class="f-toit" points="3.0,33.7 45.0,33.7 42.9,11.0 24.9,11.0"/>'],
  ["pointe", "En pointe", '<polygon class="f-mur" points="5.2,49.9 45.2,49.9 45.2,31.9 5.2,31.9"/><polygon class="f-cote" points="45.2,49.9 62.6,38.1 62.6,20.1 45.2,31.9"/><polygon class="f-trou" points="22.2,49.9 28.2,49.9 28.2,38.9 22.2,38.9"/><polygon class="f-vitre" points="10.2,42.9 18.2,42.9 18.2,36.9 10.2,36.9"/><polygon class="f-vitre" points="32.2,42.9 40.2,42.9 40.2,36.9 32.2,36.9"/><polygon class="f-vitre2" points="50.8,39.1 56.4,35.3 56.4,29.3 50.8,33.1"/><polygon class="f-toit2" points="45.0,33.7 64.8,20.3 33.9,2.0"/><polygon class="f-toit" points="3.0,33.7 45.0,33.7 33.9,2.0"/>'],
  ["mansarde", "Mansardé", '<polygon class="f-mur" points="5.2,49.9 45.2,49.9 45.2,31.9 5.2,31.9"/><polygon class="f-cote" points="45.2,49.9 62.6,38.1 62.6,20.1 45.2,31.9"/><polygon class="f-trou" points="22.2,49.9 28.2,49.9 28.2,38.9 22.2,38.9"/><polygon class="f-vitre" points="10.2,42.9 18.2,42.9 18.2,36.9 10.2,36.9"/><polygon class="f-vitre" points="32.2,42.9 40.2,42.9 40.2,36.9 32.2,36.9"/><polygon class="f-vitre2" points="50.8,39.1 56.4,35.3 56.4,29.3 50.8,33.1"/><polygon class="f-cote" points="45.2,31.9 48.3,18.8 53.9,11.0 59.5,11.2 62.6,20.1"/><polygon class="f-toit" points="3.3,33.5 45.3,33.5 49.3,18.8 7.3,18.8"/><polygon class="f-toit3" points="7.3,18.8 49.3,18.8 54.9,11.0 12.9,11.0"/>'],
];
const nomToit = k => (TOITS.find(t => t[0] === k) || [])[1] || "";
const schemaToit = forme => `<svg viewBox="0 0 68 52" aria-hidden="true">${forme}</svg>`;
/* surface du toit d'après la largeur de façade, la profondeur et la pente : surface = emprise ÷ cos(pente) */
const PENTE_DEFAUT = { plat: 0, appentis: 15, batiere: 35, croupe: 35, pointe: 40, mansarde: 25 };
const POSTES_TOIT_M2 = /^i_(dp|st|cv_\d|cp_\d|to_1|to_2)$/;
function calcToiture(m) {
  const D = m.toitDim || {}, t = m.toiture, l = +D.larg, pr = +D.prof;
  if (!t || !(l > 0) || !(pr > 0)) return null;
  const deb = +D.debord || 0, L = l + 2 * deb, P = pr + 2 * deb, pente = D.pente != null && D.pente !== "" ? +D.pente : PENTE_DEFAUT[t];
  const rad = x => (x * Math.PI) / 180, emprise = L * P;
  let surf, detail;
  if (t === "plat") { surf = emprise; detail = "toit plat : longueur × largeur"; }
  else if (t === "mansarde") {
    const b = 0.15 * P, brisis = (2 * L * b) / Math.cos(rad(70)), terr = (L * (P - 2 * b)) / Math.cos(rad(pente));
    surf = brisis + terr; detail = `brisis à 70° (${nombre(Math.round(brisis))} m²) + terrasson à ${pente}° (${nombre(Math.round(terr))} m²)`;
  } else {
    surf = emprise / Math.cos(rad(pente));
    const pans = { appentis: "1 pan", batiere: `2 pans de ${nombre(Math.round(surf / 2))} m²`, croupe: "4 pans", pointe: "4 pans" }[t];
    detail = `${pans}, pente ${pente}°`;
  }
  const goutt = { plat: 2 * (L + P), appentis: L, batiere: 2 * L, croupe: 2 * (L + P), pointe: 2 * (L + P), mansarde: 2 * L }[t];
  return { surf: Math.round(surf), detail, goutt: Math.round(goutt), combles: Math.round(l * pr), pente, deb };
}
/* surface des façades : (2 × largeur + côtés libres × profondeur) × 3 m par niveau */
function calcFacades(m) {
  const D = m.toitDim || {}, l = +D.larg, pr = +D.prof, f = +m.facades;
  if (!(l > 0) || !(pr > 0) || !f || m.etages == null || m.etages === "") return null;
  const cotes = f - 2, niveaux = +m.etages + 1, haut = niveaux * HAUTEUR_ETAGE, long = 2 * l + cotes * pr;
  return { surf: Math.round(long * haut), long, haut, cotes, niveaux };
}
function blocDimensions(m) {
  const D = m.toitDim || {}, r = calcFacades(m);
  const ch = (k, t, ph) => `<label>${t}<span class="saisie"><input type="number" min="0" step="any" inputmode="decimal" data-tdim="${k}" value="${esc(D[k] ?? "")}" placeholder="${ph}"><i>m</i></span></label>`;
  const manque = [!(+D.larg > 0) && "la largeur", !(+D.prof > 0) && "la profondeur", !+m.facades && "le nombre de façades", (m.etages == null || m.etages === "") && "le nombre d'étages"].filter(Boolean);
  return `<section class="carte">
      <h2>Les dimensions de la maison</h2>
      <div class="toit-dim">
        ${ch("larg", "Largeur de la façade", "ex. 9")}
        ${ch("prof", "Profondeur de la maison", "ex. 10")}
        <label>Nombre de façades<select data-f="facades"><option value="">?</option>${FACADES.map(([v, t]) => `<option value="${v}" ${+m.facades === v ? "selected" : ""}>${v} façades</option>`).join("")}</select></label>
        <label>Nombre d'étages<select data-f="etages"><option value="" ${m.etages == null || m.etages === "" ? "selected" : ""}>À choisir</option>${ETAGES.map(([v, t]) => `<option value="${v}" ${m.etages != null && m.etages !== "" && +m.etages === v ? "selected" : ""}>${v ? `Rez + ${v}` : "Plain-pied"}</option>`).join("")}</select></label>
      </div>
      ${r ? `<div class="toit-res">
        <div class="ligne"><span>Surface des façades</span><b>≈ ${nombre(r.surf)} m²</b></div>
        <small class="mu">(${r.cotes ? `2 × ${nombre(D.larg)} m + ${r.cotes} × ${nombre(D.prof)} m` : `2 × ${nombre(D.larg)} m, avant et arrière`}) × ${nombre(r.haut)} m de haut (${r.niveaux} niveau${r.niveaux > 1 ? "x" : ""} de ${HAUTEUR_ETAGE} m). Fenêtres et portes non déduites, pignons non comptés. Dans « Isolation » ci-dessous, touchez « = ${nombre(r.surf)} » à côté d'un poste de façade.</small>
      </div>` : `<p class="mu petit-t">Il manque ${manque.join(", ")} pour calculer la surface des façades${manque.some(x => /largeur|profondeur/.test(x)) ? " et du toit" : ""}.</p>`}
    </section>`;
}
/* ---------- Technique : les gros travaux en questions simples (oui / non), quantités reprises des dimensions ---------- */
function setFixe(m, k, q) {
  const l = m.travaux.find(x => !x.pieceId && x.src !== "chauffage" && x.k === k);
  if (q > 0) { if (l) { l.q = q; delete l.auto; } else m.travaux.push({ id: nouvelId(), piece: "Toute la maison", k, q }); }
  else m.travaux = m.travaux.filter(x => x !== l);
}
function grosTravaux(m) {
  const rt = calcToiture(m), rf = calcFacades(m), plat = m.toiture === "plat";
  return [
    ["couv", "🏠", "Refaire la couverture du toit", rt && [["i_dp", rt.surf], ["i_st", plat ? 0 : rt.surf], [plat ? "i_cv_4" : "i_cv_1", rt.surf], ["i_zi", rt.goutt]], "choisissez le type de toit et tapez les dimensions"],
    ["isoT", "🧤", plat ? "Isoler le toit plat" : "Isoler la toiture (sous les pentes)", rt && [[plat ? "i_to_2" : "i_to_1", rt.surf]], "choisissez le type de toit et tapez les dimensions"],
    ["isoF", "🧱", "Isoler les façades par l'extérieur", rf && [["i_fa_3", rf.surf]], "complétez les dimensions de la maison"],
    ["crepi", "🎨", "Refaire l'enduit des façades", rf && [["i_fa_1", rf.surf]], "complétez les dimensions de la maison"],
    ["porte", "🚪", "Remplacer la porte d'entrée", [["i_pe", 1]], ""],
    ["coffret", "⚡", "Remplacer le tableau électrique", [["i_co", 1]], ""],
  ];
}
const ligneFixe = (m, k) => m.travaux.find(x => !x.pieceId && x.src !== "chauffage" && x.k === k);
function basculerGros(m, g) {
  const G = grosTravaux(m).find(x => x[0] === g);
  if (!G || !G[3]) return;
  const P = G[3].filter(([, q]) => q > 0), oui = P.every(([k]) => ligneFixe(m, k));
  P.forEach(([k, q]) => setFixe(m, k, oui ? 0 : q));
}
function blocGrosTravaux(m) {
  return `<section class="carte gros-t">
      <h2>Qu'est-ce qui est à refaire ?</h2>
      <p class="mu petit-t">Touchez ce qui est à prévoir : Valou remplit les postes avec les mesures de la maison. Le détail reste modifiable plus bas.</p>
      <div class="gt-liste">${grosTravaux(m).map(([g, ico, t, P, manque]) => {
        const actifs = P ? P.filter(([, q]) => q > 0) : [], oui = actifs.length && actifs.every(([k]) => ligneFixe(m, k));
        return P ? `<button type="button" class="gt ${oui ? "on" : ""}" data-action="gros" data-g="${g}" aria-pressed="${!!oui}"><span class="gt-ico">${ico}</span><span class="gt-t">${t}</span><span class="gt-r">${oui ? "✓ Oui" : "Non"}</span></button>`
          : `<div class="gt off"><span class="gt-ico">${ico}</span><span class="gt-t">${t}<small class="mu">Pour cela : ${manque}.</small></span></div>`;
      }).join("")}</div>
    </section>`;
}
function blocToiture(m) {
  return `<section class="carte">
      <h2>La toiture</h2>
      <p class="mu petit-t">Touchez le schéma qui ressemble au toit de la maison.</p>
      <div class="toits">${TOITS.map(([k, t, f]) => `<button type="button" class="toit-c ${m.toiture === k ? "on" : ""}" data-action="toit" data-t="${k}" aria-pressed="${m.toiture === k}">${schemaToit(f)}<span>${t}</span></button>`).join("")}</div>
      ${m.toiture ? (() => {
        const D = m.toitDim || {}, r = calcToiture(m);
        const ch = (k, t, ph, suf) => `<label>${t}<span class="saisie"><input type="number" min="0" step="any" inputmode="decimal" data-tdim="${k}" value="${esc(D[k] ?? "")}" placeholder="${ph}"><i>${suf}</i></span></label>`;
        return `<h3 class="td-titre">Calculer la surface du toit</h3>
        <div class="toit-dim">
          ${m.toiture === "plat" ? "" : ch("pente", m.toiture === "mansarde" ? "Pente du haut (terrasson)" : "Pente du toit", String(PENTE_DEFAUT[m.toiture]), "°")}
          ${ch("debord", "Débord du toit", "0", "m")}
        </div>
        ${r ? `<div class="toit-res">
          <div class="ligne"><span>Surface de toiture</span><b>≈ ${nombre(r.surf)} m²</b></div>
          <small class="mu">${esc(r.detail)}${r.deb ? `, débord de ${String(r.deb).replace(".", ",")} m compris` : ""}.</small>
          <div class="ligne"><span>${m.toiture === "plat" ? "Rives (tour du toit)" : "Gouttières"}</span><b>≈ ${nombre(r.goutt)} m</b></div>
          <div class="ligne"><span>Sol des combles (isolation)</span><b>≈ ${nombre(r.combles)} m²</b></div>
          <small class="mu">Dans « Toiture » et « Isolation » ci-dessous, touchez « = … » à côté d'un poste pour reprendre ces mesures. ${m.toiture === "plat" ? "" : `Pente non connue ? ${PENTE_DEFAUT[m.toiture]}° est une pente courante en Wallonie.`} À confirmer par le couvreur.</small>
        </div>` : `<p class="mu petit-t">Tapez la largeur et la profondeur dans « Les dimensions de la maison » : la surface du toit se calcule avec la pente.</p>`}`;
      })() : ""}
    </section>`;
}
/* ---------- travaux inclus ou non dans la demande de prêt (par groupe ; imprévus et TVA au prorata) ---------- */
function travauxPret(m, b, travauxMoy) {
  const H = new Set((m.fin || {}).horsPret || []), G = {};
  let tous = 0, ex = 0;
  b.postes.forEach(p => { const g = groupe(p); G[g] = (G[g] || 0) + p.total[1]; tous += p.total[1]; if (H.has(g)) ex += p.total[1]; });
  const groupes = GROUPES.filter(g => G[g]).map(g => ({ g, v: tous ? Math.round(travauxMoy * G[g] / tous) : 0, inclus: !H.has(g) }));
  return { groupes, hors: tous ? Math.round(travauxMoy * ex / tous) : 0 };
}
function blocTravauxPret(m, tp) {
  if (!tp.groupes.length) return "";
  const n = tp.groupes.filter(x => x.inclus).length;
  return `<details class="pret-trav" data-ouvert="pret-${m.id}" ${ouverts.has("pret-" + m.id) ? "open" : ""}>
    <summary><span>Travaux inclus dans le prêt <small class="mu">(${n} sur ${tp.groupes.length})</small></span>${tp.hors ? `<b>− ${euros(tp.hors, 100)}</b>` : ""}</summary>
    <p class="mu petit-t">Décochez les travaux que vous payez vous-même (épargne, plus tard…) : ils sortent du montant à emprunter.</p>
    ${tp.groupes.map(x => `<label class="cb pt-l"><input type="checkbox" data-pret="${esc(x.g)}" ${x.inclus ? "checked" : ""}><span>${esc(x.g)}</span><b class="${x.inclus ? "" : "pt-hors"}">${euros(x.v, 100)}</b></label>`).join("")}
  </details>`;
}
function blocFinancerRenovation(m, b, c) {
  const tp = travauxPret(m, b, c.travaux[1]);
  const f = m.fin || {}, apport = +f.apport || 0, emprunt = Math.max(0, c.total[1] - tp.hors - apport), mens = mensualite(emprunt, f.taux, f.duree);
  const ch = (k, t, suf, ph) => `<label>${t}<span class="saisie"><input type="number" min="0" step="any" inputmode="decimal" data-fin="${k}" value="${esc(f[k] ?? "")}" placeholder="${ph}"><i>${suf}</i></span></label>`;
  return `<div class="fin-page">
    <section class="carte">
      <h2>Simulation de financement</h2>
      <div class="champs">
        <div class="ligne"><span>Budget de la rénovation (moyen)</span><b>${euros(c.total[1], 100)}</b></div>
        ${blocTravauxPret(m, tp)}
        ${ch("apport", "Épargne que vous y mettez", "€", "ex. 10000")}
        <div class="ligne"><span>Montant à emprunter (prêt travaux)</span><b>${euros(emprunt, 100)}</b></div>
        ${ch("taux", "Taux annuel du prêt (si vous l'avez)", "%", "taux de la banque")}
        ${ch("duree", "Durée du prêt", "ans", "ex. 10")}
        ${mens ? `<div class="ligne"><span>Mensualité estimée (hors assurance)</span><b>${euros(mens)} / mois</b></div>` : ""}
        <small class="mu">Le Rénopack (prêt à taux zéro de la Wallonie) peut financer une partie des travaux : conditions à vérifier. Les aides ne sont pas déduites du budget.</small>
      </div>
    </section>
    ${aides()}
  </div>
  <div class="actions">
    <span class="actions-g"><a class="btn" href="#/dossier/${m.id}">Dossier pour la banque →</a></span>
    <button class="btn lien" data-action="suppr-demande" data-id="${m.id}">🗑 Supprimer cette maison</button>
  </div>`;
}
/* ---------- envoyer le projet aux artisans (démonstration) ---------- */
function panneauEnvoi(m, b) {
  const metiers = METIERS.filter(x => x.id !== "general" && b.postes.some(p => x.f(p.k) && p.QL > 0));
  const nbPhotos = photosDe(m).length;
  if (m.envoi && envoiOuvert !== m.id) return `<section class="carte envoi ok-envoi"><b>📨 Projet envoyé aux artisans le ${esc(new Date(m.envoi.date).toLocaleDateString("fr-BE"))}</b>
    <p class="mu">${esc(m.envoi.metiers.map(id => (METIERS.find(x => x.id === id) || {}).t).filter(Boolean).join(", "))} · avec le budget${nbPhotos ? ` et ${nbPhotos} photo${nbPhotos > 1 ? "s" : ""}` : ""}. Démonstration : aucun envoi réel.</p>
    <span class="actions-g">${essai ? "" : `<a class="btn sec" href="#/pro/artisan">Voir ce que reçoit l'artisan →</a>`}<button class="btn lien" data-action="envoi-ouvrir">Renvoyer</button></span></section>`;
  if (envoiOuvert !== m.id) return `<section class="carte envoi"><div class="env-tete"><div><b>Trouver les artisans</b><p class="mu">Envoyez le projet chiffré${nbPhotos ? `, avec ses ${nbPhotos} photo${nbPhotos > 1 ? "s" : ""},` : ""} aux artisans de votre zone : ils comprennent le chantier sans se déplacer.</p></div>
    <button class="btn" data-action="envoi-ouvrir" ${metiers.length ? "" : "disabled"}>📨 Envoyer le projet aux artisans</button></div></section>`;
  return `<section class="carte envoi"><b>À quels artisans envoyer le projet ?</b>
    <div class="choix-liste">${metiers.map(x => `<label class="cb"><input type="checkbox" data-envoi-metier="${x.id}" checked> ${esc(x.t)} <small class="mu">(${b.postes.filter(p => x.f(p.k) && p.QL > 0).length} poste${b.postes.filter(p => x.f(p.k) && p.QL > 0).length > 1 ? "s" : ""})</small></label>`).join("")}</div>
    <p class="mu petit-t">Chaque artisan reçoit les travaux de son métier, le budget estimé et les photos des pièces concernées. Vos coordonnées ne sont transmises que si vous acceptez son devis.</p>
    <span class="actions-g"><button class="btn" data-action="envoi-ok">Envoyer</button><button class="btn lien" data-action="envoi-annuler">Annuler</button></span></section>`;
}

/* ---------- carte « Performance énergétique (PEB) » ---------- */
function carteEnergie(m, b) {
  const e = travauxEnergie(b), oblig = projetDe(m) === "achat" && concerneParObligation(m.peb);
  const grp = [...new Set(e.postes.map(p => p.groupe))].map(g => [g, e.postes.filter(p => p.groupe === g).reduce((s, p) => s + p.total[1], 0)]);
  return `<section class="carte energie">
    <div class="en-tete"><h2>Performance énergétique (PEB)</h2>${pebBadge(m.peb, true)}</div>
    <div class="champs">
      <label>Label du certificat PEB<select data-peb="peb"><option value="">Je ne sais pas</option>${LABELS_PEB.map(l => `<option ${m.peb === l ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label>Consommation (kWh/m²/an)<input type="number" min="0" inputmode="numeric" data-peb="pebConso" value="${esc(m.pebConso ?? "")}" placeholder="sur le certificat"></label>
    </div>
    ${!m.peb ? `<p class="mu petit-t">Le certificat PEB est obligatoire dans les annonces de vente en Wallonie : demandez-le à l'agence ou au vendeur.</p>` : ""}
    ${oblig ? `<div class="alerte peb-alerte"><b>⚠️ Obligation de rénovation annoncée</b>
      <p>Pour un logement classé ${OBLIGATION_PEB.labels.join(", ")} acheté à partir de ${OBLIGATION_PEB.aPartirDe}, l'acheteur devrait atteindre au moins le label <b>${OBLIGATION_PEB.cible}</b> dans les <b>${OBLIGATION_PEB.delaiAns} ans</b> après l'acte.</p>
      <small>${esc(OBLIGATION_PEB.statut)}</small></div>` : ""}
    <h3>Travaux de cette maison qui améliorent le PEB</h3>
    ${e.postes.length ? `<div class="recap recap-en">${grp.map(([g, t]) => `<div><span>${esc(g)}</span><b>${euros(t, 10)}</b></div>`).join("")}
      <div class="tot-en"><span>Total des travaux énergétiques (moyen)</span><b>${euros(e.total[1], 100)}</b></div></div>`
      : `<p class="mu">Aucun pour l'instant : isolation (toiture, façades), châssis, porte d'entrée, chauffage.${oblig ? " Avec ce label, ils seront sans doute nécessaires." : ""}</p>`}
    ${["F", "G"].includes(m.peb) ? `<p class="mu petit-t">Logement à faible label PEB : les aides wallonnes à la rénovation (Rénopack) visent ces logements. Conditions à vérifier.</p>` : ""}
    <p class="mu petit-t">Valou ne calcule pas le label obtenu après travaux : seul un auditeur agréé peut le faire (audit logement). Il dira aussi quels travaux faire en premier.</p>
  </section>`;
}

/* ---------- écran : le vrai coût d'une maison (en 5 onglets) ---------- */
const ONGLETS_M = [["pieces", "Espaces"], ["travaux", "Technique"], ["artisans", "Les pros"], ["projet", "Projet"]];
const ONGLETS_R = ONGLETS_M;
const ongletsDe = m => (projetDe(m) === "renovation" ? ONGLETS_R : ONGLETS_M);
const ongletsM = {}; // onglet ouvert, par maison
const ongletMaison = m => (ongletsDe(m).some(([id]) => id === ongletsM[m.id]) ? ongletsM[m.id] : "pieces");
/* groupes de postes et réglages ouverts par l'utilisateur (fermés par défaut) */
const ouverts = new Set();
document.addEventListener("toggle", e => { const d = e.target; if (d.dataset && d.dataset.ouvert) d.open ? ouverts.add(d.dataset.ouvert) : ouverts.delete(d.dataset.ouvert); }, true);
function ecranMaison(m) {
  const b = calculerBudget(R, m), c = coutTotal(m, b);
  const cO = projetDe(m) === "achat" && +m.offre > 0 ? coutTotal({ ...m, prix: +m.offre }, b) : c; // simulation d'une offre
  const surcout = c.total[1] - c.prix, pct = c.prix ? Math.round((surcout / c.prix) * 100) : 0;
  const manques = b.postes.filter(p => p.manques.length);

  /* barre de composition du coût (valeurs moyennes) */
  const reno = projetDe(m) === "renovation";
  const parts = (reno
    ? [["Matériaux (HTVA)", b.MAT[1], "p1"], ["Main-d'œuvre (HTVA)", b.MO[1], "p2"], ["TVA", b.TVA[1], "p3"], [`Imprévus (${b.pi} %)${b.ANN[1] ? " et container" : ""}`, b.IM[1] + b.ANN[1], "p4"]]
    : [["Prix d'achat", c.prix, "p1"], ["Droits d'enregistrement", c.droits, "p2"], ["Notaire", c.notaire || 0, "p3"], ["Travaux (TVA et imprévus compris)", c.travaux[1], "p4"]]).filter(x => x[1] > 0);
  const somme = parts.reduce((s, x) => s + x[1], 0) || 1;
  const barre = `<div class="barre" role="img" aria-label="Composition du coût">${parts.map(([t, v, k]) => `<span class="${k}" style="width:${(v / somme) * 100}%" title="${esc(t)} : ${euros(v)}"></span>`).join("")}</div>
    <ul class="legende">${parts.map(([t, v, k]) => `<li><i class="${k}"></i>${esc(t)}<b>${euros(v, k === "p4" ? 100 : 1)}</b></li>`).join("")}${!reno && c.notaire == null ? `<li><i class="p3"></i>Notaire<b class="manque">à compléter</b></li>` : ""}</ul>`;

  /* budget travaux par groupe */
  const parG = {};
  b.postes.forEach(p => (parG[groupe(p)] = parG[groupe(p)] || []).push(p));
  const lignesG = GROUPES.filter(g => parG[g]).map(g => {
    const L = parG[g], t = L.reduce((s, p) => [s[0] + p.total[0], s[1] + p.total[1], s[2] + p.total[2]], [0, 0, 0]);
    return `<details class="grp"><summary><span>${esc(g)}</span><span class="r">${euros(t[1], 100)}</span></summary>
      ${L.map(p => `<details class="poste"><summary><span>${esc(p.n)} <small class="mu">${esc(qte(p.Q, p.u))}</small></span><span class="r">${badge(p.fiab)} ${euros(p.total[1], 10)}</span></summary>${detailPoste(p, b)}</details>`).join("")}
    </details>`;
  }).join("");

  /* hypothèses */
  const hyp = b.hypo.map(h => {
    const H = HYPOTHESES[h];
    return `<label>${esc(H.t)}<select data-h="${h}">${H.o.map(([v, t]) => `<option value="${v}" ${b.rep[h] === v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
  }).join("");

  /* les pièces (cartes) */
  const parPiece = id => b.lignes.filter(l => l.pieceId === id);
  const cartesPieces = (m.pieces || []).map(pc => {
    const L = parPiece(pc.id), t = L.reduce((s, l) => s + (l.fiab ? l.total[1] : 0), 0);
    return `<div class="carte-piece" style="${stylePiece(m, pc)}"><a href="#/maison/${m.id}/piece/${pc.id}">
        <span class="pc-ico">${iconePiece(pc)}</span><b>${esc(pc.nom)}</b>
        <small class="mu">${pc.sol ? `${String(pc.sol).replace(".", ",")} m²` : "surface à remplir"}</small>
        <small class="pc-res">${esc(resumePiece(pc)) || "Rien de coché : touchez pour choisir les travaux"}</small>
        <span class="pc-bud">${t ? euros(t, 10) : "–"}</span>${(n => (n ? `<small class="pc-photos">📷 ${n}</small>` : ""))(photosDe(m).filter(p => memeNom(p.nomPiece, pc.nom)).length)}</a>
      <button class="x" data-action="suppr-piece" data-id="${pc.id}" aria-label="Supprimer ${esc(pc.nom)}">✕</button></div>`;
  }).join("");

  /* toute la maison : liste fixe des postes (on remplit seulement les quantités) */
  const horsPieces = b.lignes.filter(l => !l.pieceId && l.src !== "chauffage");
  const ligneDe = k => horsPieces.find(l => l.k === k);
  const fixes = R.liste.filter(p => !POSTES_PIECES.test(p.k));
  const rt = calcToiture(m), rf = calcFacades(m);
  const grpFixes = [...new Set(fixes.map(groupe))].sort((x, y) => GROUPES.indexOf(x) - GROUPES.indexOf(y)).map(g => {
    const P = fixes.filter(p => groupe(p) === g), rempli = P.filter(p => ligneDe(p.k)), t = rempli.reduce((s, p) => s + (ligneDe(p.k).fiab ? ligneDe(p.k).total[1] : 0), 0);
    return `<details class="grp fixe" data-ouvert="${m.id}:${esc(g)}" ${ouverts.has(`${m.id}:${g}`) ? "open" : ""}><summary><span>${esc(g)} ${rempli.length ? `<small class="mu">· ${rempli.length} poste${rempli.length > 1 ? "s" : ""}</small>` : ""}</span><span class="r">${t ? euros(t, 10) : ""}</span></summary>
      <table class="fixes">${P.map(p => { const l = ligneDe(p.k); return `<tr>
        <td>${esc(p.n)}</td>
        <td class="q">${/escalier/.test(p.u)
          ? `<input type="number" min="0" step="1" inputmode="numeric" data-mmarches="${p.k}" value="${esc(l ? (l.marches ?? l.q * MARCHES_PAR_ESCALIER) : "")}" placeholder="0" aria-label="Nombre de marches : ${esc(p.n)}"><small>marches</small><small class="mu bloc">${MARCHES_PAR_ESCALIER} marches = 1 escalier</small>`
          : `<input type="number" min="0" step="any" inputmode="decimal" data-mq="${p.k}" value="${esc(l ? l.q : "")}" placeholder="0" aria-label="Quantité : ${esc(p.n)}"><small>${esc(unitePoste(p.u, p.k))}</small>${(() => { const v = /^i_fa_\d$/.test(p.k) ? rf && rf.surf : rt && (POSTES_TOIT_M2.test(p.k) ? rt.surf : p.k === "i_to_0" ? rt.combles : p.k === "i_zi" ? rt.goutt : 0); return v && (!l || +l.q !== v) ? `<button type="button" class="toit-q" data-action="toit-q" data-k="${p.k}" data-q="${v}" title="Reprendre la mesure calculée">= ${nombre(v)}</button>` : ""; })()}`}</td>
        <td class="c"><label class="mm"><input type="checkbox" data-mme="${p.k}" ${l && l.soiMeme ? "checked" : ""} ${l ? "" : "disabled"}> moi-même</label></td>
        <td class="r">${l && l.fiab ? euros(l.total[1], 10) : ""}</td></tr>`; }).join("")}</table></details>`;
  }).join("");


  /* chauffage */
  const chf = travauxChauffage(m.chauffage, m.surface);

  return `${entete("maisons")}
  <main>
    <a href="#/" class="retour">← Mes maisons</a>
    <div class="titre-maison">
      <h1>${esc(m.nom || "Maison")}</h1>
      ${pebBadge(m.peb, true)}
      ${m.exemple ? `<span class="badge b-exemple">Fictive</span>` : ""}
      ${m.description ? `<p class="desc">${esc(m.description)}</p>` : ""}
      <p class="mu">${[m.commune, m.annee && `construite en ${m.annee}`, txtFacades(m), txtEtages(m), m.toiture && nomToit(m.toiture).toLowerCase().replace(/^/, "toit : "), m.surface && `${nombre(m.surface)} m² habitables`].filter(Boolean).map(esc).join(" · ")}</p>
    </div>

    <button class="vc-mini" data-action="onglet-m" data-o="projet"><span>${reno ? "Budget de la rénovation" : "Vrai coût de cette maison"}</span><b>${euros(c.total[1], 100)}</b><small>${c.travaux[1] ? "" : `<i class="vc-alerte">⚠️ sans les travaux</i> `}voir Projet ›</small></button>

    <nav class="onglets-m" aria-label="Parties de la fiche">${ongletsDe(m).map(([id, t]) => `<button class="om-i ${ongletMaison(m) === id ? "on" : ""}" data-action="onglet-m" data-o="${id}"${ongletMaison(m) === id ? ' aria-current="true"' : ""}>${t}${id === "pieces" && (m.pieces || []).length ? ` <small>${m.pieces.length}</small>` : ""}</button>`).join("")}</nav>
    ${(() => {
      const o = ongletMaison(m);
      const suivant = (id, t) => `<p class="suite-m"><button class="btn sec" data-action="onglet-m" data-o="${id}">${t} →</button></p>`;
      if (o === "travaux") return `
    ${manques.length ? `<section class="alerte"><b>${manques.length} poste${manques.length > 1 ? "s" : ""} incomplet${manques.length > 1 ? "s" : ""} : un prix manque, il n'est pas compté.</b>
      <ul>${manques.map(p => `<li>${esc(p.n)} : ${p.manques.map(esc).join(" ; ")}</li>`).join("")}</ul></section>` : ""}

    <section class="carte">
      <h2>Le chauffage</h2>
      ${blocChauffage(m.chauffage, "data-mchf", (m.pieces || []).length > 0)}
      ${chf.notes.map(t => `<p class="mu petit-t">• ${esc(t)}</p>`).join("")}
      ${b.lignes.filter(l => l.src === "chauffage").map(l => `<div class="ligne"><span>${esc(R.postes[l.k].n)} ${l.q > 1 ? `× ${nombre(l.q)}` : ""}</span><b>${l.fiab ? euros(l.total[1], 10) : ""}</b></div>`).join("")}
      ${(m.pieces || []).length ? `<p class="mu petit-t">Radiateurs et chauffage au sol : à remplir dans chaque pièce.${chf.rad === "nouv" ? " Ils sont comptés en nouveau raccordement (pas de chauffage existant)." : ""}</p>` : ""}
    </section>

    ${blocDimensions(m)}

    ${blocToiture(m)}

    ${blocGrosTravaux(m)}

    <section class="carte">
      <h2>Structure, toiture et équipements</h2>
      <p class="mu">Toiture, façade, isolation, électricité, menuiseries, gros œuvre, extérieurs et escalier : les travaux qui ne se rattachent pas à une pièce. Remplissez seulement les quantités des postes à prévoir ; un poste vide n'est pas compté.</p>
      ${grpFixes}
    </section>

        <details class="carte reglages" data-ouvert="${m.id}:reglages" ${ouverts.has(`${m.id}:reglages`) ? "open" : ""}>
          <summary><h2>⚙️ Réglages du calcul</h2><small class="mu">TVA, pose, container, état du support</small></summary>
          <div class="champs">
            <div class="ligne"><span>TVA sur les travaux par un artisan</span><b>${b.rate} %</b></div>
            <small class="mu">${b.rate === 6 ? "6 % : logement de plus de 10 ans, rénovation facturée par l'entrepreneur (conditions à vérifier avec lui)." : "21 % : logement de moins de 10 ans."}</small>
            ${hyp}
          </div>
        </details>
      ${suivant("artisans", "Suivant : Les pros")}`;
      if (o === "artisans") return `
    <section class="carte choisir-art"><h2>Choisir vos artisans</h2>
      <p class="mu">Pour chaque métier : le projet propre à ce métier (les pièces et les postes à envoyer, le matériau souhaité), puis jusqu'à 3 artisans à qui l'envoyer.</p>
      <span class="actions-g"><a class="btn" href="#/contacts/${m.id}">👷 Choisir les artisans →</a><a class="btn sec" href="#/contacts/${m.id}#devis">📩 Devis reçus${devisRecus(m).length ? ` <span class="pastille">${devisRecus(m).length}</span>` : " (0)"}</a></span></section>
    ${blocCourtier(m, cO)}

    <section class="carte negs"><h2>Négociants de votre région</h2>
      <p class="mu">Pour vos matériaux : touchez un négociant pour voir ce qu'il vend, ses coordonnées et ses horaires.</p>
      ${listeNegociants(m, b)}</section>

    ${panneauEnvoi(m, b)}`;
      if (o === "projet") return `
    <section class="carte vrai-cout">
      <div class="vc-g">
        <small>${reno ? "Le budget de votre rénovation" : "Le vrai coût de cette maison"}</small>
        <div class="gros">${euros(c.total[1], 100)}</div>
        ${c.total[0] !== c.total[2] ? `<div class="mu">entre ${fourchette(c.total)}</div>` : ""}
        ${c.travaux[1] ? "" : `<p class="sans-trav">⚠️ Travaux pas encore encodés : ce montant ${reno ? "est vide" : "ne compte que le prix, les droits et le notaire"}. Ajoutez les pièces (onglet Espaces) et les gros travaux (onglet Technique).</p>`}
        ${reno ? (e => (e ? `<p class="choc">dont <b>${euros(e, 100)}</b> de travaux qui améliorent le PEB</p>` : ""))(travauxEnergie(b).total[1]) : ""}
        ${!reno && c.prix && c.travaux[1] ? `<p class="choc">soit <b>${euros(surcout, 100)}</b> de plus que le prix affiché <span>(+${pct} %)</span></p>` : ""}
      </div>
      <div class="vc-d">${barre}</div>
    </section>

    ${carteEnergie(m, b)}
    ${manques.length ? `<section class="alerte"><b>${manques.length} poste${manques.length > 1 ? "s" : ""} incomplet${manques.length > 1 ? "s" : ""} : un prix manque, il n'est pas compté.</b>
      <ul>${manques.map(p => `<li>${esc(p.n)} : ${p.manques.map(esc).join(" ; ")}</li>`).join("")}</ul></section>` : ""}

      <section class="carte">
        <h2>Budget travaux</h2>
        <div class="trois"><div><small>Bas</small><b>${euros(b.T[0], 100)}</b></div><div class="moy"><small>Moyen</small><b>${euros(b.T[1], 100)}</b></div><div><small>Haut</small><b>${euros(b.T[2], 100)}</b></div></div>
        <div class="recap">
          <div><span>Matériaux (HTVA)</span><b>${euros(b.MAT[1])}</b></div>
          <div><span>Main-d'œuvre (HTVA)</span><b>${euros(b.MO[1])}</b></div>
          <div><span>TVA (${b.rate} % artisans, 21 % magasin)</span><b>${euros(b.TVA[1])}</b></div>
          ${b.ANN[1] ? `<div><span>Container à gravats</span><b>${euros(b.ANN[1])}</b></div>` : ""}
          <div><span>Imprévus (${b.pi} %)</span><b>${euros(b.IM[1])}</b></div>
        </div>
        ${lignesG || `<p class="mu">Aucun travail encodé.</p>`}
        ${lignesG ? `<details class="legende-d"><summary>Que veulent dire les étiquettes ?</summary><p class="legende-f">${Object.keys(FIABILITE).map(f => `${badge(f)} <small class="mu">${esc(FIABILITE[f].d)}</small>`).join("<br>")}</p></details>` : ""}
      </section>

    ${reno ? blocFinancerRenovation(m, b, c) : `<div class="fin-page">
        <section class="carte sim-achat">
          <h2>Simulation d'achat</h2>
          <div class="champs">
            <div class="ligne"><span>Prix demandé</span><b>${euros(m.prix)}</b></div>
            <label>Simuler une offre (€)<input type="number" min="0" step="1000" inputmode="numeric" data-f="offre" value="${esc(m.offre ?? "")}" placeholder="${esc(m.prix)}"></label>
            <label class="cb large"><input type="checkbox" data-f="uniqueHabitation" ${m.uniqueHabitation !== false ? "checked" : ""}> Seule habitation, occupée par moi</label>
          </div>
          ${(() => {
            /* comparaison : prix demandé (initial) ↔ offre simulée, ligne par ligne */
            const o = +m.offre > 0 && +m.offre !== +m.prix, nc = x => x.notaireCalcul ? euros(x.notaireCalcul.total) : `<span class="manque">à compléter</span>`;
            const L = (t, a, b2, cl = "") => `<tr class="${cl}"><th>${t}</th><td>${a}</td>${o ? `<td>${b2}</td>` : ""}</tr>`;
            const ec = cO.total[1] - c.total[1];
            return `<div class="sim-cmp-cadre"><table class="sim-cmp sim-recap">
              <thead><tr><th></th><td>Prix demandé</td>${o ? `<td class="sim-o">Votre offre</td>` : ""}</tr></thead>
              <tbody>
                ${L("Prix", euros(c.prix), euros(cO.prix))}
                ${L(`Droits d'enregistrement (${String(c.tauxDroits).replace(".", ",")}&nbsp;%)`, euros(c.droits), euros(cO.droits))}
                ${L("Frais de notaire", nc(c), nc(cO))}
                ${L("Travaux (TVA et imprévus)", euros(c.travaux[1], 100), euros(cO.travaux[1], 100))}
                ${L("Total", `<b>${euros(c.total[1], 100)}</b>`, `<b>${euros(cO.total[1], 100)}</b>`, "sim-tot")}
              </tbody></table></div>
              ${o ? `<p class="sim-ecart">Avec votre offre : <b>${euros(Math.abs(ec), 100)} de ${ec < 0 ? "moins" : "plus"}</b> qu'au prix demandé (droits et notaire recalculés).</p>` : `<p class="mu petit-t">Tapez une offre : elle s'affiche à côté du prix demandé pour comparer.</p>`}
              ${cO.notaireCalcul ? `<details class="notaire"><summary><span>Détail des frais de notaire${o ? " (avec votre offre)" : ""}</span><b>${euros(cO.notaireCalcul.total)}</b></summary>
              <div class="ligne"><span>Honoraires</span><span>${euros2(cO.notaireCalcul.honoraires)}</span></div>
              <div class="ligne"><span>Frais administratifs</span><span>${euros2(cO.notaireCalcul.detail.administratifs)}</span></div>
              <div class="ligne"><span>Débours</span><span>${euros2(cO.notaireCalcul.detail.debours)}</span></div>
              <div class="ligne"><span>Transcription hypothécaire</span><span>${euros2(cO.notaireCalcul.detail.transcription)}</span></div>
              <div class="ligne"><span>Droit pour les annexes et droit d'écriture</span><span>${euros2(cO.notaireCalcul.detail.annexes + cO.notaireCalcul.detail.ecriture)}</span></div>
              <div class="ligne"><span>TVA 21 %</span><span>${euros2(cO.notaireCalcul.tva)}</span></div>
            </details>` : ""}`;
          })()}
          <small class="mu">Droits : taux légal wallon. Notaire : calcul d'après le ${esc((cO.notaireCalcul || {}).source || "simulateur notaire.be")}. À confirmer par le notaire. L'acte de crédit a ses propres frais (pas encore comptés).</small>
          <details class="corriger"><summary>Corriger le prix demandé</summary><label>Prix demandé (€)<input type="number" min="0" inputmode="numeric" data-f="prix" value="${esc(m.prix)}"></label></details>
        </section>
        ${(() => {
          /* le financement : mêmes valeurs que le dossier pour la banque */
          const tp = travauxPret(m, b, cO.travaux[1]);
          const f = m.fin || {}, apport = +f.apport || 0, emprunt = Math.max(0, cO.total[1] - tp.hors - apport), mens = mensualite(emprunt, f.taux, f.duree);
          const ch = (k, t, suf, ph) => `<label>${t}<span class="saisie"><input type="number" min="0" step="any" inputmode="decimal" data-fin="${k}" value="${esc(f[k] ?? "")}" placeholder="${ph}"><i>${suf}</i></span></label>`;
          return `<section class="carte">
          <h2>Simulation de financement</h2>
          <div class="champs">
            ${blocTravauxPret(m, tp)}
            ${ch("apport", "Apport personnel", "€", "ex. 40000")}
            <div class="ligne"><span>Montant à emprunter</span><b>${euros(emprunt, 100)}</b></div>
            <small class="mu">Coût total ${m.offre ? "avec votre offre" : "au prix demandé"} ${euros(cO.total[1], 100)}${tp.hors ? ` − travaux hors prêt ${euros(tp.hors, 100)}` : ""} − apport${apport ? "" : " (à compléter)"}.</small>
            ${ch("taux", "Taux annuel du crédit (si vous l'avez)", "%", "taux de la banque")}
            ${ch("duree", "Durée du crédit", "ans", "ex. 25")}
            ${mens ? `<div class="ligne"><span>Mensualité estimée (hors assurance)</span><b>${euros(mens)} / mois</b></div>` : ""}
            <small class="mu">Ces valeurs sont reprises dans le dossier bancaire.</small>
          </div>
        </section>`;
        })()}
        ${aides()}
    </div>
    <div class="actions">
      <span class="actions-g"><a class="btn" href="#/dossier/${m.id}">Dossier pour la banque →</a></span>
      <button class="btn lien" data-action="suppr-demande" data-id="${m.id}">🗑 Supprimer cette maison</button>
    </div>
`}`;
      return `
    <section class="carte">
      <h2>Les espaces</h2>
      <p class="mu">Ajoutez les pièces dans l'ordre de la visite, puis ouvrez-les pour remplir le sol, les murs, le plafond, les châssis et le chauffage. Les murs sont calculés automatiquement (sol × ${String(RATIO_MURS).replace(".", ",")}) et le plafond = sol.</p>
      <p>${boutonPhotosMaison(m)}</p>
      <p><a class="btn sec" href="#/maison/${m.id}/questionnaire">📝 Photo du questionnaire</a></p>
      <div class="grille-pieces">${cartesPieces}</div>
      <div class="ajout-piece">
        <input id="np-nom" placeholder="Nom de la pièce (ex. Chambre 3)" aria-label="Nom de la nouvelle pièce">
        <select id="np-type" aria-label="Type de pièce">${TYPES_PIECE.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join("")}</select>
        <button class="btn sec" data-action="ajout-piece">＋ Ajouter une pièce</button>
      </div>
    </section>

      ${suivant("travaux", "Suivant : Technique")}`;
    })()}
  </main>`;
}

/* ---------- pièces : icône, résumé, écran d'une pièce ---------- */
/* une couleur par pièce : fond doux + bord marqué (gardée quand on supprime une autre pièce) */
const COULEURS = [["#FDEBDC", "#EC8224"], ["#E1F0E7", "#3E8E66"], ["#E4EBF7", "#4C72B0"], ["#F7E1E7", "#C0587A"], ["#ECE4F5", "#7B5EA7"],
  ["#DFF1F0", "#2F8F8A"], ["#FFF4D1", "#C29A0C"], ["#EAEFD9", "#7D8F36"], ["#F3DEDA", "#A8503F"], ["#E2E8EC", "#5C7080"]];
const couleurPiece = (m, pc) => COULEURS[(pc.c ?? Math.max(0, (m.pieces || []).indexOf(pc))) % COULEURS.length];
const stylePiece = (m, pc) => { const [f, a] = couleurPiece(m, pc); return `--pc-fond:${f};--pc-acc:${a}`; };
const iconePiece = pc => (TYPES_PIECE.find(t => t[0] === pc.type) || TYPES_PIECE[0])[2];
function resumePiece(pc) {
  const x = [];
  if (pc.sOn) x.push("Sol");
  if (MURS.some(([f]) => pc[f])) x.push("Murs");
  if (pc.pOn) x.push("Plafond");
  if (pc.chOn && +pc.chN) x.push(`${pc.chN} châssis`);
  if (pc.hc === "ra" && pc.hr && +pc.hn) x.push(`${pc.hn} radiateur${pc.hn > 1 ? "s" : ""}`);
  if (pc.hc === "sol" && pc.hr) x.push("Chauffage au sol");
  if (pc.meu) x.push(pc.type === "sdb" ? "Salle de bain équipée" : "Cuisine équipée");
  if (pc.type === "wc" && (pc.wi || []).length) x.push(`${pc.wi.length} équipement${pc.wi.length > 1 ? "s" : ""} WC`);
  if (pc.type === "garage" && +pc.pg) x.push(`${pc.pg} porte${pc.pg > 1 ? "s" : ""} de garage`);
  return x.join(" · ");
}

function corpsPiece(m, pc) {
  const b = calculerBudget(R, m), L = b.lignes.filter(l => l.pieceId === pc.id);
  const bud = sec => { const t = L.filter(l => l.sec === sec).reduce((s, l) => s + (l.fiab ? l.total[1] : 0), 0); return t ? `<span class="rb-bud">${euros(t, 10)}</span>` : ""; };
  const fiab = sec => { const l = L.find(x => x.sec === sec); return l ? badge(l.fiab) : ""; };
  const cb = (f, t) => `<label class="cb"><input type="checkbox" data-pc="${f}" ${pc[f] ? "checked" : ""}> ${t}</label>`;
  const sel = (f, L2) => `<select data-pc="${f}">${L2.map(([v, t]) => `<option value="${v}" ${(pc[f] || L2[0][0]) === v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
  const num = (f, t, ph = "") => `<label>${t}<input type="number" min="0" step="any" inputmode="decimal" data-pc="${f}" value="${esc(pc[f] ?? "")}" placeholder="${esc(ph)}"></label>`;
  const sol = +pc.sol || 0, murs = mursPiece(pc);
  const rub = (ico, t, sec, corps) => `<section class="carte rubrique"><div class="rb-tete"><span class="rb-ico">${ico}</span><h2>${t}</h2>${fiab(sec)}${bud(sec)}</div>${corps}</section>`;
  return `
    <section class="carte"><div class="champs">
      <label>Nom de la pièce<input data-pc="nom" value="${esc(pc.nom)}"></label>
      <label>Type de pièce${sel("type", TYPES_PIECE.map(([v, t]) => [v, t]))}</label>
      ${num("sol", "Surface au sol (m²)", "ex. 15")}
    </div></section>

    ${rub("🟫", "Sol", "sol", `${cb("sOn", "Sol à refaire")}${pc.sOn ? `<div class="champs">
      <label>Revêtement${sel("sT", SOLS)}</label>
      <div class="ligne-q"><span>Surface</span><b>${String(sol).replace(".", ",")} m²</b><small class="mu">= sol de la pièce</small></div>
    </div>${cb("sMe", "Je le fais moi-même")}` : ""}`)}

    ${rub("🧱", "Murs", "murs", `<div class="champs">
      <label>Surface des murs (m²)<input type="number" min="0" step="any" inputmode="decimal" data-pc="murs" value="${esc(pc.murs ?? "")}" placeholder="${String(murs).replace(".", ",")}"><small class="mu">${pc.murs != null && pc.murs !== "" ? "surface mesurée" : `calculée : sol × ${String(RATIO_MURS).replace(".", ",")}`}</small></label>
    </div>
    ${MURS.map(([f, t]) => cb(f, t)).join("")}
    ${pc.mca ? `<div class="champs">${num("mcaM2", "Surface de carrelage mural (m²)", String(murs).replace(".", ","))}</div>` : ""}
    ${MURS.some(([f]) => pc[f]) ? cb("mMe", "Je le fais moi-même") : ""}`)}

    ${rub("☁️", "Plafond", "plafond", `${cb("pOn", "Plafond à refaire")}${pc.pOn ? `<div class="champs">
      <label>Travail${sel("pT", PLAFONDS)}</label>
      <div class="ligne-q"><span>Surface</span><b>${String(sol).replace(".", ",")} m²</b><small class="mu">= sol de la pièce</small></div>
    </div>${cb("pMe", "Je le fais moi-même")}` : ""}`)}

    ${pc.type !== "wc" && pc.type !== "garage" ? rub("🪟", "Châssis", "chassis", `${cb("chOn", "Châssis à remplacer")}${pc.chOn ? `<div class="champs">${num("chN", "Nombre de châssis", "ex. 2")}<label>Type de châssis${sel("chT", CHASSIS)}</label></div>` : ""}`) : ""}

    ${pc.type !== "garage" ? rub("🔥", "Chauffage", "chauffage", `<div class="champs"><label>Dans cette pièce${sel("hc", [["", "Aucun"], ["ra", "Radiateurs"], ["sol", "Chauffage au sol"]])}</label></div>
      ${pc.hc ? cb("hr", pc.hc === "ra" ? "Radiateurs à remplacer ou à poser" : "Chauffage au sol à poser") : ""}
      ${pc.hc === "ra" && pc.hr ? `<div class="champs">${num("hn", "Nombre de radiateurs", "ex. 1")}</div>` : ""}
      ${pc.hc === "sol" && pc.hr ? `<div class="ligne-q"><span>Surface chauffée</span><b>${String(sol).replace(".", ",")} m²</b><small class="mu">= sol de la pièce</small></div>` : ""}`) : ""}

    ${pc.type === "cuisine" ? rub("🍳", "Cuisine équipée", "equipe", cb("meu", "Remplacer la cuisine équipée")) : ""}
    ${pc.type === "sdb" ? rub("🛁", "Salle de bain équipée", "equipe", cb("meu", "Remplacer la salle de bain équipée")) : ""}
    ${pc.type === "wc" ? rub("🚽", "Équipements du WC", "wc", WC.map(([f, t]) => `<label class="cb"><input type="checkbox" data-pcwi="${f}" ${(pc.wi || []).includes(f) ? "checked" : ""}> ${t}</label>`).join("")) : ""}
    ${pc.type === "garage" ? rub("🚪", "Porte de garage", "garage", `<div class="champs">${num("pg", "Nombre de portes de garage", "ex. 1")}</div>`) : ""}

    ${(() => {
      const P = photosDe(m).filter(p => memeNom(p.nomPiece, pc.nom));
      return `<section class="carte rubrique"><div class="rb-tete"><span class="rb-ico">📷</span><h2>Photos</h2><small class="mu">${P.length ? `${P.length} photo${P.length > 1 ? "s" : ""}` : "aucune photo"}</small></div>
        ${P.length ? `<div class="galerie">${P.map(p => vignette(m, p)).join("")}</div>` : ""}
        <p>${boutonPhoto(`📷 Ajouter une photo de « ${esc(pc.nom)} »`, pc.nom)}</p></section>`;
    })()}

`;
}

function ecranPiece(m, pc) {
  ongletsM[m.id] = "pieces"; // au retour, la fiche s'ouvre sur l'onglet Pièces
  const b = calculerBudget(R, m), L = b.lignes.filter(l => l.pieceId === pc.id);
  const total = L.reduce((s, l) => s + (l.fiab ? l.total[1] : 0), 0);
  return `${entete("maisons")}
  <main class="etroit piece-ecran" style="${stylePiece(m, pc)}">
    <a href="#/maison/${m.id}" class="retour">← ${esc(m.nom || "La maison")}</a>
    <div class="titre-piece"><span class="pc-ico grand">${iconePiece(pc)}</span><div><h1>${esc(pc.nom)}</h1><p class="mu">Budget de la pièce : <b>${euros(total, 10)}</b> (TVA comprise, hors imprévus)</p></div></div>
    ${total ? "" : `<p class="consigne">👇 Tapez la surface au sol, puis <b>cochez ce qui est à refaire</b> (sol, murs, plafond, châssis…) : le budget de la pièce se calcule tout de suite.</p>`}
    ${corpsPiece(m, pc)}
    <p><a class="btn" href="#/maison/${m.id}">✓ Pièce terminée</a></p>
  </main>`;
}

function detailPoste(p, b) {
  const art = p.articles.map(a => `<tr><td>${esc(a.id)} ${esc(a.n)}${a.promo ? " <small class='mu'>(prix promo)</small>" : ""}${a.defaut ? " <small class='mu'>(prix magasin, à défaut du prix négociant)</small>" : ""}</td>
    <td class="r">${a.nb != null ? `${nombre(a.nb)} × ${esc(a.cond)}` : `${a.besoin.toFixed(2).replace(".", ",")} ${esc(a.unite)}`}</td><td class="r">${euros2(a.tot)}</td></tr>`).join("");
  const mo = p.main && p.QL > 0 ? `<tr><td>${esc(p.main.id)} ${esc(p.main.n)}${p.main.e ? ` <small class='mu'>(${p.main.e === 1 ? "tarif estimé" : "tarif à vérifier"})</small>` : ""}</td><td class="r">${nombre(p.QL)} ${esc(p.u)} × ${euros2(p.main.m)}</td><td class="r">${euros2(p.mo[1])}</td></tr>` : "";
  const fbMo = p.moFourchette && p.QL > 0 ? `<tr><td>Main-d'œuvre (fourchette Valou)</td><td></td><td class="r">${euros2(p.mo[1])}</td></tr>` : "";
  const fbMat = p.matFourchette ? `<tr><td>Matériel (fourchette Valou)</td><td></td><td class="r">${euros2(p.mat[1])}</td></tr>` : "";
  const fb = p.mode === "fourchette" ? `<tr><td>Matériel (fourchette Valou)</td><td></td><td class="r">${euros2(p.mat[1])}</td></tr>${p.QL > 0 ? `<tr><td>Main-d'œuvre (fourchette Valou)</td><td></td><td class="r">${euros2(p.mo[1])}</td></tr>` : ""}` : "";
  return `<div class="det"><table>${art}${fbMat}${mo}${fbMo}${fb}<tr class="tva"><td>TVA</td><td></td><td class="r">${euros2(p.tva[1])}</td></tr></table>
    ${[...p.notes, ...p.manques].map(t => `<small class="mu">• ${esc(t)}</small>`).join("<br>")}</div>`;
}

function aides() {
  const A = R.aides;
  if (!A || !A.aides || !A.aides.length) return "";
  return `<section class="carte">
    <h2>Aides à la rénovation</h2>
    ${A.aides.map(a => `<p><b>${esc(a.nom)}</b><br><small class="mu">${esc(a.conditions)}</small></p>`).join("")}
    <small class="mu">Informations au ${esc(new Date(A.date).toLocaleDateString("fr-BE"))}, montants non confirmés : à vérifier sur <a href="${esc(A.aides[0].source)}" target="_blank" rel="noopener">wallonie.be</a>. Non déduites du budget.</small>
  </section>`;
}

/* ---------- écran : comparer ---------- */
let selection = null; // identifiants des maisons comparées (3 au plus)
let metier = "general"; // métier choisi sur l'écran artisan
let sim = { k: "sol_carrelage", n: 25 }; // simulation des prix locaux (Notre moteur)
let tarifs = (() => { try { return JSON.parse(localStorage.getItem(cle("valou_demo_tarifs")) || "null") || { p: {} }; } catch (e) { return { p: {} }; } })();
let prixNeg = (() => { try { return JSON.parse(localStorage.getItem(cle("valou_demo_prixneg")) || "null") || {}; } catch (e) { return {}; } })();
let negOrigine = null;
/* prix du négociant (démonstration) : utilisés comme prix négociant dans le moteur */
function appliquerPrixNeg() {
  if (!R) return;
  if (!negOrigine) negOrigine = { ...R.px.neg };
  R.px.neg = { ...negOrigine };
  Object.entries(prixNeg).forEach(([id, p]) => { R.px.neg[id] = { ...(negOrigine[id] || {}), p, s: "Votre négoce (démo)" }; });
  try { localStorage.setItem(cle("valou_demo_prixneg"), JSON.stringify(prixNeg)); } catch (e) {}
}
let envoiOuvert = null;
/* fiche du négociant et annonce de l'agence (démonstration, gardées sur cet appareil) */
const FICHE_EXEMPLE = { nom: "Brik'O", fictif: true, adresse: "Rue de l'Exemple 1, 4000 Liège", tel: "04 000 00 00", email: "contact@exemple.be", site: "",
  rayons: ["gros", "toiture", "isolation", "bois", "carrelage", "peinture", "outillage", "echafaudage", "conteneur"],
  services: "Livraison sur chantier\nLocation de matériel\nDécoupe sur mesure\nConseil en isolation",
  horaires: { lun: "7h30–17h", mar: "7h30–17h", mer: "7h30–17h", jeu: "7h30–17h", ven: "7h30–17h", sam: "8h–12h", dim: "Fermé" } };
/* autres négociants de la région (fictifs, noms et coordonnées inventés) ; Brik'O reste la fiche modifiable de l'espace négociant */
const SEM = { lun: "7h30–17h", mar: "7h30–17h", mer: "7h30–17h", jeu: "7h30–17h", ven: "7h30–17h", sam: "8h–12h", dim: "Fermé" };
const NEGOCIANTS_EXEMPLE = [
  { nom: "Le Comptoir du Sanitaire", fictif: true, adresse: "Rue de l'Exemple 12, 4100 Seraing", km: 3, tel: "04 000 08 01", email: "comptoirsanitaire@exemple.be",
    rayons: ["sanitaire", "chauffage"], services: "Salle d'exposition salles de bain\nPièces de chauffage en stock\nConseil pompe à chaleur", horaires: SEM },
  { nom: "Volta Matériel Électrique", fictif: true, adresse: "Rue de l'Exemple 5, 4430 Ans", km: 6, tel: "04 000 08 02", email: "volta@exemple.be",
    rayons: ["electricite", "outillage"], services: "Comptoir pour les électriciens\nÉclairage LED\nCâbles à la coupe", horaires: { ...SEM, sam: "Fermé" } },
  { nom: "Céram'Expo", fictif: true, adresse: "Rue de l'Exemple 30, 4460 Grâce-Hollogne", km: 9, tel: "04 000 08 03", email: "ceramexpo@exemple.be",
    rayons: ["carrelage", "sanitaire"], services: "800 m² d'exposition\nCarrelage grand format\nÉchantillons à emporter", horaires: { ...SEM, sam: "9h–17h" } },
  { nom: "La Planche d'Or", fictif: true, adresse: "Rue de l'Exemple 8, 4400 Flémalle", km: 11, tel: "04 000 08 04", email: "laplanchedor@exemple.be",
    rayons: ["bois", "menuiseries", "cuisine", "peinture"], services: "Découpe de panneaux sur mesure\nChâssis et portes sur commande\nCuisines en kit", horaires: SEM },
  { nom: "Loca'Chantier", fictif: true, adresse: "Rue de l'Exemple 21, 4040 Herstal", km: 13, tel: "04 000 08 05", email: "locachantier@exemple.be",
    rayons: ["engins", "echafaudage", "conteneur", "outillage"], services: "Location à la journée ou à la semaine\nLivraison des conteneurs\nMontage d'échafaudages", horaires: { ...SEM, sam: "7h30–12h" } },
];
/* tous les négociants à montrer, ceux qui vendent ce dont la maison a besoin en premier */
function negociantsRegion(b) {
  const M = metiersDe(b), utiles = F => RAYONS_NEG.filter(r => (F.rayons || []).includes(r[0]) && r[3].some(id => M.includes(id))).length;
  return [...(negVisible() ? [{ ...negFiche, km: negFiche.km ?? 4 }] : []), ...NEGOCIANTS_EXEMPLE].sort((x, y) => utiles(y) - utiles(x) || (x.km || 0) - (y.km || 0));
}
/* négociants repliés : une ligne par négociant, à toucher pour ouvrir la fiche */
const listeNegociants = (m, b) => {
  const L = negociantsRegion(b), mt = metiersDe(b);
  if (!L.length) return ficheNegociant(null);
  return `<div class="neg-liste">${L.map((F, i) => {
    const id = `neg-${m.id}-${i}`, utiles = RAYONS_NEG.filter(r => (F.rayons || []).includes(r[0]) && r[3].some(x => mt.includes(x))).length;
    const ville = ((F.adresse || "").match(/\d{4}\s+(.+)$/) || [])[1] || "";
    return `<details class="neg-l" data-ouvert="${id}" ${ouverts.has(id) ? "open" : ""}><summary><span><b>${esc(F.nom)}</b><small class="mu">${esc(ville)}${F.km != null ? ` · ${F.km} km` : ""}</small></span>${utiles ? `<span class="neg-utile">✓ ${utiles} utile${utiles > 1 ? "s" : ""}</span>` : ""}</summary>${ficheNegociant(F, mt, true)}</details>`;
  }).join("")}</div>`;
};
const blocNegociants = b => { const L = negociantsRegion(b); return L.length ? `<div class="negs-grille">${L.map(F => ficheNegociant(F, metiersDe(b), true)).join("")}</div>` : ficheNegociant(null); };
const lire = (k, d) => { try { return JSON.parse(localStorage.getItem(cle(k)) || "null") || d; } catch (e) { return d; } };
const ecrire = (k, v) => { try { localStorage.setItem(cle(k), JSON.stringify(v)); } catch (e) {} };
let negFiche = lire("valou_demo_negfiche", JSON.parse(JSON.stringify(FICHE_EXEMPLE)));
if (negFiche.fictif) negFiche = JSON.parse(JSON.stringify(FICHE_EXEMPLE)); // fiche d'exemple pas encore modifiée : toujours la dernière version (adresse, types de matériaux)
/* la fiche n'apparaît sur les projets que si le négociant a précisé ses types de matériaux */
const negVisible = () => negFiche && negFiche.nom && (negFiche.rayons || []).length;
const metiersDe = b => METIERS.filter(x => x.id !== "general" && b.postes.some(p => x.f(p.k) && p.QL > 0)).map(x => x.id).concat("general");
let annonce = lire("valou_demo_annonce", { titre: "", prix: "", texte: "", valou: false }); // maison dont le panneau « envoyer aux artisans » est ouvert
const sauverTarifs = () => { try { localStorage.setItem(cle("valou_demo_tarifs"), JSON.stringify(tarifs)); } catch (e) {} };

function resume(m) {
  const b = calculerBudget(R, m), c = coutTotal(m, b);
  const tot = b.postes.reduce((s, p) => s + p.total[1], 0) || 1;
  const part = f => Math.round((b.postes.filter(p => f.includes(p.fiab)).reduce((s, p) => s + p.total[1], 0) / tot) * 100);
  return { m, b, c, detail: part(["reference", "estimation"]), fourch: part(["fourchette", "incomplet"]) };
}

function ecranComparer() {
  if (!selection) selection = achats().slice(0, 3).map(m => m.id);
  selection = selection.filter(id => trouver(id) && achats().includes(trouver(id)));
  const choix = achats().map(m => `<label class="puce ${selection.includes(m.id) ? "on" : ""}"><input type="checkbox" data-comp="${m.id}" ${selection.includes(m.id) ? "checked" : ""}> ${esc(m.nom || "Maison")}</label>`).join("");
  const L = selection.map(id => resume(trouver(id)));
  if (L.length < 2) {
    return `${entete("comparer")}<main><h1>Comparer</h1><div class="puces">${choix}</div>
      <div class="carte vide"><p>Choisissez au moins deux maisons à comparer.</p><a class="btn" href="#/ajouter">＋ Ajouter une maison</a></div></main>`;
  }
  const best = L.reduce((a, x) => (x.c.total[1] < a.c.total[1] ? x : a));
  const autres = L.filter(x => x !== best);
  /* la phrase qui résume la comparaison */
  const plusCher = autres.find(x => x.c.prix < best.c.prix);
  const phrase = plusCher
    ? `<b>${esc(best.m.nom)}</b> coûte <b>${euros(best.c.prix - plusCher.c.prix)}</b> de plus à l'achat que <b>${esc(plusCher.m.nom)}</b>, mais revient <b class="or">${euros(plusCher.c.total[1] - best.c.total[1], 100)} moins cher</b> au final, travaux compris.`
    : `<b>${esc(best.m.nom)}</b> revient le moins cher au final, travaux compris.`;
  const max = Math.max(...L.map(x => x.c.total[1]));
  const barres = L.map(x => {
    const w = v => (v / max) * 100;
    return `<div class="cmp-barre"><div class="cmp-nom"><b>${esc(x.m.nom)}</b>${x === best ? ` <span class="badge b-reference">Le moins cher au final</span>` : ""}</div>
      <div class="barre clair"><span class="p1" style="width:${w(x.c.prix)}%" title="Prix d'achat"></span><span class="p2" style="width:${w(x.c.droits + (x.c.notaire || 0))}%" title="Droits et notaire"></span><span class="p4" style="width:${w(x.c.travaux[1])}%" title="Travaux"></span></div>
      <div class="cmp-tot">${euros(x.c.total[1], 100)}</div></div>`;
  }).join("");
  const ligne = (t, f, cls = "") => `<tr class="${cls}"><th>${t}</th>${L.map(x => `<td class="${x === best ? "best" : ""}">${f(x)}</td>`).join("")}</tr>`;
  const tableau = `<div class="defile cmp"><table>
    <thead><tr><th></th>${L.map(x => `<th class="${x === best ? "best" : ""}"><a href="#/maison/${x.m.id}">${esc(x.m.nom)}</a><small class="mu">${esc([x.m.annee, x.m.surface && nombre(x.m.surface) + " m²"].filter(Boolean).join(" · "))}</small></th>`).join("")}</tr></thead>
    <tbody>
      ${ligne("Prix demandé", x => euros(x.c.prix))}
      ${ligne("Droits d'enregistrement", x => euros(x.c.droits))}
      ${ligne("Notaire", x => (x.c.notaire == null ? `<span class="manque">à compléter</span>` : euros(x.c.notaire)))}
      ${ligne("Travaux (moyen)", x => `${euros(x.c.travaux[1], 100)}<small class="mu">${fourchette(x.c.travaux)}</small>`)}
      ${ligne("<b>Vrai coût</b>", x => `<b>${euros(x.c.total[1], 100)}</b><small class="mu">${fourchette(x.c.total)}</small>`, "fort")}
      ${ligne("Écart avec le prix affiché", x => `+${euros(x.c.total[1] - x.c.prix, 100)} <small class="mu">(+${x.c.prix ? Math.round(((x.c.total[1] - x.c.prix) / x.c.prix) * 100) : 0} %)</small>`)}
      ${ligne("Label PEB", x => (x.m.peb ? pebBadge(x.m.peb) + (concerneParObligation(x.m.peb) ? ` <small class="mu">obligation annoncée : label ${OBLIGATION_PEB.cible} en ${OBLIGATION_PEB.delaiAns} ans</small>` : "") : `<span class="mu">inconnu</span>`))}
      ${ligne("Travaux énergétiques (moyen)", x => euros(travauxEnergie(x.b).total[1], 100))}
      ${ligne("Toiture", x => esc(nomToit(x.m.toiture) || "–"))}
      ${ligne("Façades", x => (+x.m.facades ? `${x.m.facades} façades` : "–"))}
      ${ligne("Vrai coût par m²", x => (x.m.surface ? euros(x.c.total[1] / x.m.surface, 10) + " /m²" : "–"))}
      ${ligne("Fiabilité du budget travaux", x => `<span class="badge b-reference">${x.detail} % détaillé</span> <span class="badge b-fourchette">${x.fourch} % fourchette</span>`)}
    </tbody></table></div>`;
  return `${entete("comparer")}
  <main>
    <h1>Comparer</h1>
    <p class="mu">Le prix affiché ne dit pas tout : comparez le vrai coût, travaux compris.</p>
    <div class="puces">${choix}</div>
    <section class="carte verdict"><p>${phrase}</p>${barres}
      <ul class="legende sombre"><li><i class="p1"></i>Prix d'achat</li><li><i class="p2"></i>Droits et notaire</li><li><i class="p4"></i>Travaux</li></ul></section>
    <section class="carte">${tableau}</section>
  </main>`;
}

/* ---------- écran : dossier pour la banque (imprimable en PDF) ---------- */
/* ---------- devis reçus des artisans (côté particulier) ---------- */
const devisRecus = m => (m.reponses || []).filter(r => r.type === "devis" && +r.montant > 0);
const devisAUtiliser = () => visibles().reduce((n, m) => n + devisRecus(m).filter(r => ((m.devisChoisi || {})[r.metier] !== r.artisanId)).length, 0);
function ecartBudget(montant, budget) {
  if (!budget) return "";
  const d = (montant - budget) / budget, pc = Math.round(Math.abs(d) * 100);
  return Math.abs(d) <= 0.1 ? `<span class="badge b-reference">Proche de l'estimation (${d >= 0 ? "+" : "−"}${pc} %)</span>`
    : d > 0 ? `<span class="badge b-estimation">Plus cher que l'estimation : +${pc} %</span>`
    : `<span class="badge b-fourchette">Moins cher que l'estimation : −${pc} % · vérifiez ce qui est compris</span>`;
}
function blocDevisRecus(m, b) {
  const D = devisRecus(m);
  if (!D.length) return /#devis$/.test(location.hash) ? `<section class="carte devis-recus"><h2>📩 Devis reçus</h2><p class="mu">Aucun devis reçu pour l'instant. Envoyez votre projet aux artisans ci-dessous : leurs devis arriveront ici.</p></section>` : "";
  return `<section class="carte devis-recus">
    <h2>📩 Devis reçus <span class="pastille">${D.length}</span></h2>
    <p class="mu">Les artisans à qui vous avez envoyé le projet vous répondent ici. Utilisez un devis dans le dossier pour la banque : il remplace l'estimation Valou de son métier.</p>
    ${D.map(r => {
      const x = METIERS.find(y => y.id === r.metier) || { t: r.metier, f: () => false }, lots = b.postes.filter(p => x.f(p.k) && p.QL > 0), est = lots.reduce((s, p) => s + p.total[1], 0);
      const a = artisansDuMetier(r.metier).find(y => y.id === r.artisanId) || ARTISANS_EXEMPLE[r.metier] || { nom: "Artisan" }, A = ARTISANS_EXEMPLE[r.metier] || ARTISANS_EXEMPLE.general;
      const utilise = (m.devisChoisi || {})[r.metier] === r.artisanId;
      return `<div class="dr-ligne ${utilise ? "utilise" : ""}">
        <div class="dr-g"><small class="mu">${esc(x.t)} · reçu le ${esc(new Date(r.date).toLocaleDateString("fr-BE"))}</small>
          <b><a href="#/artisan/${esc(r.artisanId)}">${esc(a.nom)}</a></b> <span class="badge b-exemple">Exemple fictif</span><span class="mu dr-tel">📞 ${esc(a.tel || A.tel)}</span>
          ${r.note ? `<p class="dr-note">« ${esc(r.note)} »</p>` : ""}</div>
        <div class="dr-d"><b class="dr-m">${euros(r.montant)}</b><small class="mu">TVA comprise · estimation Valou ${euros(est, 10)}</small>${ecartBudget(r.montant, est)}
          ${utilise ? `<span class="dr-ok">✓ Utilisé dans le <a href="#/dossier/${m.id}">dossier pour la banque</a></span>`
            : `<button class="btn petit-btn" data-action="devis-utiliser" data-metier="${esc(r.metier)}" data-maison="${m.id}">✓ Utiliser dans le dossier pour la banque</button>`}</div>
      </div>`; }).join("")}
  </section>`;
}

/* ---------- dossier pour la banque : devis des artisans choisis (ils remplacent l'estimation Valou du métier) ---------- */
function devisRetenus(m, b) {
  const ch = m.devisChoisi || {}, mt = m.devisMontants || {};
  const L = METIERS.filter(x => x.id !== "general").map(x => {
    const recu = id => (devisRecus(m).find(r => r.metier === x.id && r.artisanId === id) || {}).montant;
    const lots = b.postes.filter(p => x.f(p.k) && p.QL > 0), id = ch[x.id], montant = id ? +((mt[x.id] || {})[id] ?? recu(id) ?? 0) : 0;
    if (!lots.length || !(montant > 0)) return null;
    return { x, lots, montant, art: artisansDuMetier(x.id).find(a => a.id === id), est: lots.reduce((s, p) => s + p.total[1], 0) };
  }).filter(Boolean);
  const cles = new Set(L.flatMap(l => l.lots.map(p => p.k)));
  const est = [0, 1, 2].map(i => b.postes.filter(p => cles.has(p.k)).reduce((s, p) => s + p.total[i], 0));
  const f = 1 + b.pi / 100, dev = L.reduce((s, l) => s + l.montant, 0);
  /* les imprévus restent sur la partie estimée ; le devis est repris tel quel */
  const T = b.ST.map((st, i) => Math.max(0, st - est[i]) * f + dev);
  return { L, cles, est, dev, T };
}
function blocDevisDossier(m, b, dv) {
  const metiers = METIERS.filter(x => x.id !== "general").map(x => ({ x, lots: b.postes.filter(p => x.f(p.k) && p.QL > 0) })).filter(o => o.lots.length);
  const ch = m.devisChoisi || {}, mt = m.devisMontants || {};
  const ecran = metiers.map(({ x, lots }) => {
    const R2 = devisRecus(m).filter(r => r.metier === x.id);
    const est = lots.reduce((s, p) => s + p.total[1], 0), A = [...new Set([...((m.artisansChoisis || {})[x.id] || []), ...R2.map(r => r.artisanId)])], liste = artisansDuMetier(x.id);
    return `<div class="dd-metier">
      <div class="dd-tete"><b>${esc(x.t)}</b><span class="mu">Estimation Valou : <b>${euros(est, 10)}</b></span></div>
      ${A.length ? `<label class="cb dd-ligne"><input type="radio" name="dd-${x.id}" data-devis-choix="${x.id}" value="" ${ch[x.id] ? "" : "checked"}> <span>Garder l'estimation Valou</span></label>
        ${A.map(id => { const a = liste.find(y => y.id === id) || { nom: id }; const v = (mt[x.id] || {})[id] ?? (R2.find(r => r.artisanId === id) || {}).montant ?? ""; return `<div class="dd-ligne">
          <label class="cb"><input type="radio" name="dd-${x.id}" data-devis-choix="${x.id}" value="${esc(id)}" ${ch[x.id] === id ? "checked" : ""}> <span><b>${esc(a.nom)}</b> <span class="badge b-exemple">Exemple fictif</span>${R2.some(r => r.artisanId === id) ? ` <span class="badge b-reference">📩 devis reçu</span>` : ""}</span></label>
          <span class="saisie"><input type="number" min="0" step="any" inputmode="decimal" data-devis-montant="${esc(x.id + "|" + id)}" value="${esc(v)}" placeholder="montant du devis" aria-label="Montant du devis de ${esc(a.nom)}"><i>€</i></span></div>`; }).join("")}`
        : `<p class="mu petit-t">Aucun artisan choisi pour ce métier : <a href="#/contacts/${m.id}">choisissez-les dans « Contacter »</a>.</p>`}
    </div>`;
  }).join("");
  const papier = dv.L.length ? `<table class="f-table">
      <tr class="g"><td>Métier</td><td>Artisan</td><td class="r">Estimation Valou</td><td class="r">Devis retenu</td></tr>
      ${dv.L.map(l => `<tr><td>${esc(l.x.t)}</td><td>${esc(l.art ? l.art.nom : "")}</td><td class="r">${euros(l.est, 10)}</td><td class="r"><b>${euros(l.montant)}</b></td></tr>`).join("")}
      <tr class="tot"><td colspan="3">Total des devis retenus (TVA comprise)</td><td class="r">${euros(dv.dev)}</td></tr>
    </table>` : `<p class="mu">Aucun devis retenu pour l'instant : les montants des travaux sont des estimations Valou.</p>`;
  return `<h2>4. Les devis des artisans</h2>
    <div class="no-print dd-ecran"><p class="mu petit-t">Pour chaque métier : tapez le montant du devis reçu (TVA comprise) et choisissez celui que vous retenez. Il remplace l'estimation Valou de ce métier dans le coût total et le montant à emprunter.</p>${ecran || `<p class="mu">Aucun travail encodé pour l'instant.</p>`}</div>
    ${papier}`;
}

function ecranDossier(m) {
  const b = calculerBudget(R, m), c0 = coutTotal(projetDe(m) === "achat" && +m.offre > 0 ? { ...m, prix: +m.offre } : m, b), f = m.fin || {};
  /* les devis retenus remplacent les estimations correspondantes */
  const dv = devisRetenus(m, b);
  const c = dv.L.length ? { ...c0, travaux: dv.T, total: c0.total.map((t, i) => t - c0.travaux[i] + dv.T[i]) } : c0;
  const tp = travauxPret(m, b, c.travaux[1]);
  const apport = +f.apport || 0, emprunt = Math.max(0, c.total[1] - tp.hors - apport);
  const mens = mensualite(emprunt, f.taux, f.duree);
  const champ = (k, t, suffixe, ph) => `<label>${t}<span class="saisie"><input type="number" min="0" step="any" inputmode="decimal" data-fin="${k}" value="${esc(f[k] ?? "")}" placeholder="${ph}"><i>${suffixe}</i></span><b class="imprime">${f[k] != null && f[k] !== "" ? (suffixe === "€" ? euros(+f[k]) : esc(String(f[k]).replace(".", ",")) + " " + suffixe) : "à compléter"}</b></label>`;
  const parG = {};
  b.postes.forEach(p => (parG[groupe(p)] = parG[groupe(p)] || []).push(p));
  const postes = GROUPES.filter(g => parG[g]).map(g => `<tr class="g"><td colspan="3">${esc(g)}</td></tr>${parG[g].map(p => `<tr><td>${esc(p.n)}<small class="mu"> · ${esc(qte(p.Q, p.u))}</small></td><td>${badge(p.fiab)}</td><td class="r">${euros(p.total[1], 10)}</td></tr>`).join("")}`).join("");
  const auj = new Date().toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  return `${entete("maisons")}
  <main class="dossier">
    <div class="no-print barre-outils"><a href="#/maison/${m.id}" class="retour">← Retour à la maison</a>
      <span class="actions-g"><button class="btn" data-action="envoyer-banque">Envoyer à la banque</button><button class="btn sec" data-action="imprimer">Télécharger en PDF</button></span></div>
    <div class="no-print" id="envoi"></div>
    <article class="feuille">
      <header class="f-tete"><img src="${img("logo-valou.png")}" alt="Valou"><div><b>Dossier de financement</b><small>${projetDe(m) === "renovation" ? "Rénovation" : "Achat et rénovation"} · ${esc(auj)}</small></div></header>
      ${m.exemple ? `<p class="fictif">Bien fictif, utilisé pour la démonstration.</p>` : ""}
      <h1>${esc(m.nom || "Maison")}</h1>
      <p class="mu">${[m.commune, m.annee && `construite en ${m.annee}`, txtFacades(m), txtEtages(m), m.toiture && nomToit(m.toiture).toLowerCase().replace(/^/, "toit : "), m.surface && `${nombre(m.surface)} m² habitables`].filter(Boolean).map(esc).join(" · ")}</p>
      ${m.description ? `<p>${esc(m.description)}</p>` : ""}
      ${m.peb ? `<p>Performance énergétique : ${pebBadge(m.peb)}${m.pebConso ? ` · ${esc(m.pebConso)} kWh/m²/an` : ""} · travaux énergétiques prévus : ${euros(travauxEnergie(b).total[1], 100)}</p>` : ""}

      ${projetDe(m) === "renovation" ? `
      <h2>1. Le budget de la rénovation</h2>
      <table class="f-table">
        <tr><td>Travaux, TVA et imprévus compris <small class="mu">(fourchette ${fourchette(c.travaux)})</small></td><td class="r">${euros(c.travaux[1], 100)}</td></tr>
        ${dv.L.length ? `<tr class="sous"><td>dont devis d'artisans retenus (${dv.L.length})</td><td class="r">${euros(dv.dev)}</td></tr><tr class="sous"><td>dont estimations Valou (le reste des travaux)</td><td class="r">${euros(c.travaux[1] - dv.dev, 100)}</td></tr>` : ""}
        <tr class="tot"><td>Budget total</td><td class="r">${euros(c.total[1], 100)}</td></tr>
      </table>
      ` : `
      <h2>1. Le coût total du projet</h2>
      <table class="f-table">
        <tr><td>${+m.offre > 0 ? `Prix d'achat <small class="mu">(offre simulée ; prix demandé ${euros(m.prix)})</small>` : "Prix d'achat"}</td><td class="r">${euros(c.prix)}</td></tr>
        <tr><td>Droits d'enregistrement (${String(c.tauxDroits).replace(".", ",")} %, taux légal wallon à confirmer par le notaire)</td><td class="r">${euros(c.droits)}</td></tr>
        <tr><td>Honoraires et frais du notaire, TVA comprise${c.notaireCalcul ? ` <small class="mu">(calcul d'après le ${esc(c.notaireCalcul.source)})</small>` : c.notaireEncode ? ` <small class="mu">(montant du notaire)</small>` : ""}</td><td class="r">${c.notaire == null ? `<span class="manque">à compléter</span>` : euros(c.notaire)}</td></tr>
        <tr><td>Travaux, TVA et imprévus compris <small class="mu">(fourchette ${fourchette(c.travaux)})</small></td><td class="r">${euros(c.travaux[1], 100)}</td></tr>
        ${dv.L.length ? `<tr class="sous"><td>dont devis d'artisans retenus (${dv.L.length})</td><td class="r">${euros(dv.dev)}</td></tr><tr class="sous"><td>dont estimations Valou (le reste des travaux)</td><td class="r">${euros(c.travaux[1] - dv.dev, 100)}</td></tr>` : ""}
        <tr class="tot"><td>Coût total du projet</td><td class="r">${euros(c.total[1], 100)}</td></tr>
      </table>
      `}

      <h2>2. Le financement</h2>
      <div class="champs f-fin">
        ${champ("apport", "Apport personnel", "€", "à compléter")}
        ${champ("taux", "Taux annuel du crédit", "%", "taux proposé par la banque")}
        ${champ("duree", "Durée du crédit", "ans", "ex. 25")}
      </div>
      <div class="no-print">${blocTravauxPret(m, tp)}</div>
      <table class="f-table">
        ${tp.hors ? `<tr><td>Coût total du projet</td><td class="r">${euros(c.total[1], 100)}</td></tr><tr class="sous"><td>Travaux payés hors prêt : ${esc(tp.groupes.filter(x => !x.inclus).map(x => x.g).join(", "))}</td><td class="r">− ${euros(tp.hors, 100)}</td></tr>` : ""}
        ${apport ? `<tr class="sous"><td>Apport personnel</td><td class="r">− ${euros(apport)}</td></tr>` : ""}
        <tr><td>Montant à emprunter</td><td class="r">${euros(emprunt, 100)}</td></tr>
        <tr class="tot"><td>Mensualité estimée (hors assurance)</td><td class="r">${mens ? euros(mens) + " / mois" : `<span class="manque">indiquez le taux et la durée</span>`}</td></tr>
      </table>
      ${R.aides && R.aides.aides && R.aides.aides[0] ? `<p class="mu petit-t">Aide possible : ${esc(R.aides.aides[0].nom)}. Conditions à vérifier, non déduite du budget.</p>` : ""}

      <h2>3. Le budget des travaux, poste par poste</h2>
      <table class="f-table postes">${postes}
        <tr class="sous"><td colspan="2">Matériaux (HTVA)</td><td class="r">${euros(b.MAT[1])}</td></tr>
        <tr class="sous"><td colspan="2">Main-d'œuvre (HTVA)</td><td class="r">${euros(b.MO[1])}</td></tr>
        <tr class="sous"><td colspan="2">TVA</td><td class="r">${euros(b.TVA[1])}</td></tr>
        ${b.ANN[1] ? `<tr class="sous"><td colspan="2">Container à gravats</td><td class="r">${euros(b.ANN[1])}</td></tr>` : ""}
        <tr class="sous"><td colspan="2">Imprévus (${b.pi} %)</td><td class="r">${euros(b.IM[1])}</td></tr>
        <tr class="tot"><td colspan="3">Total des travaux (moyen, estimation Valou)</td><td class="r">${euros(b.T[1], 100)}</td></tr>
        ${dv.L.length ? `<tr class="sous"><td colspan="3">Avec les devis retenus (point 4) à la place des estimations correspondantes</td><td class="r"><b>${euros(dv.T[1], 100)}</b></td></tr>` : ""}
      </table>

      ${blocDevisDossier(m, b, dv)}

      <footer class="f-pied">Estimation indicative établie avec Valou à partir de prix de référence hors TVA (main-d'œuvre : ${esc(R.sources.mo || "")} ; matériaux : ${esc(R.sources.hubo || "")}). Elle ne remplace pas les devis des entrepreneurs ni la simulation du notaire.</footer>
    </article>
  </main>`;
}

/* ---------- photos de la visite ---------- */
/* crée une pièce à partir d'un nom (type deviné : « Cuisine » → cuisine, « Garage » → garage…) */
function ajouterPieceNommee(m, nom) {
  const T = PIECES_QUESTIONNAIRE.find(x => memeNom(x[0], nom));
  const n = nom.toLowerCase();
  const type = T ? T[1] : /cuisine/.test(n) && !/arri/.test(n) ? "cuisine" : /bain|douche/.test(n) ? "sdb" : /^wc|toilette/.test(n) ? "wc" : /garage/.test(n) ? "garage" : "standard";
  m.pieces = m.pieces || [];
  m.pieces.forEach((x, i) => { if (x.c == null) x.c = i; });
  const prises = new Set(m.pieces.map(x => x.c % COULEURS.length));
  const c = [...Array(COULEURS.length).keys()].find(i => !prises.has(i)) ?? m.pieces.length % COULEURS.length;
  m.pieces.push({ id: nouvelId(), nom, type, sol: null, murs: null, wi: [], c });
}
const photosCache = {}, photosEnCours = {};
let visite = { maisonId: null, nom: "", saisie: true }; // mode visite : pièce en cours de photo
function photosDe(m) {
  if (!photosCache[m.id] && !photosEnCours[m.id] && typeof indexedDB !== "undefined") {
    photosEnCours[m.id] = true;
    listerPhotos(m.id)
      .then(L => { photosCache[m.id] = L.map(p => ({ ...p, url: URL.createObjectURL(p.blob) })); })
      .catch(() => { photosCache[m.id] = []; })
      .finally(() => { delete photosEnCours[m.id]; afficher(); });
  }
  return photosCache[m.id] || [];
}
function rechargerPhotos(m) {
  (photosCache[m.id] || []).forEach(p => URL.revokeObjectURL(p.url));
  delete photosCache[m.id];
  photosDe(m);
}
/* noms proposés : les pièces de la maison, puis les pièces courantes d'une maison */
const nomsPieces = m => {
  const deja = (m.pieces || []).map(pc => pc.nom);
  const types = PIECES_QUESTIONNAIRE.map(x => x[0]).filter(n => n !== "Autre :" && !deja.some(d => memeNom(d, n)));
  return { deja, types };
};
const optionsPieces = (m, sel) => {
  const { deja, types } = nomsPieces(m);
  const autres = !sel || sel === "__autre" || deja.concat(types).some(n => memeNom(n, sel)) ? [] : [sel];
  return `${deja.length ? `<optgroup label="Pièces de la maison">${deja.map(n => `<option ${memeNom(n, sel) ? "selected" : ""}>${esc(n)}</option>`).join("")}</optgroup>` : ""}
    <optgroup label="Autres pièces">${autres.concat(types).map(n => `<option ${memeNom(n, sel) ? "selected" : ""}>${esc(n)}</option>`).join("")}</optgroup>
    <option value="__autre" ${sel === "__autre" ? "selected" : ""}>Autre nom…</option>`;
};
const boutonPhoto = (texte, nom) => `<label class="btn btn-photo">${texte}<input type="file" accept="image/*" capture="environment" multiple data-photo-input ${nom ? `data-nom="${esc(nom)}"` : ""} hidden></label>`;
const vignette = (m, p) => `<figure class="vignette"><a href="${p.url}" target="_blank" rel="noopener"><img src="${p.url}" alt="Photo : ${esc(p.nomPiece)}" loading="lazy"></a>
    <figcaption><select data-photo-renommer="${p.id}" aria-label="Pièce de la photo">${optionsPieces(m, p.nomPiece)}</select>
    <button class="x" data-action="suppr-photo" data-id="${p.id}" aria-label="Supprimer la photo">✕</button></figcaption></figure>`;

/* ---------- viseur intégré : photos en rafale, sans valider chaque photo ---------- */
const camera = { flux: null, erreur: "" };
async function ouvrirCamera() {
  const v = document.getElementById("viseur");
  if (!v) return;
  try {
    if (!camera.flux) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("absent");
      camera.flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    }
    if (v.srcObject !== camera.flux) v.srcObject = camera.flux;
    await v.play().catch(() => {});
  } catch (e) {
    camera.erreur = "La caméra n'est pas accessible dans l'appli (autorisation refusée ou appareil non compatible). Utilisez l'appareil photo du téléphone :";
    afficher();
  }
}
function fermerCamera() {
  if (camera.flux) camera.flux.getTracks().forEach(t => t.stop());
  camera.flux = null;
}
async function declencher(m) {
  const v = document.getElementById("viseur");
  if (!v || !v.videoWidth || !visite.nom) return;
  const k = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
  c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
  const f = document.getElementById("flash");
  if (f) { f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); }
  if (navigator.vibrate) navigator.vibrate(30);
  const blob = await new Promise(ok => c.toBlob(ok, "image/jpeg", 0.82));
  const p = await ajouterPhoto(m.id, visite.nom, blob);
  /* mise à jour sur place (sans redessiner l'écran, pour ne pas couper la caméra) */
  const url = URL.createObjectURL(p.blob);
  (photosCache[m.id] = photosCache[m.id] || []).push({ ...p, url });
  const n = photosCache[m.id].filter(x => memeNom(x.nomPiece, visite.nom)).length;
  const compte = document.getElementById("vis-compte");
  if (compte) compte.textContent = `${n} photo${n > 1 ? "s" : ""}`;
  const mini = document.getElementById("vis-miniatures");
  if (mini) mini.insertAdjacentHTML("afterbegin", `<img src="${url}" alt="">`);
}

function ecranPhotos(m) {
  const P = photosDe(m);
  if (visite.maisonId !== m.id) visite = { maisonId: m.id, nom: "", saisie: true };
  const { deja, types } = nomsPieces(m);
  const enCours = visite.nom ? P.filter(p => memeNom(p.nomPiece, visite.nom)) : [];
  const groupes = [...new Set(P.map(p => p.nomPiece))];
  const carteVisite = visite.saisie
    ? `<form class="carte prise" id="f-visite">
        <label>${visite.nom ? "Nom de la pièce suivante" : "Nom de la première pièce"}<input id="visite-nom" list="noms-pieces" autocomplete="off" placeholder="ex. Hall d'entrée" required></label>
        <datalist id="noms-pieces">${deja.concat(types).map(n => `<option value="${esc(n)}">`).join("")}</datalist>
        <button class="btn btn-photo" type="submit">${visite.nom ? "Commencer cette pièce →" : "Commencer la visite →"}</button>
        ${visite.nom ? `<button class="btn lien" type="button" data-action="visite-annuler">← Revenir à « ${esc(visite.nom)} »</button>` : ""}
        <small class="mu">Tapez le nom de la pièce, puis photographiez-la. Les photos restent sur cet appareil.</small>
      </form>`
    : `<section class="carte prise en-cours">
        <small class="mu">Pièce en cours</small>
        <div class="vis-nom"><b>${esc(visite.nom)}</b><span class="badge b-reference" id="vis-compte">${enCours.length} photo${enCours.length > 1 ? "s" : ""}</span></div>
        ${camera.erreur
          ? `<p class="mu petit-t">${esc(camera.erreur)}</p>${boutonPhoto("📷 Prendre une photo (appareil du téléphone)", visite.nom)}`
          : `<div class="viseur"><video id="viseur" playsinline muted autoplay></video><div class="flash" id="flash"></div>
             <button class="declencheur" data-action="declencher" aria-label="Prendre la photo"><span></span></button></div>`}
        <div class="vis-miniatures" id="vis-miniatures">${enCours.slice(-12).reverse().map(p => `<img src="${p.url}" alt="">`).join("")}</div>
        <div class="vis-suite"><button class="btn sec" data-action="visite-suivante">Pièce suivante →</button><button class="btn lien" data-action="visite-fin">Terminer la visite</button></div>
      </section>`;
  return `${entete("maisons")}
  <main>
    <a href="#/maison/${m.id}" class="retour">← ${esc(m.nom || "La maison")}</a>
    <h1>📷 Photos de la visite</h1>
    ${carteVisite}
    ${P.length ? `<h2 class="sous-titre">Pièces photographiées</h2>` + groupes.map(g => {
      const L = P.filter(p => p.nomPiece === g), pc = pieceDePhoto(m, L[0]);
      return `<section class="carte groupe-photos" ${pc ? `style="${stylePiece(m, pc)}"` : ""}>
        <div class="gp-tete"><h2>${esc(g)} <small class="mu">${L.length} photo${L.length > 1 ? "s" : ""}</small></h2>
          ${pc ? `<a class="btn sec petit-btn" href="#/maison/${m.id}/piece/${pc.id}">Ouvrir la pièce →</a>` : `<span class="badge b-estimation">Pas encore de pièce</span><button class="btn sec petit-btn" data-action="creer-piece-photo" data-nom="${esc(g)}">＋ Créer la pièce « ${esc(g)} »</button>`}</div>
        <div class="galerie">${L.map(p => vignette(m, p)).join("")}</div>
      </section>`;
    }).join("") + (groupes.some(g => !pieceDePhoto(m, { nomPiece: g })) ? `<p><button class="btn" data-action="creer-pieces-photos">＋ Créer toutes les pièces manquantes</button></p>` : "") : ""}
  </main>`;
}

/* ---------- mode présentation : tout remettre comme au départ ----------
   maisons de démonstration neuves (et leurs photos effacées), simulations par défaut, retour à l'accueil.
   Les maisons personnelles ne sont pas touchées. Raccourci : hoono.be/demo/#/presentation */
function preparerPresentation(direct) {
  if (direct) changerMode(false);
  if (!direct && !confirm("Remettre la démonstration à zéro ? Vos maisons personnelles ne sont pas touchées.")) return;
  maisons.filter(m => m.demo).forEach(m => { supprimerPhotosMaison(m.id).catch(() => {}); delete photosCache[m.id]; });
  chargerDemo();
  tarifs = { p: {} }; sauverTarifs();
  prixNeg = {}; appliquerPrixNeg(); envoiOuvert = null;
  negFiche = JSON.parse(JSON.stringify(FICHE_EXEMPLE)); ecrire("valou_demo_negfiche", negFiche);
  annonce = { titre: "", prix: "", texte: "", valou: false }; ecrire("valou_demo_annonce", annonce);
  maisons.forEach(m => { if (m.demo) { delete m.envoi; delete m.reponses; } });
  sim = { k: "sol_carrelage", n: 25 }; metier = "general"; selection = null;
  fermerCamera(); visite = { maisonId: null, nom: "", saisie: true };
  location.hash = "#/bienvenue";
  afficher();
}

/* ---------- écran : contacter un professionnel ---------- */
/* artisans de démonstration par métier (fictifs) : le premier est celui qui répond dans la démo */
/* les artisans fictifs d'un métier (3 profils) ; identifiant : « métier-numéro » */
function artisansDuMetier(id) {
  return (ARTISANS[id] || ARTISANS.general).map((a, i) => ({ ...a, id: `${id}-${i + 1}`, metier: id }));
}
const artisanParId = id => { const [met] = String(id).split("-"); return artisansDuMetier(met).find(a => a.id === id); };
const ctOuvert = {};
/* propositions de matériaux (texte libre : le client peut écrire ce qu'il veut ; aucun prix) */
const MATERIAUX = [
  [/carrelage/, ["Grès cérame 60×60", "Grès cérame 30×60", "Grès cérame imitation bois 20×120", "Grès cérame 120×60 grand format", "Carreaux de ciment", "Faïence murale 30×60", "Mosaïque", "Pierre naturelle"]],
  [/parquet/, ["Parquet chêne massif", "Parquet contrecollé chêne", "Sol stratifié", "Sol vinyle (PVC) clipsable"]],
  [/peinture/, ["Peinture mate blanche", "Peinture velours", "Peinture satinée (pièces humides)", "Peinture de couleur (référence à fournir)"]],
  [/plafonnage/, ["Plâtre projeté", "Plaques de plâtre (Gyproc)", "Enduit lissé"]],
  [/^i_ch|chassis|ch_/, ["PVC blanc", "PVC anthracite", "Aluminium", "Bois", "Double vitrage", "Triple vitrage"]],
  [/^i_(pe)$/, ["Porte PVC", "Porte aluminium", "Porte bois", "Porte avec vitrage"]],
  [/^i_(pi)$/, ["Porte tubulaire blanche", "Porte pleine", "Porte vitrée", "Porte coulissante"]],
  [/meu_cuisine/, ["Cuisine en kit (montage seulement)", "Cuisine sur mesure", "Plan de travail stratifié", "Plan de travail en pierre"]],
  [/meu_sdb/, ["Douche à l'italienne", "Baignoire", "Meuble double vasque", "Paroi de douche vitrée"]],
  [/^wc_/, ["WC suspendu", "WC au sol", "Lave-mains"]],
  [/i_rad|^rad/, ["Radiateur acier à panneaux", "Radiateur design", "Sèche-serviettes"]],
  [/i_(cv|to)_/, ["Tuiles terre cuite", "Tuiles béton", "Ardoises naturelles", "Ardoises artificielles", "EPDM"]],
  [/i_st|isol/, ["Laine de roche", "Laine de verre", "Fibre de bois", "PIR / PUR"]],
];
const suggestionsMateriau = k => (MATERIAUX.find(([re]) => re.test(k)) || [, []])[1];
/* les parties du projet d'un métier : chaque poste, pièce par pièce (sans ce que l'on fait soi-même) */
function partiesMetier(m, b, x) {
  const P = {};
  b.lignes.filter(l => x.f(l.k) && !l.soiMeme && R.postes[l.k] && Number(String(l.q).replace(",", ".")) > 0).forEach(l => {
    const cle = cleLigne(l), pc = l.pieceId && (m.pieces || []).find(y => y.id === l.pieceId);
    const o = (P[cle] = P[cle] || { cle, k: l.k, n: R.postes[l.k].n, u: unitePoste(R.postes[l.k].u, l.k), piece: pc ? pc.nom : "Toute la maison", q: 0, total: 0, fiab: l.fiab });
    o.q += Number(String(l.q).replace(",", ".")); o.total += l.fiab ? l.total[1] : 0;
  });
  return Object.values(P).sort((u, v) => (u.piece === "Toute la maison") - (v.piece === "Toute la maison") || u.piece.localeCompare(v.piece, "fr"));
}

function ecranContacts(id) {
  const m = id && trouver(id);
  if (!m) {
    return `${entete("contacts")}<main>
      <h1>Contacter un professionnel</h1>
      <p class="intro mu">Choisissez une maison : vous verrez le résumé du projet et les contacts des artisans et des négociants.</p>
      ${visibles().length ? `<div class="grille">${visibles().map(x => {
        const b = calculerBudget(R, x), c = coutTotal(x, b), rep = (x.reponses || []).filter(r => r.type !== "non").length;
        return `<a class="carte maison" href="#/contacts/${x.id}">
          <div class="m-tete"><b>${esc(x.nom || "Maison")}</b>${pebBadge(x.peb)}</div>
          <div class="mu">${esc(x.commune || "")}</div>
          <div class="m-chiffres"><div><small>${projetDe(x) === "renovation" ? "Budget rénovation" : "Vrai coût"}</small><b>${euros(c.total[1], 100)}</b></div><div><small>Artisans</small><b class="or">${x.envoi ? (rep ? `${rep} réponse${rep > 1 ? "s" : ""}` : "envoyé") : c.travaux[1] ? "à contacter" : "pas encore de travaux"}</b></div></div>
        </a>`;
      }).join("")}</div>` : `<div class="carte vide"><p>Aucune maison pour l'instant.</p><a class="btn" href="#/ajouter">＋ Ajouter une maison</a></div>`}
    </main>`;
  }
  const b = calculerBudget(R, m), c = coutTotal(m, b), P = photosDe(m);
  const metiers = METIERS.filter(x => x.id !== "general").map(x => ({ x, lots: b.postes.filter(p => x.f(p.k) && p.QL > 0) })).filter(o => o.lots.length);
  const ligneMetier = ({ x, lots }) => {
    const t = lots.reduce((s, p) => s + p.total[1], 0);
    const envoye = m.envoi && m.envoi.metiers.includes(x.id), r = (m.reponses || []).find(y => y.metier === x.id), A = ARTISANS_EXEMPLE[x.id] || ARTISANS_EXEMPLE.general;
    const choisis = (m.artisansChoisis || {})[x.id] || [], liste = artisansDuMetier(x.id);
    const nomsChoisis = choisis.map(id => (liste.find(a => a.id === id) || {}).nom).filter(Boolean);
    /* les parties du projet de ce métier : un poste dans une pièce (ou pour toute la maison) */
    const parts = partiesMetier(m, b, x);
    const exclues = new Set((m.partiesExclues || {})[x.id] || []);
    const envoi = (m.envoiMetier || {})[x.id];
    const incluse = q => (envoye && envoi && envoi.parts ? envoi.parts.includes(q.cle) : !exclues.has(q.cle));
    const tSel = parts.filter(incluse).reduce((s, q) => s + q.total, 0), nSel = parts.filter(incluse).length;
    const etat = !envoye ? `<span class="badge b-fourchette">Pas encore envoyé</span>`
      : !r ? `<span class="badge b-estimation">Envoyé${nomsChoisis.length ? ` à ${nomsChoisis.length} artisan${nomsChoisis.length > 1 ? "s" : ""}` : ""} · en attente</span>`
      : r.type === "non" ? `<span class="badge b-fourchette">Artisan pas disponible</span>`
      : `<span class="badge b-reference">${r.type === "visite" ? "Visite proposée" : "Devis envoyé"}</span>`;
    const ouvert = ctOuvert[m.id + ":" + x.id];
    const projet = `<div class="ct-panneau"><p class="mu petit-t">Cochez les parties à envoyer. Exemple : vous carrelez vous-même la salle de bain, mais pas le séjour → ne cochez que le séjour.</p>
      <div class="ct-projet-boite"><table class="ct-projet"><thead><tr><th></th><th>Pièce</th><th>Poste</th><th class="ct-mat">Matériau souhaité <small>(facultatif)</small></th><th class="r">Quantité</th><th class="r">Budget</th></tr></thead><tbody>
      ${parts.map(q => { const mat = (m.materiaux || {})[q.cle] || "", sug = suggestionsMateriau(q.k);
        const champ = `<input class="ct-mat-in" data-mat="${esc(q.cle)}" value="${esc(mat)}" ${sug.length ? `list="sug-${esc(q.k)}"` : ""} placeholder="${esc(sug[0] ? `ex. ${sug[0]}` : "ex. marque, couleur, format")}" ${envoye ? "readonly" : ""} aria-label="Matériau souhaité : ${esc(q.piece)}, ${esc(q.n)}">`;
        return `<tr class="${incluse(q) ? "" : "exclu"}"><td><input type="checkbox" data-part="${esc(q.cle)}" ${incluse(q) ? "checked" : ""} ${envoye ? "disabled" : ""} aria-label="Envoyer : ${esc(q.piece)}, ${esc(q.n)}"></td>
        <td><b>${esc(q.piece)}</b></td><td>${esc(q.n)} ${badge(q.fiab)}<div class="ct-mat-tel">${champ}</div></td><td class="ct-mat">${champ}</td><td class="r">${esc(qte(q.q, q.u))}</td><td class="r">${q.total ? euros(q.total, 10) : "–"}</td></tr>`; }).join("")}
      <tr class="tot"><td colspan="5">À envoyer : ${nSel} partie${nSel > 1 ? "s" : ""} sur ${parts.length} (TVA ${b.rate} % comprise)</td><td class="r"><b>${euros(tSel, 10)}</b></td></tr></tbody></table></div>
      ${[...new Set(parts.map(q => q.k))].map(k => suggestionsMateriau(k).length ? `<datalist id="sug-${esc(k)}">${suggestionsMateriau(k).map(v => `<option value="${esc(v)}">`).join("")}</datalist>` : "").join("")}
      <label class="ct-note">Remarque pour l'artisan <small class="mu">(facultatif)</small>
        <textarea data-note-metier="${x.id}" rows="2" ${envoye ? "readonly" : ""} placeholder="ex. Carrelage déjà acheté, à poser seulement. Joints gris anthracite.">${esc((m.notesMetier || {})[x.id] || "")}</textarea></label>
      <p class="mu petit-t">C'est exactement ce que reçoivent les artisans choisis : les parties cochées, le matériau souhaité, votre remarque et les photos des pièces concernées. Le budget reste une estimation : le matériau choisi peut le faire varier.</p></div>`;
    const choix = `<div class="ct-panneau ct-choix" data-metier-choix="${x.id}">
      <p class="mu petit-t">Cochez jusqu'à <b>3 artisans</b>, puis envoyez.</p>
      ${liste.map(a => { const on = choisis.includes(a.id); return `<label class="cb ct-art"><input type="checkbox" data-art="${a.id}" ${on ? "checked" : ""} ${envoye || (!on && choisis.length >= 3) ? "disabled" : ""}>
        <span><b>${esc(a.nom)}</b> <span class="badge b-exemple">Exemple fictif</span><small class="mu">${esc(a.lieu)} · à ${a.km} km${a.tarifs ? " · tarifs partagés avec Valou" : ""} · <a href="#/artisan/${a.id}">Voir le profil</a></small></span></label>`; }).join("")}
      ${envoye ? `<p class="envoye">📨 Projet envoyé${nomsChoisis.length ? ` à ${esc(nomsChoisis.join(", "))}` : ""} le ${esc(new Date((envoi || m.envoi).date).toLocaleDateString("fr-BE"))}. Démonstration : aucun envoi réel.</p>`
        : `<button class="btn petit-btn" data-action="envoi-metier" data-metier="${x.id}" ${choisis.length && nSel ? "" : "disabled"}>📨 Envoyer ${nSel} partie${nSel > 1 ? "s" : ""}${choisis.length ? ` à ${choisis.length} artisan${choisis.length > 1 ? "s" : ""}` : ""}</button>
          ${!nSel ? `<small class="mu"> Aucune partie cochée dans le projet.</small>` : ""}`}
    </div>`;
    return `<div class="contact-ligne">
      <div><b>${esc(x.t)}</b><small class="mu">${lots.map(p => esc(p.n)).join(", ")}</small></div>
      <div class="r"><small class="mu">${nSel < parts.length ? "À envoyer" : "Budget moyen"}</small><b>${euros(tSel, 10)}</b></div>
      <div class="ct-etat">${etat}${r && r.type !== "non" ? `<div class="ct-coord"><b>${esc(A.nom)}</b> <span class="badge b-exemple">Exemple fictif</span><span>📞 ${esc(A.tel)}</span></div>` : ""}</div>
      <div class="ct-boutons">
        <button class="ct-btn ${ouvert === "p" ? "on" : ""}" data-action="ct-ouvrir" data-metier="${x.id}" data-v="p">📋 Projet${nSel < parts.length ? ` (${nSel}/${parts.length})` : ""} <span>▾</span></button>
        <button class="ct-btn ${ouvert === "a" ? "on" : ""}" data-action="ct-ouvrir" data-metier="${x.id}" data-v="a">👷 Artisans${choisis.length ? ` (${choisis.length}/3)` : ""} <span>▾</span></button>
      </div>
      ${ouvert === "p" ? projet : ouvert === "a" ? choix : ""}
    </div>`;
  };
  return `${entete("contacts")}<main>
    <a href="#/contacts" class="retour">← Mes maisons</a>
    <div class="titre-maison"><h1>${esc(m.nom || "Maison")}</h1>${pebBadge(m.peb, true)}${m.exemple ? `<span class="badge b-exemple">Fictive</span>` : ""}
      <p class="mu">${[m.commune, m.annee && `construite en ${m.annee}`, txtFacades(m), txtEtages(m), m.surface && `${nombre(m.surface)} m²`].filter(Boolean).map(esc).join(" · ")}</p></div>
    <section class="carte resume">
      <h2>Résumé du projet</h2>
      <div class="res-chiffres">
        <div><small>${projetDe(m) === "renovation" ? "Budget rénovation" : "Vrai coût"}</small><b>${euros(c.total[1], 100)}</b></div>
        <div><small>Travaux (moyen)</small><b>${euros(b.T[1], 100)}</b></div>
        <div><small>Pièces</small><b>${(m.pieces || []).length}</b></div>
        <div><small>Photos de la visite</small><b>${P.length}</b></div>
      </div>
      <p><a class="btn sec petit-btn" href="#/maison/${m.id}">Voir la fiche complète →</a></p>
    </section>
    ${blocDevisRecus(m, b)}
    <section class="carte">
      <div class="gp-tete"><h2>Artisans</h2><small class="mu">Pour chaque métier : consultez le projet, cochez jusqu'à 3 artisans, envoyez.</small></div>
      ${metiers.length ? metiers.map(ligneMetier).join("") : `<p class="mu">Aucun travail encodé pour l'instant.</p>`}
      <p class="mu petit-t">Les coordonnées d'un artisan apparaissent quand il répond à votre projet (visite ou devis).</p>
    </section>
    <section class="carte"><h2>Négociants de votre région</h2>${blocNegociants(b)}</section>
  </main>`;
}

/* ---------- page d'intro ---------- */
/* texte de la page d'intro selon la version (tuile) ouverte */
const INTRO = {
  complete: { h: `Le vrai coût d'une maison à rénover, <span>avant de faire une offre.</span>`, p: "Prix, notaire, travaux pièce par pièce : Valou chiffre tout, puis envoie votre projet aux bons artisans.", lien: "#/" },
  artisan: { h: `Des chantiers déjà chiffrés, <span>avec les photos.</span>`, p: "Le client a visité, chiffré et photographié sa maison. Vous recevez son projet et vous choisissez : visite, devis ou pas disponible.", lien: "#/demo-artisan" },
  negociant: { h: `Soyez vu sur les chantiers <span>de votre région.</span>`, p: "Chaque maison chiffrée dans Valou, ce sont des matériaux à acheter. Votre fiche montre ce que vous vendez, vos services et vos horaires.", lien: "#/demo-negociant" },
};
function ecranIntro() {
  const I = INTRO[VERSION] || INTRO.complete;
  return `<main class="intro-page">
    <div class="intro-boite">
      <img class="intro-logo" src="${img("logo-valou.png")}" alt="Valou">
      <h1>${I.h}</h1>
      <p class="intro-sous">${esc(I.p)}</p>
      <a class="btn intro-btn" href="${I.lien}">Commencer la démo →</a>
      <ul class="intro-pour">
        <li><b>🏠 Acheteurs</b><span>le vrai budget, gratuit</span></li>
        <li><b>🔨 Artisans</b><span>des projets déjà chiffrés</span></li>
        <li><b>🧱 Négociants</b><span>visibles sur les chantiers</span></li>
        <li><b>🏦 Courtiers et agences</b><span>des dossiers complets</span></li>
      </ul>
      ${VERSION === "complete" ? `<p class="intro-fin">Avec Valou, c'est un acheteur <b>confiant</b>, un artisan <b>gagnant</b>, un négociant <b>content</b>… et une Wallonie qui va <b>de l'avant</b>.</p>` : ""} <!-- phrase de fin : seulement la version pour les investisseurs (Wallonie Entreprendre) -->
      <p class="intro-note">Version de démonstration · maisons et professionnels fictifs</p>
    </div>
  </main>`;
}

/* ---------- version d'essai : accueil ---------- */
function ecranEssai() {
  const n = visibles().length;
  return `<main class="intro-page essai-page">
    <div class="intro-boite">
      <img class="intro-logo" src="${img("logo-valou.png")}" alt="Valou">
      <h1>Bienvenue dans la <span>version d'essai</span></h1>
      <p class="intro-sous">Vous visitez une maison à acheter, ou vous voulez rénover la vôtre ? Valou calcule ce que ça va vraiment vous coûter, travaux compris.</p>
      <ol class="essai-etapes">
        <li><b>Ajoutez la maison</b><span>à acheter (avec son prix) ou à rénover</span></li>
        <li><b>Encodez les pièces et les travaux</b><span>pièce par pièce, avec des photos si vous le voulez</span></li>
        <li><b>Découvrez son vrai coût</b><span>et comparez-la à d'autres maisons</span></li>
      </ol>
      <section class="avantages av-particulier intro-av"><b>Pour vous, c'est gratuit</b><ul>${["Le vrai coût avant de faire une offre : prix, droits, notaire et travaux", "Le budget de votre rénovation, pièce par pièce", "Vos maisons comparées sur leur vrai coût, PEB compris", "Un dossier complet pour la banque", "Votre projet envoyé aux artisans, qui le comprennent sans se déplacer"].map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>
      <span class="actions-g centre"><a class="btn intro-btn" href="#/ajouter">＋ Ajouter une maison à acheter</a><button class="btn intro-btn sec" data-action="essai-reno">🔨 Ajouter ma maison à rénover</button></span>
      ${n ? `<p class="centre"><a class="btn lien" href="#/">👀 Voir ${maisons.some(m => m.demo) ? "les maisons d'exemple et les vôtres" : `mes maisons (${n})`} →</a></p>` : ""}
      <p class="intro-note">Version d'essai gratuite · vos maisons restent sur ce téléphone, rien n'est envoyé · l'envoi aux artisans et à la banque est simulé.<br>Après l'essai, un clic sur « 💬 Mon avis » nous aide beaucoup.</p>
    </div>
  </main>`;
}

/* ---------- version d'essai : avis du testeur (gardé sur le téléphone, envoyé par le testeur lui-même) ---------- */
const AVIS_Q = [
  ["aime", "Qu'avez-vous le plus apprécié ?", "texte"],
  ["difficile", "Qu'est-ce qui était difficile ou pas clair ?", "texte"],
  ["realiste", "Le vrai coût calculé vous paraît-il réaliste ?", ["Oui", "Plutôt oui", "Plutôt non", "Non", "Je ne sais pas"]],
  ["utiliser", "Utiliseriez-vous Valou pour votre prochain achat ?", ["Oui", "Peut-être", "Non"]],
  ["note", "Votre note globale", ["1", "2", "3", "4", "5"]],
  ["autre", "Autre chose à nous dire ?", "texte"],
];
let avis = {};
try { avis = JSON.parse(localStorage.getItem(cle("valou_avis")) || "{}") || {}; } catch (e) {}
const texteAvis = () => ["Mon avis sur la version d'essai de Valou", "", ...AVIS_Q.filter(([k]) => avis[k]).map(([k, q]) => `${q}\n${avis[k]}`), "", `Maisons encodées : ${visibles().length}`].join("\n");
let avisMessage = "";
function ecranAvis() {
  return `${entete("avis")}<main class="etroit">
    <h1>Votre avis</h1>
    <p class="intro mu">Merci d'avoir essayé Valou. Vos réponses restent sur ce téléphone jusqu'à ce que vous les envoyiez vous-même.</p>
    <section class="carte avis">
      ${AVIS_Q.map(([k, q, t]) => t === "texte"
        ? `<label class="avis-q">${esc(q)}<textarea id="avis-${k}" data-avis="${k}" rows="3">${esc(avis[k] || "")}</textarea></label>`
        : `<fieldset class="avis-q"><legend>${esc(q)}</legend><div class="avis-choix">${t.map(v => `<label class="${avis[k] === v ? "on" : ""}"><input type="radio" name="avis-${k}" data-avis="${k}" value="${esc(v)}" ${avis[k] === v ? "checked" : ""}> ${esc(v)}</label>`).join("")}</div></fieldset>`).join("")}
      <span class="actions-g"><button class="btn" data-action="avis-envoyer">📤 Envoyer mon avis</button></span>
      ${avisMessage ? `<p class="envoye">${esc(avisMessage)}</p>` : ""}
      <p class="mu petit-t">« Envoyer mon avis » ouvre le partage de votre téléphone (message, WhatsApp, e-mail…) : envoyez-le à la personne qui vous a proposé l'essai.</p>
    </section>
  </main>`;
}

/* ---------- photo du questionnaire de visite → remplissage de la maison ----------
   DÉMONSTRATION : la lecture automatique d'un questionnaire écrit à la main demande un service de lecture d'image
   (à brancher plus tard, avec une clé gardée sur le serveur). En attendant, les réponses viennent d'un questionnaire d'exemple. */
const QUESTIONNAIRE_EXEMPLE = {
  maison: { annee: 1972, surface: 118, etat: "rafraichir", peb: "E" },
  chauffage: { actuel: "mazout", souhaite: "pac" },
  pieces: [
    { nom: "Séjour / salon", type: "standard", sol: 28, sol_refaire: "parquet", murs: ["peinture"], plafond: "peinture", chassis: 2, chassis_type: "pvc", radiateurs: 2 },
    { nom: "Cuisine", type: "cuisine", sol: 11, sol_refaire: "carrelage", murs: ["peinture"], plafond: "peinture", chassis: 1, chassis_type: "pvc", radiateurs: 1, cuisine: true },
    { nom: "Salle de bain", type: "sdb", sol: 6, sol_refaire: "carrelage", murs: ["carrelage"], carrelage_m2: 18, plafond: "peinture", radiateurs: 1, sdb: true },
    { nom: "WC (rez)", type: "wc", sol: 2, wc: ["sp"] },
    { nom: "Chambre 1", type: "standard", sol: 14, murs: ["peinture"], murs_moi: true, chassis: 1, chassis_type: "pvc", radiateurs: 1 },
    { nom: "Chambre 2", type: "standard", sol: 11, murs: ["peinture"], murs_moi: true, chassis: 1, chassis_type: "pvc", radiateurs: 1 },
  ],
  structure: { i_to_1: 62, i_zi: 16, i_co: 1, i_pe: 1 },
};
let qPhoto = { maisonId: null, photos: [], etape: "photos", lu: null };
function ecranQuestionnairePhoto(m) {
  if (qPhoto.maisonId !== m.id) qPhoto = { maisonId: m.id, photos: [], etape: "photos", lu: null };
  const Q = qPhoto;
  let corps;
  if (Q.etape === "lecture") corps = `<section class="carte q-lecture"><div class="q-roue" aria-hidden="true"></div><b>Lecture du questionnaire…</b><p class="mu">Valou repère les pièces, les cases cochées et les quantités.</p></section>`;
  else if (Q.etape === "resultat" && Q.lu) {
    const L = Q.lu, M = QUESTIONNAIRE_EXEMPLE.maison;
    corps = `<section class="carte q-resultat">
      <p class="alerte-mini">Démonstration : la lecture automatique de votre écriture arrive bientôt. Ces réponses viennent d'un <b>questionnaire d'exemple</b>.</p>
      <h2>Ce que Valou a lu</h2>
      <div class="recap">
        ${M.annee ? `<div><span>Année de construction</span><b>${M.annee}</b></div>` : ""}
        ${M.surface ? `<div><span>Surface habitable</span><b>${nombre(M.surface)} m²</b></div>` : ""}
        ${M.peb ? `<div><span>Label PEB</span><b>${pebBadge(M.peb)}</b></div>` : ""}
        <div><span>Chauffage</span><b>${esc((CHAUFFAGE_ACTUEL.find(c => c[0] === L.chauffage.actuel) || [, ""])[1])} → ${esc((CHAUFFAGE_SOUHAITE.find(c => c[0] === L.chauffage.souhaite) || [, ""])[1])}</b></div>
      </div>
      <h3>${L.pieces.length} pièces</h3>
      <ul class="q-pieces">${L.pieces.map(pc => `<li><b>${esc(pc.nom)}</b> <span class="mu">${pc.sol ? `${String(pc.sol).replace(".", ",")} m² · ` : ""}${esc(resumePiece(pc) || "rien de prévu")}</span></li>`).join("")}</ul>
      <h3>Structure, toiture et équipements</h3>
      <ul class="q-pieces">${L.travaux.map(t => `<li><b>${esc(R.postes[t.k] ? R.postes[t.k].n : t.k)}</b> <span class="mu">${nombre(t.q ?? t.marches)} ${esc(R.postes[t.k] ? unitePoste(R.postes[t.k].u, t.k) : "")}</span></li>`).join("")}</ul>
      <p class="mu petit-t">Les pièces portant le même nom qu'une pièce déjà encodée sont mises à jour ; les autres sont ajoutées. Vous pourrez tout corriger ensuite, pièce par pièce.</p>
      <span class="actions-g"><button class="btn" data-action="q-appliquer">✓ Remplir la maison avec ces réponses</button><button class="btn lien" data-action="q-recommencer">Reprendre les photos</button></span>
    </section>`;
  } else corps = `<section class="carte q-photos">
      <h2>Photographiez la feuille</h2>
      <p class="mu">Posez le questionnaire bien à plat, avec de la lumière, et prenez-le en photo (une seule feuille). Valou remplit ensuite la maison : les pièces, le sol, les murs, le plafond, les châssis, le chauffage et la structure.</p>
      <label class="btn sec q-prendre">📷 ${Q.photos.length ? "Reprendre une photo" : "Prendre la photo"}<input type="file" accept="image/*" capture="environment" multiple data-qphoto hidden></label>
      ${Q.photos.length ? `<div class="galerie mini">${Q.photos.map((u, i) => `<figure class="vignette"><img src="${u}" alt="Photo ${i + 1} du questionnaire"><figcaption><small>Photo ${i + 1}</small></figcaption></figure>`).join("")}</div>` : ""}
      <p><button class="btn" data-action="q-lire" ${Q.photos.length ? "" : "disabled"}>Lire le questionnaire →</button></p>
      <p class="mu petit-t">Pas encore de questionnaire ? <a href="#/questionnaire">📝 Le télécharger et l'imprimer</a> (une page A4).</p>
    </section>`;
  return `${entete("maisons")}<main class="etroit">
    <a href="#/maison/${m.id}" class="retour">← ${esc(m.nom || "La maison")}</a>
    <h1>📝 Photo du questionnaire</h1>
    ${corps}
  </main>`;
}
/* fusionne les réponses lues dans la maison (sans rien effacer d'autre) */
function appliquerQuestionnaire(m, L) {
  const M = QUESTIONNAIRE_EXEMPLE.maison;
  if (!m.annee && M.annee) m.annee = M.annee;
  if (!m.surface && M.surface) m.surface = M.surface;
  if (!m.peb && M.peb) m.peb = M.peb;
  m.pieces = m.pieces || [];
  m.pieces.forEach((x, i) => { if (x.c == null) x.c = i; });
  L.pieces.forEach(p => {
    const ex = m.pieces.find(x => memeNom(x.nom, p.nom));
    if (ex) Object.assign(ex, { ...p, id: ex.id, c: ex.c, nom: ex.nom });
    else {
      const prises = new Set(m.pieces.map(x => x.c % COULEURS.length));
      const c = [...Array(COULEURS.length).keys()].find(i => !prises.has(i)) ?? m.pieces.length % COULEURS.length;
      m.pieces.push({ ...p, id: nouvelId(), c });
    }
  });
  m.travaux = m.travaux || [];
  L.travaux.forEach(t => {
    const ex = m.travaux.find(l => !l.pieceId && l.src !== "chauffage" && l.k === t.k);
    if (ex) Object.assign(ex, { q: t.q, marches: t.marches }); else m.travaux.push({ ...t, id: nouvelId() });
  });
  m.chauffage = { ...(m.chauffage || {}), actuel: L.chauffage.actuel, souhaite: L.chauffage.souhaite };
  appliquerChauffage(m);
}

/* ---------- didacticiel bulle par bulle : à la première ouverture de chaque page, et avec le bouton « ❔ » ---------- */
const TUTOS = {
  accueil: [
    [".parcours", "Choisissez votre projet : acheter une maison, ou rénover la vôtre."],
    [".hero .btn", "Ajoutez la maison que vous visitez : son vrai coût s'affiche tout de suite."],
    [".grille", "Vos maisons. Touchez une carte pour l'ouvrir, ou 🗑 pour la supprimer."],
    [".barre-bas, .nav-haut", "Le menu : vos maisons, la comparaison, les artisans à contacter, et le reste dans « Plus »."],
  ],
  maison: [
    [".vc-mini", "Le chiffre clé : ce que la maison va vraiment vous coûter. Le détail est dans l'onglet Projet."],
    [".onglets-m", "La fiche suit l'ordre de la visite, en 4 onglets."],
    ['.om-i[data-o="pieces"]', "Espaces : ajoutez les pièces, prenez les photos, ou photographiez le questionnaire papier."],
    ['.om-i[data-o="travaux"]', "Technique : le chauffage, la toiture, l'isolation, l'électricité et tout ce qui ne dépend pas d'une pièce."],
    ['.om-i[data-o="artisans"]', "Les pros : choisissez vos artisans, recevez leurs devis, trouvez vos négociants et contactez un courtier."],
    ['.om-i[data-o="projet"]', "Projet : le vrai coût, le PEB, le budget, la simulation d'une offre et du financement, les aides et le dossier pour la banque."],
    [".aide-btn", "Besoin d'un rappel ? Ce bouton relance le didacticiel de la page."],
  ],
  piece: [
    [".titre-piece", "La pièce et son budget, qui se met à jour à chaque case cochée."],
    ['[data-pc="sol"]', "Tapez la surface au sol : les murs (sol × 2,7) et le plafond sont calculés tout seuls."],
    [".poste, .carte-piece", "Cochez ce qui est à refaire : sol, murs, plafond, châssis, chauffage. « Moi-même » enlève la main-d'œuvre."],
    [".piece-ecran .btn[href]", "Quand c'est fini, revenez à la maison."],
  ],
  technique: [
    ['section.carte:has(.toit-dim [data-tdim="larg"])', "Les mesures de la maison : largeur de la façade, profondeur, façades et étages. Valou calcule la surface des façades (3 m par étage)."],
    [".toits", "Touchez le schéma qui ressemble au toit : avec la pente, Valou calcule la surface du toit."],
    [".gros-t", "Le plus simple : touchez ce qui est à refaire. Valou remplit les postes avec les bonnes surfaces."],
    [".grp.fixe", "Le détail poste par poste, si vous voulez ajuster une quantité."],
  ],
  "contacts-liste": [
    [".grille, main .carte", "Choisissez la maison dont vous voulez envoyer le projet aux artisans."],
  ],
  contacts: [
    [".ct-panneau, .ct-projet", "Le projet de cette maison, métier par métier."],
    [".contact-ligne", "Une ligne par métier : « Projet » pour choisir ce que vous envoyez, « Artisans » pour en choisir jusqu'à 3."],
    [".negs", "Les négociants de la région, avec ce qu'ils vendent et leurs horaires."],
  ],
  dossier: [
    [".feuille", "Votre dossier complet pour la banque : coût total, financement, travaux poste par poste et devis."],
    [".dd-ecran, .feuille h2:last-of-type", "Point 4 : tapez le montant d'un devis reçu, il remplace l'estimation de son métier."],
    ['[data-action="envoyer-banque"]', "Envoyez le dossier à la banque, ou téléchargez-le en PDF."],
  ],
};
let tuto = null;
const pageTuto = () => {
  const h = location.hash;
  if (/^#\/maison\/\w+\/piece\//.test(h)) return "piece";
  if (/^#\/maison\/\w+$/.test(h)) return document.querySelector(".gros-t") ? "technique" : "maison";
  if (/^#\/contacts\/\w+/.test(h)) return "contacts";
  if (h === "#/contacts") return "contacts-liste";
  if (/^#\/dossier\//.test(h)) return "dossier";
  if (h === "" || h === "#/" || h === "#") return document.querySelector(".parcours") ? "accueil" : null;
  return null;
};
const tutosVus = () => { try { return JSON.parse(localStorage.getItem(cle("valou_tuto_vus")) || "{}"); } catch (e) { return {}; } };
function lancerTuto(page) {
  const etapes = (TUTOS[page] || []).filter(([sel]) => { const e = document.querySelector(sel); return e && e.getClientRects().length; });
  if (!etapes.length) return;
  try { localStorage.setItem(cle("valou_tuto_vus"), JSON.stringify({ ...tutosVus(), [page]: 1 })); } catch (e) {}
  tuto = { page, etapes, i: 0 };
  dessinerTuto(true);
}
function fermerTuto() { tuto = null; document.getElementById("tuto")?.remove(); }
function dessinerTuto(defiler) {
  document.getElementById("tuto")?.remove();
  if (!tuto) return;
  const [sel, texte] = tuto.etapes[tuto.i], e = document.querySelector(sel);
  if (!e) { fermerTuto(); return; }
  if (defiler) e.scrollIntoView({ block: "center" });
  const r = e.getBoundingClientRect(), m = 6, W = innerWidth, Hh = innerHeight;
  const d = document.createElement("div");
  d.id = "tuto";
  const dernier = tuto.i === tuto.etapes.length - 1;
  d.innerHTML = `<div class="tuto-trou" style="left:${Math.max(4, r.left - m)}px;top:${r.top - m}px;width:${Math.min(W - 8, r.width + 2 * m)}px;height:${r.height + 2 * m}px"></div>
    <div class="tuto-bulle" role="dialog" aria-live="polite"><p>${esc(texte)}</p>
      <div class="tuto-pied"><small>${tuto.i + 1} / ${tuto.etapes.length}</small><span><button class="btn lien" data-tuto="passer">Passer</button><button class="btn petit-btn" data-tuto="suivant">${dernier ? "Terminer" : "Suivant →"}</button></span></div></div>`;
  document.body.appendChild(d);
  const bulle = d.querySelector(".tuto-bulle"), bh = bulle.offsetHeight, bw = bulle.offsetWidth;
  const enBas = r.bottom + m + 12 + bh < Hh - 70 || r.top - m - 12 - bh < 60;
  bulle.style.top = `${enBas ? Math.min(Hh - bh - 8, r.bottom + m + 12) : Math.max(8, r.top - m - 12 - bh)}px`;
  bulle.style.left = `${Math.min(Math.max(8, r.left + r.width / 2 - bw / 2), W - bw - 8)}px`;
  bulle.classList.add(enBas ? "dessous" : "dessus");
  d.querySelector('[data-tuto="suivant"]').focus();
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-tuto]");
  if (!t || !tuto) return;
  if (t.dataset.tuto === "passer" || tuto.i >= tuto.etapes.length - 1) fermerTuto();
  else { tuto.i++; dessinerTuto(true); }
});
addEventListener("resize", () => tuto && dessinerTuto(false));
addEventListener("scroll", () => tuto && dessinerTuto(false), { passive: true });
document.addEventListener("keydown", e => { if (e.key === "Escape" && tuto) fermerTuto(); });
/* après chaque écran : première visite de la page → didacticiel (pas pendant les tests automatiques) */
function apresAffichage() {
  const p = pageTuto();
  if (tuto && tuto.page !== p) fermerTuto();
  else if (tuto) dessinerTuto(false);
  if (!tuto && p && !tutosVus()[p] && !navigator.webdriver) setTimeout(() => { if (!tuto && pageTuto() === p) lancerTuto(p); }, 500);
}

/* ---------- confirmation avant de supprimer une maison ---------- */
let aSupprimer = null;
function fenetreSuppression() {
  const x = aSupprimer && trouver(aSupprimer);
  if (!x) return "";
  const nP = (x.pieces || []).length, nF = photosDe(x).length;
  return `<div class="conf-fond" data-action="suppr-annuler"></div>
  <div class="conf" role="alertdialog" aria-modal="true" aria-labelledby="conf-t">
    <h2 id="conf-t">Supprimer « ${esc(x.nom || "cette maison")} » ?</h2>
    <p class="mu">${nP || nF ? `Ses ${[nP && `${nP} pièce${nP > 1 ? "s" : ""}`, nF && `${nF} photo${nF > 1 ? "s" : ""}`].filter(Boolean).join(" et ")} et tout son budget seront effacés de ce téléphone.` : "Toutes ses informations seront effacées de ce téléphone."} On ne peut pas revenir en arrière.</p>
    ${x.demo ? `<p class="mu petit-t">C'est une maison de démonstration : « Préparer une présentation » la fera revenir.</p>` : ""}
    <div class="conf-boutons"><button class="btn sec" data-action="suppr-annuler">Annuler</button><button class="btn conf-ok" data-action="suppr-ok">🗑 Supprimer</button></div>
  </div>`;
}

/* ---------- profil d'un artisan (fictif) ---------- */
function ecranArtisan(id) {
  const a = artisanParId(id), x = a && METIERS.find(y => y.id === a.metier);
  if (!a) return `${entete("contacts")}<main class="etroit"><a href="#/contacts" class="retour">← Contacter</a><div class="carte vide"><p>Artisan introuvable.</p></div></main>`;
  const retour = history.length > 1 ? `<a href="javascript:history.back()" class="retour">← Retour</a>` : `<a href="#/contacts" class="retour">← Contacter</a>`;
  return `${entete("contacts")}<main class="etroit">
    ${retour}
    <article class="carte profil-art">
      <div class="pa-tete"><span class="pa-ico">${{ carreleur: "◼️", peintre: "🎨", electricien: "💡", chauffagiste: "🔥", menuisier: "🪚", couvreur: "🏠" }[a.metier] || "🔨"}</span>
        <div><h1>${esc(a.nom)}</h1><p class="mu">${esc(x ? x.t : "Entreprise générale")} · ${esc(a.lieu)}, à ${a.km} km</p><span class="badge b-exemple">Exemple fictif</span>${a.tarifs ? ` <span class="badge b-reference">Tarifs partagés avec Valou</span>` : ""}</div></div>
      <p>${esc(a.desc)}</p>
      <h2>Spécialités</h2>
      <ul class="pa-spe">${a.spe.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
      <h2>Contact</h2>
      <div class="recap">
        <div><span>Téléphone</span><b>${esc(a.tel)}</b></div>
        <div><span>E-mail</span><b>${esc(a.email)}</b></div>
        <div><span>Horaires</span><b>${esc(a.horaires)}</b></div>
        <div><span>Zone</span><b>${esc(a.lieu)} et environs (20 km)</b></div>
      </div>
      <p class="mu petit-t">Profil de démonstration : nom, coordonnées et textes inventés. Pour lui envoyer votre projet, passez par « Contacter », métier « ${esc(x ? x.t : "Entreprise générale")} ».</p>
    </article>
  </main>`;
}

/* ---------- routeur ---------- */
function afficher() {
  let brut = location.hash.replace(/^#/, "");
  if (brut === "essai") brut = "/essai"; // lien court hoono.be/demo/#essai
  if (brut === "/essai") changerMode(true);
  /* liens du présentateur : ils quittent la version d'essai sur ce téléphone (#/demo = démo complète, sans remise à zéro) */
  if (brut === "demo" || brut === "/demo" || brut === "/demo-artisan" || brut === "/demo-negociant") changerMode(false);
  if (brut === "demo" || brut === "/demo") brut = "/bienvenue";
  let h = brut === "" ? (essai ? (VERSION === "particulier" && !maisons.some(m => !m.demo) ? "/essai" : "/") : "/bienvenue") : brut; // première ouverture : la page d'intro (ou l'accueil de l'essai)
  /* version d'essai : les pages pour les professionnels et l'intro de la présentation ramènent à l'accueil de l'essai */
  if (essai && /^\/(pro|moteur|feuille-de-route|demo-|bienvenue|plus)/.test(h)) h = "/essai";
  if (h === "/presentation" && R) { preparerPresentation(true); return; }
  /* garder ouverts les groupes et réglages ouverts à l'écran (même si l'événement « toggle » n'est pas encore arrivé) */
  document.querySelectorAll("details[data-ouvert]").forEach(d => (d.open ? ouverts.add(d.dataset.ouvert) : ouverts.delete(d.dataset.ouvert)));
  const y = window.scrollY, meme = afficher.dernier === h;
  let html;
  const mm = h.match(/^\/maison\/(\w+)/), md = h.match(/^\/dossier\/(\w+)/), mp = h.match(/^\/maison\/(\w+)\/piece\/(\w+)/), mph = h.match(/^\/maison\/(\w+)\/photos/), mqp = h.match(/^\/maison\/(\w+)\/questionnaire/);
  if (h === "/bienvenue") html = ecranIntro();
  else if (h === "/essai") html = ecranEssai();
  else if (h === "/plus") html = ecranPlus();
  else if (h.startsWith("/artisan/")) html = ecranArtisan(h.split("/")[2]);
  else if (h === "/avis") html = ecranAvis();
  else if (h === "/ajouter") html = ecranAjouter();
  else if (h === "/comparer") html = ecranComparer();
  else if (h === "/contacts" || h.startsWith("/contacts/")) html = ecranContacts((h.split("/")[2] || "").split("#")[0]);
  else if (h === "/questionnaire") html = ecranQuestionnaire({ R, entete });
  else if (h.startsWith("/pro")) html = ecranPro({ R, maisons, entete, tarifs, prixNeg, negFiche, annonce, photos: m => photosDe(m) }, h.split("/")[2] || "", h.includes("/tarifs") && metier === "general" ? "carreleur" : metier);
  else if (h === "/demo-artisan" || h === "/demo-negociant") html = ecranDemoPro({ entete, maisonDemo: maisons.find(m => m.demo) }, h === "/demo-negociant" ? "negociant" : "artisan");
  else if (h === "/moteur") html = ecranMoteur({ R, entete, sim, tarifs });
  else if (h === "/feuille-de-route") html = ecranFeuille({ entete });
  else if (md && trouver(md[1])) html = ecranDossier(trouver(md[1]));
  else if (mph && trouver(mph[1])) html = ecranPhotos(trouver(mph[1]));
  else if (mqp && trouver(mqp[1])) html = ecranQuestionnairePhoto(trouver(mqp[1]));
  else if (mp && trouver(mp[1]) && (trouver(mp[1]).pieces || []).some(p => p.id === mp[2])) html = ecranPiece(trouver(mp[1]), trouver(mp[1]).pieces.find(p => p.id === mp[2]));
  else if (mm && trouver(mm[1])) html = ecranMaison(trouver(mm[1]));
  else html = ecranAccueil();
  if (!mph && camera.flux) fermerCamera(); // on quitte l'écran photos : la caméra s'éteint
  $app.innerHTML = html + fenetreSuppression();
  if (document.getElementById("viseur")) ouvrirCamera();
  afficher.dernier = h;
  window.scrollTo(0, meme ? y : 0);
  apresAffichage();
  if (/\/contacts\/\w+#devis$/.test(location.hash)) document.querySelector(".devis-recus, .contact-ligne")?.scrollIntoView({ block: "start" });
}

/* ---------- interactions ---------- */

const maisonCourante = () => {
  const mm = location.hash.match(/^#\/(?:maison|dossier|contacts)\/(\w+)/);
  return mm && trouver(mm[1]);
};

document.addEventListener("click", e => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const a = el.dataset.action, m = maisonCourante();
  if (a === "imprimer") {
    /* le questionnaire s'imprime en A4 à l'horizontale, sans réduction (le dossier pour la banque reste en portrait) */
    let st = null;
    if (document.querySelector(".questionnaire")) { st = document.createElement("style"); st.textContent = "@page { size: A4 landscape; margin: 8mm; }"; document.head.appendChild(st); }
    window.print();
    if (st) setTimeout(() => st.remove(), 1000);
  }
  if (a === "envoi-ouvrir" && m) { envoiOuvert = m.id; afficher(); }
  if (a === "ct-ouvrir" && m) { const c = m.id + ":" + el.dataset.metier; ctOuvert[c] = ctOuvert[c] === el.dataset.v ? null : el.dataset.v; afficher(); }
  if (a === "envoi-metier" && m) {
    const id = el.dataset.metier, choisis = (m.artisansChoisis || {})[id] || [], x = METIERS.find(y => y.id === id);
    const exclues = new Set((m.partiesExclues || {})[id] || []), parts = partiesMetier(m, calculerBudget(R, m), x).map(q => q.cle).filter(c => !exclues.has(c));
    if (!choisis.length || !parts.length) return;
    m.envoi = m.envoi || { date: Date.now(), metiers: [] };
    if (!m.envoi.metiers.includes(id)) m.envoi.metiers.push(id);
    m.envoiMetier = { ...(m.envoiMetier || {}), [id]: { date: Date.now(), artisans: choisis, parts } };
    sauver(); afficher();
  }
  if (a === "envoi-annuler") { envoiOuvert = null; afficher(); }
  if (a === "envoi-ok" && m) {
    const ids = [...document.querySelectorAll("[data-envoi-metier]")].filter(x => x.checked).map(x => x.dataset.envoiMetier);
    if (!ids.length) return;
    m.envoi = { date: Date.now(), metiers: ids }; envoiOuvert = null; sauver(); afficher();
  }
  if (a === "envoyer-banque") {
    document.getElementById("envoi").innerHTML = `<p class="alerte ok">✓ Dossier envoyé à votre banque. <small>(Démonstration : aucun envoi réel.)</small></p>`;
  }
  if (el.dataset.simN != null) { sim.n = +el.dataset.simN; afficher(); }
  if (a === "pro-ok") {
    el.closest(".d-act").outerHTML = `<span class="d-act d-devis"><label>Montant de votre devis, TVA comprise<span class="saisie"><input type="number" min="0" step="any" inputmode="decimal" class="d-devis-m" placeholder="ex. 4800"><i>€</i></span></label>
      <label>Délai ou remarque <small class="mu">(facultatif)</small><input class="d-devis-n" placeholder="ex. disponible en mars, carrelage fourni"></label>
      <span class="actions-g"><button class="btn" data-action="pro-devis-envoyer">📩 Envoyer le devis</button><button class="btn lien" data-action="pro-devis-annuler">Annuler</button></span></span>`;
    document.querySelector(".d-devis-m")?.focus();
    return;
  }
  if (a === "pro-devis-annuler") { afficher(); return; }
  if (a === "pro-devis-envoyer") {
    const carte = el.closest(".demande"), mm = trouver(carte.dataset.maison || ""), met = carte.dataset.metier;
    const champ = carte.querySelector(".d-devis-m"), montant = +(champ.value || 0), note = (carte.querySelector(".d-devis-n").value || "").trim();
    if (!(montant > 0)) { champ.focus(); return; }
    if (mm && met) {
      mm.reponses = (mm.reponses || []).filter(r => r.metier !== met);
      mm.reponses.push({ metier: met, type: "devis", montant: Math.round(montant * 100) / 100, note, artisanId: `${met}-1`, date: Date.now() });
      sauver();
    }
    carte.querySelector(".d-act").outerHTML = `<span class="d-act ok">✓ Devis de ${euros(montant)} envoyé : le client le reçoit dans « Contacter » (📩 Devis reçus).</span>`;
    return;
  }
  if (a === "pro-non" || a === "pro-visite") {
    const carte = el.closest(".demande");
    const mm = trouver(carte.dataset.maison || "");
    if (mm && carte.dataset.metier) {
      mm.reponses = (mm.reponses || []).filter(r => r.metier !== carte.dataset.metier);
      mm.reponses.push({ metier: carte.dataset.metier, type: a === "pro-visite" ? "visite" : "non", artisanId: `${carte.dataset.metier}-1`, date: Date.now() });
      sauver();
    }
    carte.querySelector(".d-act").outerHTML = a === "pro-visite"
        ? `<span class="d-act ok">✓ Le client est prévenu : il recevra votre proposition de visite et choisira un moment.</span>`
        : `<span class="d-act mu">Demande transmise à un autre artisan.</span>`;
  }
  if (a === "exemple") { const x = chargerDemo(); if (x) location.hash = `#/maison/${x.id}`; }
  if (a === "presentation") preparerPresentation();
  if (a === "q-lire" && qPhoto.photos.length) {
    qPhoto.etape = "lecture"; afficher();
    setTimeout(() => { qPhoto.lu = maisonDepuisQuestionnaire(QUESTIONNAIRE_EXEMPLE, nouvelId); qPhoto.etape = "resultat"; afficher(); }, 1400);
  }
  if (a === "q-recommencer") { qPhoto.photos.forEach(u => URL.revokeObjectURL(u)); qPhoto = { maisonId: qPhoto.maisonId, photos: [], etape: "photos", lu: null }; afficher(); }
  if (a === "q-appliquer") {
    const mq = trouver(qPhoto.maisonId);
    if (mq && qPhoto.lu) { appliquerQuestionnaire(mq, qPhoto.lu); sauver(); ongletsM[mq.id] = "pieces"; qPhoto.photos.forEach(u => URL.revokeObjectURL(u)); qPhoto = { maisonId: null, photos: [], etape: "photos", lu: null }; location.hash = `#/maison/${mq.id}`; }
  }
  if (a === "parcours") { choisirParcours(el.dataset.p); afficher(); }
  if (a === "tuto") { const p = pageTuto(); if (p) lancerTuto(p); else { const b = document.createElement("div"); b.className = "tuto-rien"; b.textContent = "Pas de didacticiel pour cette page."; document.body.appendChild(b); setTimeout(() => b.remove(), 2200); } }
  if (a === "toit-q") { const i = document.querySelector(`[data-mq="${el.dataset.k}"]`); if (i) { i.value = el.dataset.q; i.dispatchEvent(new Event("change", { bubbles: true })); } }
  if (a === "essai-reno") { choisirParcours("renovation"); brouillon = null; location.hash = "#/ajouter"; }
  if (a === "gros" && m) { basculerGros(m, el.dataset.g); sauver(); afficher(); }
  if (a === "toit" && m) { m.toiture = m.toiture === el.dataset.t ? null : el.dataset.t; sauver(); afficher(); }
  if (a === "courtier-envoyer" && m) { m.envoiCourtier = { ...(m.envoiCourtier || {}), [el.dataset.id]: Date.now() }; sauver(); afficher(); }
  if (a === "devis-utiliser") {
    const mq = trouver(el.dataset.maison), r = mq && devisRecus(mq).find(y => y.metier === el.dataset.metier);
    if (r) {
      const M = { ...(mq.devisMontants || {}) }; M[r.metier] = { ...(M[r.metier] || {}), [r.artisanId]: r.montant }; mq.devisMontants = M;
      mq.devisChoisi = { ...(mq.devisChoisi || {}), [r.metier]: r.artisanId }; sauver(); afficher();
    }
  }
  if (a === "onglet-m" && m) {
    ongletsM[m.id] = el.dataset.o; afficher();
    const t = document.querySelector(".onglets-m");
    if (t) { const y = t.getBoundingClientRect().top + window.scrollY - (document.querySelector(".top")?.offsetHeight || 0) - 4; if (window.scrollY > y) window.scrollTo(0, y); }
  }
  if (a === "avis-envoyer") {
    const txt = texteAvis();
    const fin = msg => { avisMessage = msg; afficher(); };
    if (navigator.share) navigator.share({ title: "Mon avis sur Valou", text: txt }).then(() => fin("Merci ! Votre avis est parti."), () => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => fin("Votre avis est copié : collez-le dans un message à la personne qui vous a proposé l'essai."), () => fin("Copiez votre avis à la main : la copie automatique n'est pas possible ici."));
    else fin("Copiez votre avis à la main : la copie automatique n'est pas possible ici.");
  }
  if (a === "suppr-ligne" && m) { m.travaux = m.travaux.filter(l => l.id !== el.dataset.id); sauver(); afficher(); }
  if (a === "ajout-piece" && m) {
    const nom = (document.getElementById("np-nom").value || "").trim(), type = document.getElementById("np-type").value;
    const T = TYPES_PIECE.find(t => t[0] === type);
    m.pieces = m.pieces || [];
    const prises = new Set(m.pieces.map((x, i) => (x.c ?? i) % COULEURS.length));
    const c = [...Array(COULEURS.length).keys()].find(i => !prises.has(i)) ?? m.pieces.length % COULEURS.length;
    m.pieces.forEach((x, i) => { if (x.c == null) x.c = i; }); // fige les couleurs existantes
    const pc = { id: nouvelId(), nom: nom || (type === "standard" ? `Pièce ${m.pieces.length + 1}` : T[1]), type, sol: null, murs: null, wi: [], c };
    m.pieces.push(pc);
    appliquerChauffage(m);
    sauver();
    ongletsM[m.id] = "pieces";
    location.hash = `#/maison/${m.id}/piece/${pc.id}`;
  }
  if (a === "suppr-piece" && m && confirm("Supprimer cette pièce et ses travaux ?")) {
    m.pieces.forEach((x, i) => { if (x.c == null) x.c = i; }); // chaque pièce garde sa couleur
    m.pieces = m.pieces.filter(p => p.id !== el.dataset.id);
    appliquerChauffage(m);
    sauver(); afficher();
  }
  /* supprimer une maison : confirmation dans l'appli (les fenêtres du navigateur sont bloquées sur certains téléphones) */
  if (a === "suppr-demande") { aSupprimer = el.dataset.id; afficher(); document.querySelector(".conf-ok")?.focus(); }
  if (a === "suppr-annuler") { aSupprimer = null; afficher(); }
  if (a === "suppr-ok") {
    const x = trouver(aSupprimer); aSupprimer = null;
    if (x) {
      supprimerPhotosMaison(x.id).catch(() => {}); delete photosCache[x.id];
      maisons = maisons.filter(y => y !== x); if (selection) selection = selection.filter(id => id !== x.id); sauver();
      if (location.hash.includes(x.id)) { location.hash = "#/"; return; }
    }
    afficher();
  }
  if (a === "suppr-photo" && m && confirm("Supprimer cette photo ?")) { supprimerPhoto(el.dataset.id).then(() => rechargerPhotos(m)); }
  if (a === "visite-suivante") { visite.saisie = true; afficher(); setTimeout(() => { const i = document.getElementById("visite-nom"); if (i) i.focus(); }, 0); }
  if (a === "visite-annuler") { visite.saisie = false; afficher(); }
  if (a === "declencher" && m) { declencher(m); return; }
  if (a === "visite-fin" && m) { fermerCamera(); visite = { maisonId: m.id, nom: "", saisie: true }; afficher(); document.querySelector(".sous-titre")?.scrollIntoView({ behavior: "smooth" }); }
  if (a === "creer-pieces-photos" && m) {
    [...new Set(photosDe(m).map(p => p.nomPiece))].filter(g => !pieceDePhoto(m, { nomPiece: g })).forEach(g => ajouterPieceNommee(m, g));
    appliquerChauffage(m); sauver(); afficher();
  }
  if (a === "creer-piece-photo" && m) {
    ajouterPieceNommee(m, el.dataset.nom);
    appliquerChauffage(m);
    sauver(); afficher();
  }
});

document.addEventListener("change", e => {
  const t = e.target, m = maisonCourante();
  /* dossier pour la banque : montant et choix des devis */
  if (t.dataset.devisMontant != null && m) {
    const [met, id] = t.dataset.devisMontant.split("|"), v = t.value === "" ? null : +t.value;
    const M = { ...(m.devisMontants || {}) }; M[met] = { ...(M[met] || {}) }; if (v > 0) M[met][id] = v; else delete M[met][id];
    m.devisMontants = M;
    if (v > 0 && !(m.devisChoisi || {})[met]) m.devisChoisi = { ...(m.devisChoisi || {}), [met]: id };
    sauver(); afficher(); return;
  }
  if (t.dataset.devisChoix != null && m) { const C = { ...(m.devisChoisi || {}) }; if (t.value) C[t.dataset.devisChoix] = t.value; else delete C[t.dataset.devisChoix]; m.devisChoisi = C; sauver(); afficher(); return; }
  /* version d'essai : réponses de l'avis */
  if (t.dataset.avis) { avis[t.dataset.avis] = t.value; try { localStorage.setItem(cle("valou_avis"), JSON.stringify(avis)); } catch (e) {} if (t.type === "radio") afficher(); return; }
  /* contacter : matériau souhaité et remarque pour l'artisan */
  if (t.dataset.mat != null && m) { m.materiaux = { ...(m.materiaux || {}), [t.dataset.mat]: t.value.trim() }; sauver(); afficher(); return; }
  if (t.dataset.noteMetier && m) { m.notesMetier = { ...(m.notesMetier || {}), [t.dataset.noteMetier]: t.value.trim() }; sauver(); return; }
  /* contacter : parties du projet à envoyer */
  if (t.dataset.part && m) {
    const id = t.closest(".contact-ligne").querySelector("[data-action=ct-ouvrir]").dataset.metier, X = new Set((m.partiesExclues || {})[id] || []);
    if (t.checked) X.delete(t.dataset.part); else X.add(t.dataset.part);
    m.partiesExclues = { ...(m.partiesExclues || {}), [id]: [...X] };
    sauver(); afficher(); return;
  }
  /* contacter : choix de 3 artisans au maximum par métier */
  if (t.dataset.art && m) {
    const id = t.closest("[data-metier-choix]").dataset.metierChoix, L = new Set((m.artisansChoisis || {})[id] || []);
    if (t.checked) { if (L.size >= 3) { t.checked = false; return; } L.add(t.dataset.art); } else L.delete(t.dataset.art);
    m.artisansChoisis = { ...(m.artisansChoisis || {}), [id]: [...L] };
    sauver(); afficher(); return;
  }
  /* photo du questionnaire : les pages choisies restent sur l'appareil (aperçu seulement) */
  if (t.dataset.qphoto != null) { [...(t.files || [])].forEach(f => qPhoto.photos.push(URL.createObjectURL(f))); afficher(); return; }
  /* photos de la visite */
  if (t.dataset.photoInput != null && m) {
    const nom = t.dataset.nom;
    const fichiers = [...(t.files || [])];
    if (!nom || !fichiers.length) return;
    Promise.all(fichiers.map(f => ajouterPhoto(m.id, nom, f))).then(() => rechargerPhotos(m)).catch(() => alert("La photo n'a pas pu être enregistrée sur cet appareil."));
    return;
  }
  if (t.dataset.photoRenommer && m) {
    let nom = t.value;
    if (nom === "__autre") nom = (prompt("Nom de la pièce") || "").trim();
    if (nom) renommerPhoto(t.dataset.photoRenommer, nom).then(() => rechargerPhotos(m)); else afficher();
    return;
  }
  if (t.dataset.peb && m) { m[t.dataset.peb] = t.dataset.peb === "peb" ? t.value || null : t.value === "" ? null : +t.value; sauver(); afficher(); return; }
  if (t.dataset.negfiche || t.dataset.negrayon || t.dataset.neghor || t.dataset.annonce) { majProFormulaire(t); afficher(); return; }
  if (t.dataset.negprix) { const v = t.value === "" ? null : +t.value; if (v > 0) prixNeg[t.dataset.negprix] = v; else delete prixNeg[t.dataset.negprix]; appliquerPrixNeg(); afficher(); return; }
  if (t.dataset.metier != null) { metier = t.value; afficher(); return; }
  if (t.dataset.simK != null) { sim.k = t.value; afficher(); return; }
  if (t.dataset.tarif) { tarifs.p[t.dataset.tarif] = t.value === "" ? null : +t.value; sauverTarifs(); afficher(); return; }
  if (t.dataset.tarifOk != null) { tarifs.ok = t.checked; sauverTarifs(); afficher(); return; }
  /* comparer */
  if (t.dataset.comp) {
    const id = t.dataset.comp;
    selection = t.checked ? [...selection.filter(x => x !== id), id].slice(-3) : selection.filter(x => x !== id);
    afficher();
    return;
  }
  /* dimensions du toit */
  if (t.dataset.tdim && m) {
    m.toitDim = { ...(m.toitDim || {}), [t.dataset.tdim]: t.value === "" ? null : +t.value };
    sauver();
    afficher();
    return;
  }
  /* travaux inclus ou non dans le prêt */
  if (t.dataset.pret != null && m) {
    const H = new Set((m.fin || {}).horsPret || []);
    t.checked ? H.delete(t.dataset.pret) : H.add(t.dataset.pret);
    m.fin = { ...(m.fin || {}), horsPret: [...H] };
    ouverts.add("pret-" + m.id);
    sauver();
    afficher();
    return;
  }
  /* dossier : financement */
  if (t.dataset.fin && m) {
    m.fin = { ...(m.fin || {}), [t.dataset.fin]: t.value === "" ? null : +t.value };
    sauver();
    afficher();
    return;
  }
  /* formulaire d'ajout */
  if (t.form && t.form.id === "f-ajout" && t.name) { brouillon[t.name] = t.type === "checkbox" ? t.checked : t.value; return; }
  if (!m) return;
  /* écran maison */
  if (t.dataset.f) {
    const f = t.dataset.f;
    m[f] = t.type === "checkbox" ? t.checked : t.value === "" ? null : +t.value;
  } else if (t.dataset.h) {
    m.rep = { ...(m.rep || {}), [t.dataset.h]: t.value };
  } else if (t.dataset.l) {
    const [id, f] = t.dataset.l.split(":"), l = m.travaux.find(x => x.id === id);
    if (!l) return;
    l[f] = t.type === "checkbox" ? t.checked : t.value;
    if (f === "q") delete l.auto;
  } else if (t.dataset.mq) {
    /* liste fixe « toute la maison » : une ligne par poste, supprimée si la quantité est vide */
    const k = t.dataset.mq, l = m.travaux.find(x => !x.pieceId && x.src !== "chauffage" && x.k === k), q = t.value === "" ? 0 : +t.value;
    if (q > 0) { if (l) { l.q = q; delete l.auto; } else m.travaux.push({ id: nouvelId(), piece: "Toute la maison", k, q }); }
    else m.travaux = m.travaux.filter(x => x !== l);
  } else if (t.dataset.mmarches) {
    /* escalier : on encode les marches, l'appli compte 16 marches = 1 escalier */
    const k = t.dataset.mmarches, l = m.travaux.find(x => !x.pieceId && x.src !== "chauffage" && x.k === k), n = t.value === "" ? 0 : +t.value;
    if (n > 0) { if (l) { l.marches = n; delete l.q; } else m.travaux.push({ id: nouvelId(), piece: "Toute la maison", k, marches: n }); }
    else m.travaux = m.travaux.filter(x => x !== l);
  } else if (t.dataset.mme) {
    const l = m.travaux.find(x => !x.pieceId && x.src !== "chauffage" && x.k === t.dataset.mme);
    if (l) l.soiMeme = t.checked;
  } else if (t.dataset.pc || t.dataset.pcwi) {
    const mp = location.hash.match(/\/piece\/(\w+)/), pc = mp && (m.pieces || []).find(x => x.id === mp[1]);
    if (!pc) return;
    if (t.dataset.pcwi) { const w = new Set(pc.wi || []); t.checked ? w.add(t.dataset.pcwi) : w.delete(t.dataset.pcwi); pc.wi = [...w]; }
    else { const f = t.dataset.pc; pc[f] = t.type === "checkbox" ? t.checked : t.type === "number" ? (t.value === "" ? null : +t.value) : t.value; }
  } else if (t.dataset.mchf) {
    m.chauffage = { ...(m.chauffage || {}), [t.dataset.mchf]: t.value };
    appliquerChauffage(m);
  } else return;
  sauver();
  afficher();
});

function majProFormulaire(t) {
  if (t.dataset.negfiche) { negFiche[t.dataset.negfiche] = t.value; delete negFiche.fictif; ecrire("valou_demo_negfiche", negFiche); }
  if (t.dataset.negrayon) {
    const S = new Set(negFiche.rayons || []); t.checked ? S.add(t.dataset.negrayon) : S.delete(t.dataset.negrayon);
    negFiche.rayons = [...S]; delete negFiche.fictif; ecrire("valou_demo_negfiche", negFiche);
  }
  if (t.dataset.neghor) { negFiche.horaires = { ...(negFiche.horaires || {}), [t.dataset.neghor]: t.value }; delete negFiche.fictif; ecrire("valou_demo_negfiche", negFiche); }
  if (t.dataset.annonce) { annonce[t.dataset.annonce] = t.type === "checkbox" ? t.checked : t.value; ecrire("valou_demo_annonce", annonce); }
}
document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.negfiche || t.dataset.neghor || t.dataset.annonce) { majProFormulaire(t); return; }
  if (t.form && t.form.id === "f-ajout" && t.name && t.type !== "checkbox") brouillon[t.name] = t.value;
});

document.addEventListener("submit", e => {
  if (e.target.id === "f-visite") {
    e.preventDefault();
    const nom = document.getElementById("visite-nom").value.trim();
    if (nom) { visite.nom = nom; visite.saisie = false; afficher(); }
    return;
  }
  if (e.target.id !== "f-ajout") return;
  e.preventDefault();
  const m = creerMaison(brouillon);
  brouillon = null;
  location.hash = `#/maison/${m.id}`;
});

window.addEventListener("hashchange", () => { aSupprimer = null; afficher(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && aSupprimer) { aSupprimer = null; afficher(); } });

Promise.all([chargerReferences(), fetch(DEMO_DIR + "maison-demo.json", { cache: "no-cache" }).then(r => (r.ok ? r.json() : null)).catch(() => null)])
  .then(([r, d]) => {
    R = r;
    DEMO = d;
    appliquerPrixNeg();
    /* première visite : la maison de démonstration est déjà là */
    let vu = false;
    try { vu = !!localStorage.getItem(cle("valou_demo_vu")); localStorage.setItem(cle("valou_demo_vu"), "1"); } catch (e) {}
    if (!vu && DEMO && !maisons.some(m => m.demo)) chargerDemo();
    /* maisons de démonstration d'une ancienne version (enregistrées sur l'appareil) : remplacées par la version actuelle */
    else if (DEMO && maisons.some(m => m.demo && m.demoVersion !== DEMO.version)) chargerDemo();
    afficher();
  })
  .catch(() => { $app.innerHTML = `<main><div class="alerte">Impossible de charger les prix de référence. Vérifiez la connexion et rechargez la page.</div></main>`; });
