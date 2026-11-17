/* Valou — prototype de démonstration. Écrans : accueil, ajouter une maison, le vrai coût d'une maison, comparer, dossier pour la banque. */
import { chargerReferences } from "./donnees.js";
import { calculerBudget, coutTotal, mensualite, travauxRapides, RAPIDE, HYPOTHESES, FIABILITE, unitePoste } from "./moteur.js";
import { lireMaisons, ecrireMaisons, nouvelId } from "./stockage.js";
import { euros, euros2, nombre, esc } from "./format.js";
import { ecranPro, ecranMoteur, ecranFeuille } from "./vitrine.js";

let R = null;
let maisons = lireMaisons();
const $app = document.getElementById("app");
const sauver = () => ecrireMaisons(maisons);
const trouver = id => maisons.find(m => m.id === id);

/* ---------- regroupement des postes pour l'affichage ---------- */
const GROUPES = ["Cuisine et salle de bain", "Finitions intérieures", "Menuiseries", "Électricité", "Sanitaire et chauffage", "Gros œuvre", "Isolation", "Toiture", "Extérieurs", "Escalier"];
const groupe = p => (/^(meu_|wc_)/.test(p.k) ? "Cuisine et salle de bain" : p.g === "Espaces" ? "Finitions intérieures" : p.g === "Sanitaire" ? "Sanitaire et chauffage" : p.g);

/* ---------- petits composants ---------- */
const badge = f => (f ? `<span class="badge b-${f}" title="${esc(FIABILITE[f].d)}">${esc(FIABILITE[f].t)}</span>` : "");
const qte = (Q, u) => `${nombre(Q)} ${Q > 1 && (u === "pièce" || u === "escalier") ? u + "s" : u}`;
const fourchette = t => `${euros(t[0], 100)} – ${euros(t[2], 100)}`;

function entete(actif) {
  const lien = (h, t, id, bientot) =>
    bientot
      ? `<span class="nav-i off" title="Prochaine étape">${t}<small>bientôt</small></span>`
      : `<a class="nav-i ${actif === id ? "on" : ""}" href="${h}">${t}</a>`;
  return `<header class="top">
    <a href="#/" class="marque" aria-label="Valou, accueil"><img src="../logo.png" alt="Valou"></a>
    <nav>${lien("#/", "Mes maisons", "maisons")}${lien("#/comparer", "Comparer", "comparer")}${lien("#/pro/artisan", "Professionnels", "pro")}${lien("#/moteur", "Notre moteur", "moteur")}${lien("#/feuille-de-route", "Feuille de route", "feuille")}</nav>
  </header>`;
}

/* ---------- écran : accueil ---------- */
function ecranAccueil() {
  const cartes = maisons
    .map(m => {
      const b = calculerBudget(R, m), c = coutTotal(m, b);
      return `<a class="carte maison" href="#/maison/${m.id}">
        <div class="m-tete"><b>${esc(m.nom || "Maison sans nom")}</b>${m.exemple ? `<span class="badge b-exemple">Fictive</span>` : ""}</div>
        <div class="mu">${esc(m.commune || "")}${m.annee ? ` · ${esc(m.annee)}` : ""}${m.surface ? ` · ${nombre(m.surface)} m²` : ""}</div>
        <div class="m-chiffres"><div><small>Prix demandé</small><b>${euros(c.prix)}</b></div><div><small>Vrai coût estimé</small><b class="or">${euros(c.total[1], 100)}</b></div></div>
      </a>`;
    })
    .join("");
  return `${entete("maisons")}
  <main>
    <section class="hero">
      <h1>Combien cette maison va-t-elle <em>vraiment</em> vous coûter ?</h1>
      <p>Prix d'achat, droits d'enregistrement, notaire et travaux : le vrai budget, poste par poste, avant de faire une offre.</p>
      <a class="btn" href="#/ajouter">＋ Ajouter une maison</a>
    </section>
    ${maisons.length ? `<h2>Mes maisons</h2><div class="grille">${cartes}</div>` : `<div class="vide carte"><p>Aucune maison pour l'instant.</p></div>`}
    ${DEMO ? `<p class="reinit"><button class="btn lien" data-action="exemple">${maisons.some(m => m.demo) ? "Remettre les maisons de démonstration à zéro" : "Charger les maisons de démonstration"}</button></p>` : ""}
  </main>`;
}

/* ---------- écran : ajouter une maison ---------- */
let brouillon = null;
const brouillonVide = () => ({ nom: "", commune: "", prix: "", annee: "", surface: "", etat: "rafraichir", uniqueHabitation: true, choix: {} });

function ecranAjouter() {
  const b = (brouillon = brouillon || brouillonVide());
  const champ = (id, t, type = "text", extra = "") =>
    `<label>${t}<input name="${id}" type="${type}" value="${esc(b[id])}" ${extra}></label>`;
  const cases = RAPIDE.map(r => choixHTML(r, b.choix[r.id] || {})).join("");
  return `${entete("")}
  <main class="etroit">
    <a href="#/" class="retour">← Mes maisons</a>
    <h1>Ajouter une maison</h1>
    <form id="f-ajout" class="carte">
      <h2>La maison</h2>
      <div class="champs">
        ${champ("nom", "Nom (pour vous)", "text", 'placeholder="Ex. : maison rue des Tilleuls" required')}
        ${champ("commune", "Commune", "text", 'placeholder="Ex. : Namur"')}
        ${champ("prix", "Prix demandé (€)", "number", 'min="0" inputmode="numeric" required')}
        ${champ("annee", "Année de construction", "number", 'min="1800" max="2030" inputmode="numeric" required')}
        ${champ("surface", "Surface habitable (m²)", "number", 'min="10" inputmode="numeric" required')}
        <label>État général<select name="etat">
          ${[["bon", "Bon état"], ["rafraichir", "À rafraîchir"], ["renover", "À rénover (support abîmé)"]].map(([v, t]) => `<option value="${v}" ${b.etat === v ? "selected" : ""}>${t}</option>`).join("")}
        </select></label>
        <label class="cb large"><input type="checkbox" name="uniqueHabitation" ${b.uniqueHabitation ? "checked" : ""}> Ce sera ma seule habitation, et j'y habiterai (droits d'enregistrement réduits à 3 % en Wallonie)</label>
      </div>
      <h2>Que faut-il refaire ?</h2>
      <p class="mu">Cochez ce que vous voyez pendant la visite. Vous pourrez tout affiner pièce par pièce ensuite.</p>
      <div class="choix-liste">${cases}</div>
      <button class="btn" type="submit">Voir le vrai coût →</button>
    </form>
  </main>`;
}

function choixHTML(r, c) {
  return `<div class="choix ${c.on ? "on" : ""}" data-bloc="${r.id}">
      <label class="cb"><input type="checkbox" data-choix="${r.id}" ${c.on ? "checked" : ""}> ${esc(r.t)}</label>
      ${r.nombre && c.on ? `<label class="petit">${esc(r.nombre)}<input type="number" min="0" inputmode="decimal" data-choixn="${r.id}" value="${esc(c.n || "")}"></label>` : ""}
      ${r.hyp && c.on ? `<small class="mu">Quantité estimée : ${esc(r.hyp)}</small>` : ""}
    </div>`;
}

function creerMaison(b, exemple = false) {
  const m = {
    id: nouvelId(),
    nom: b.nom, commune: b.commune, prix: +b.prix || 0, annee: +b.annee || null, surface: +b.surface || 0,
    etat: b.etat, uniqueHabitation: !!b.uniqueHabitation, fraisNotaire: null, exemple,
    rep: { etat: b.etat === "renover" ? "oui" : "non" },
  };
  m.travaux = travauxRapides(m, b.choix).map(t => ({ ...t, id: nouvelId() }));
  maisons.unshift(m);
  sauver();
  return m;
}

/* maisons de démonstration : demo/maison-demo.json (fictives, à remplacer par de vraies maisons) */
let DEMO = null;
function chargerDemo() {
  if (!DEMO || !DEMO.maisons) return null;
  maisons = maisons.filter(m => !m.demo);
  const L = DEMO.maisons.map(d => ({ ...d, id: nouvelId(), demo: true, exemple: true, rep: { ...(d.rep || {}) }, travaux: d.travaux.map(t => ({ ...t, id: nouvelId() })) }));
  maisons.unshift(...L);
  selection = null;
  sauver();
  return L[0];
}

/* ---------- écran : le vrai coût d'une maison ---------- */
function ecranMaison(m) {
  const b = calculerBudget(R, m), c = coutTotal(m, b);
  const surcout = c.total[1] - c.prix, pct = c.prix ? Math.round((surcout / c.prix) * 100) : 0;
  const manques = b.postes.filter(p => p.manques.length);

  /* barre de composition du coût (valeurs moyennes) */
  const parts = [["Prix d'achat", c.prix, "p1"], ["Droits d'enregistrement", c.droits, "p2"], ["Notaire", c.notaire || 0, "p3"], ["Travaux (TVA et imprévus compris)", c.travaux[1], "p4"]].filter(x => x[1] > 0);
  const somme = parts.reduce((s, x) => s + x[1], 0) || 1;
  const barre = `<div class="barre" role="img" aria-label="Composition du coût">${parts.map(([t, v, k]) => `<span class="${k}" style="width:${(v / somme) * 100}%" title="${esc(t)} : ${euros(v)}"></span>`).join("")}</div>
    <ul class="legende">${parts.map(([t, v, k]) => `<li><i class="${k}"></i>${esc(t)}<b>${euros(v, k === "p4" ? 100 : 1)}</b></li>`).join("")}${c.notaire == null ? `<li><i class="p3"></i>Notaire<b class="manque">à compléter</b></li>` : ""}</ul>`;

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

  /* travaux pièce par pièce */
  const options = sel =>
    [...new Set(R.liste.map(groupe))].sort((a, z) => GROUPES.indexOf(a) - GROUPES.indexOf(z)).map(g =>
      `<optgroup label="${esc(g)}">${R.liste.filter(p => groupe(p) === g).map(p => `<option value="${p.k}" ${p.k === sel ? "selected" : ""}>${esc(p.n)}</option>`).join("")}</optgroup>`).join("");
  const lignes = b.lignes.map((l, i) => {
    const p = R.postes[l.k];
    return `<tr>
      <td data-l="Pièce"><input data-l="${i}:piece" value="${esc(l.piece || "")}" aria-label="Pièce"></td>
      <td data-l="Travail"><select data-l="${i}:k" aria-label="Travail">${options(l.k)}</select></td>
      <td data-l="Quantité" class="q"><input type="number" min="0" step="any" inputmode="decimal" data-l="${i}:q" value="${esc(l.q)}" aria-label="Quantité"><small>${esc(p ? unitePoste(p.u, l.k) : "")}</small>${l.auto ? `<small class="mu auto" title="${esc(l.auto)}">auto</small>` : ""}</td>
      <td data-l="Moi-même" class="c"><input type="checkbox" data-l="${i}:soiMeme" ${l.soiMeme ? "checked" : ""} aria-label="Je le fais moi-même"></td>
      <td data-l="Budget" class="r">${l.fiab ? euros(l.total[1], 10) : "–"}</td>
      <td class="c"><button class="x" data-action="suppr-ligne" data-i="${i}" aria-label="Supprimer">✕</button></td>
    </tr>`;
  }).join("");

  return `${entete("maisons")}
  <main>
    <a href="#/" class="retour">← Mes maisons</a>
    <div class="titre-maison">
      <h1>${esc(m.nom || "Maison")}</h1>
      ${m.exemple ? `<span class="badge b-exemple">Fictive</span>` : ""}
      ${m.description ? `<p class="desc">${esc(m.description)}</p>` : ""}
      <p class="mu">${[m.commune, m.annee && `construite en ${m.annee}`, m.surface && `${nombre(m.surface)} m² habitables`].filter(Boolean).map(esc).join(" · ")}</p>
    </div>

    <section class="carte vrai-cout">
      <div class="vc-g">
        <small>Le vrai coût de cette maison</small>
        <div class="gros">${euros(c.total[1], 100)}</div>
        <div class="mu">entre ${fourchette(c.total)}</div>
        ${c.prix ? `<p class="choc">soit <b>${euros(surcout, 100)}</b> de plus que le prix affiché <span>(+${pct} %)</span></p>` : ""}
      </div>
      <div class="vc-d">${barre}</div>
    </section>

    ${manques.length ? `<section class="alerte"><b>${manques.length} poste${manques.length > 1 ? "s" : ""} incomplet${manques.length > 1 ? "s" : ""} : un prix manque, il n'est pas compté.</b>
      <ul>${manques.map(p => `<li>${esc(p.n)} : ${p.manques.map(esc).join(" ; ")}</li>`).join("")}</ul></section>` : ""}

    <div class="deux">
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
        <p class="legende-f">${Object.keys(FIABILITE).map(f => `${badge(f)} <small class="mu">${esc(FIABILITE[f].d)}</small>`).join("<br>")}</p>
      </section>

      <div class="pile">
        <section class="carte">
          <h2>L'achat</h2>
          <div class="champs">
            <label>Prix (€)<input type="number" min="0" inputmode="numeric" data-f="prix" value="${esc(m.prix)}"></label>
            <label class="cb large"><input type="checkbox" data-f="uniqueHabitation" ${m.uniqueHabitation !== false ? "checked" : ""}> Seule habitation, occupée par moi</label>
            <div class="ligne"><span>Droits d'enregistrement (${String(c.tauxDroits).replace(".", ",")} %)</span><b>${euros(c.droits)}</b></div>
            <small class="mu">Taux légal wallon, à confirmer par le notaire.</small>
            <label>Honoraires et frais du notaire (€)<input type="number" min="0" inputmode="numeric" data-f="fraisNotaire" value="${esc(m.fraisNotaire ?? "")}" placeholder="à compléter"></label>
            <small class="mu">Montant de la simulation du notaire (barème officiel : simulateur sur notaire.be).</small>
          </div>
        </section>
        <section class="carte">
          <h2>Hypothèses du calcul</h2>
          <div class="champs">
            <div class="ligne"><span>TVA sur les travaux par un artisan</span><b>${b.rate} %</b></div>
            <small class="mu">${b.rate === 6 ? "6 % : logement de plus de 10 ans, rénovation facturée par l'entrepreneur (conditions à vérifier avec lui)." : "21 % : logement de moins de 10 ans."}</small>
            ${hyp}
          </div>
        </section>
        ${aides()}
      </div>
    </div>

    <section class="carte">
      <h2>Les travaux, pièce par pièce</h2>
      <p class="mu">Modifiez les quantités, ajoutez une pièce ou cochez « Moi-même » si vous faites le travail (pas de main-d'œuvre, matériel au prix magasin).</p>
      <div class="table"><table>
        <thead><tr><th>Pièce</th><th>Travail</th><th>Quantité</th><th>Moi-même</th><th class="r">Budget moyen</th><th></th></tr></thead>
        <tbody>${lignes}</tbody>
      </table></div>
      <button class="btn sec" data-action="ajout-ligne">＋ Ajouter un travail</button>
    </section>

    <div class="actions">
      <span class="actions-g"><a class="btn" href="#/dossier/${m.id}">Dossier pour la banque →</a>${maisons.length > 1 ? `<a class="btn sec" href="#/comparer">Comparer avec mes autres maisons</a>` : ""}</span>
      <button class="btn lien" data-action="suppr-maison">Supprimer cette maison</button>
    </div>
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
let tarifs = (() => { try { return JSON.parse(localStorage.getItem("valou_demo_tarifs") || "null") || { p: {} }; } catch (e) { return { p: {} }; } })();
const sauverTarifs = () => { try { localStorage.setItem("valou_demo_tarifs", JSON.stringify(tarifs)); } catch (e) {} };

function resume(m) {
  const b = calculerBudget(R, m), c = coutTotal(m, b);
  const tot = b.postes.reduce((s, p) => s + p.total[1], 0) || 1;
  const part = f => Math.round((b.postes.filter(p => f.includes(p.fiab)).reduce((s, p) => s + p.total[1], 0) / tot) * 100);
  return { m, b, c, detail: part(["reference", "estimation"]), fourch: part(["fourchette", "incomplet"]) };
}

function ecranComparer() {
  if (!selection) selection = maisons.slice(0, 3).map(m => m.id);
  selection = selection.filter(id => trouver(id));
  const choix = maisons.map(m => `<label class="puce ${selection.includes(m.id) ? "on" : ""}"><input type="checkbox" data-comp="${m.id}" ${selection.includes(m.id) ? "checked" : ""}> ${esc(m.nom || "Maison")}</label>`).join("");
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
function ecranDossier(m) {
  const b = calculerBudget(R, m), c = coutTotal(m, b), f = m.fin || {};
  const apport = +f.apport || 0, emprunt = Math.max(0, c.total[1] - apport);
  const mens = mensualite(emprunt, f.taux, f.duree);
  const champ = (k, t, suffixe, ph) => `<label>${t}<span class="saisie"><input type="number" min="0" step="any" inputmode="decimal" data-fin="${k}" value="${esc(f[k] ?? "")}" placeholder="${ph}"><i>${suffixe}</i></span><b class="imprime">${f[k] != null && f[k] !== "" ? (suffixe === "€" ? euros(+f[k]) : esc(String(f[k]).replace(".", ",")) + " " + suffixe) : "à compléter"}</b></label>`;
  const parG = {};
  b.postes.forEach(p => (parG[groupe(p)] = parG[groupe(p)] || []).push(p));
  const postes = GROUPES.filter(g => parG[g]).map(g => `<tr class="g"><td colspan="3">${esc(g)}</td></tr>${parG[g].map(p => `<tr><td>${esc(p.n)}<small class="mu"> · ${esc(qte(p.Q, p.u))}</small></td><td>${badge(p.fiab)}</td><td class="r">${euros(p.total[1], 10)}</td></tr>`).join("")}`).join("");
  const hyp = [`TVA sur les travaux par un artisan : ${b.rate} %`, `Imprévus : ${b.pi} %`, ...b.hypo.filter(h => h !== "etat").map(h => `${HYPOTHESES[h].t} : ${(HYPOTHESES[h].o.find(o => o[0] === b.rep[h]) || [, ""])[1]}`)];
  const auj = new Date().toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  return `${entete("maisons")}
  <main class="dossier">
    <div class="no-print barre-outils"><a href="#/maison/${m.id}" class="retour">← Retour à la maison</a><button class="btn" data-action="imprimer">Télécharger en PDF</button></div>
    <article class="feuille">
      <header class="f-tete"><img src="../logo.png" alt="Valou"><div><b>Dossier de financement</b><small>Achat et rénovation · ${esc(auj)}</small></div></header>
      ${m.exemple ? `<p class="fictif">Bien fictif, utilisé pour la démonstration.</p>` : ""}
      <h1>${esc(m.nom || "Maison")}</h1>
      <p class="mu">${[m.commune, m.annee && `construite en ${m.annee}`, m.surface && `${nombre(m.surface)} m² habitables`].filter(Boolean).map(esc).join(" · ")}</p>
      ${m.description ? `<p>${esc(m.description)}</p>` : ""}

      <h2>1. Le coût total du projet</h2>
      <table class="f-table">
        <tr><td>Prix d'achat</td><td class="r">${euros(c.prix)}</td></tr>
        <tr><td>Droits d'enregistrement (${String(c.tauxDroits).replace(".", ",")} %, taux légal wallon à confirmer par le notaire)</td><td class="r">${euros(c.droits)}</td></tr>
        <tr><td>Honoraires et frais du notaire</td><td class="r">${c.notaire == null ? `<span class="manque">à compléter</span>` : euros(c.notaire)}</td></tr>
        <tr><td>Travaux, TVA et imprévus compris <small class="mu">(fourchette ${fourchette(c.travaux)})</small></td><td class="r">${euros(c.travaux[1], 100)}</td></tr>
        <tr class="tot"><td>Coût total du projet</td><td class="r">${euros(c.total[1], 100)}</td></tr>
      </table>

      <h2>2. Le financement</h2>
      <div class="champs f-fin">
        ${champ("apport", "Apport personnel", "€", "à compléter")}
        ${champ("taux", "Taux annuel du crédit", "%", "taux proposé par la banque")}
        ${champ("duree", "Durée du crédit", "ans", "ex. 25")}
      </div>
      <table class="f-table">
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
        <tr class="tot"><td colspan="2">Total des travaux (moyen)</td><td class="r">${euros(b.T[1], 100)}</td></tr>
      </table>

      <h2>4. Hypothèses et fiabilité</h2>
      <ul class="f-liste">${hyp.map(h => `<li>${esc(h)}</li>`).join("")}</ul>
      <p class="f-fiab">${Object.keys(FIABILITE).map(k => `${badge(k)} ${esc(FIABILITE[k].d)}`).join("<br>")}</p>

      <footer class="f-pied">Estimation indicative établie avec Valou à partir de prix de référence hors TVA (main-d'œuvre : ${esc(R.sources.mo || "")} ; matériaux : ${esc(R.sources.hubo || "")}). Elle ne remplace pas les devis des entrepreneurs ni la simulation du notaire.</footer>
    </article>
  </main>`;
}

/* ---------- routeur ---------- */
function afficher() {
  const h = location.hash.replace(/^#/, "") || "/";
  const y = window.scrollY, meme = afficher.dernier === h;
  let html;
  const mm = h.match(/^\/maison\/(\w+)/), md = h.match(/^\/dossier\/(\w+)/);
  if (h === "/ajouter") html = ecranAjouter();
  else if (h === "/comparer") html = ecranComparer();
  else if (h.startsWith("/pro")) html = ecranPro({ R, maisons, entete, tarifs }, h.split("/")[2] || "artisan", h.includes("/tarifs") && metier === "general" ? "carreleur" : metier);
  else if (h === "/moteur") html = ecranMoteur({ R, entete, sim, tarifs });
  else if (h === "/feuille-de-route") html = ecranFeuille({ entete });
  else if (md && trouver(md[1])) html = ecranDossier(trouver(md[1]));
  else if (mm && trouver(mm[1])) html = ecranMaison(trouver(mm[1]));
  else html = ecranAccueil();
  $app.innerHTML = html;
  afficher.dernier = h;
  window.scrollTo(0, meme ? y : 0);
}

/* ---------- interactions ---------- */
const maisonCourante = () => {
  const mm = location.hash.match(/^#\/(?:maison|dossier)\/(\w+)/);
  return mm && trouver(mm[1]);
};

document.addEventListener("click", e => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const a = el.dataset.action, m = maisonCourante();
  if (a === "imprimer") window.print();
  if (el.dataset.simN != null) { sim.n = +el.dataset.simN; afficher(); }
  if (a === "pro-ok" || a === "pro-non") {
    const carte = el.closest(".demande");
    carte.querySelector(".d-act").outerHTML = a === "pro-ok"
      ? `<span class="d-act ok">✓ Le client est prévenu : il recevra votre devis dans son espace Valou.</span>`
      : `<span class="d-act mu">Demande transmise à un autre artisan.</span>`;
  }
  if (a === "exemple") { const x = chargerDemo(); if (x) location.hash = `#/maison/${x.id}`; }
  if (a === "suppr-ligne" && m) { m.travaux.splice(+el.dataset.i, 1); sauver(); afficher(); }
  if (a === "ajout-ligne" && m) { m.travaux.push({ id: nouvelId(), piece: "", k: "mur_peinture", q: "" }); sauver(); afficher(); }
  if (a === "suppr-maison" && m && confirm("Supprimer cette maison ?")) { maisons = maisons.filter(x => x !== m); sauver(); location.hash = "#/"; }
});

document.addEventListener("change", e => {
  const t = e.target, m = maisonCourante();
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
  /* dossier : financement */
  if (t.dataset.fin && m) {
    m.fin = { ...(m.fin || {}), [t.dataset.fin]: t.value === "" ? null : +t.value };
    sauver();
    afficher();
    return;
  }
  /* formulaire d'ajout */
  if (t.dataset.choix) {
    const id = t.dataset.choix, c = (brouillon.choix[id] = brouillon.choix[id] || {});
    c.on = t.checked;
    const bloc = t.closest("[data-bloc]");
    bloc.outerHTML = choixHTML(RAPIDE.find(r => r.id === id), c);
    const n = document.querySelector(`[data-choixn="${id}"]`);
    if (n) n.focus();
    return;
  }
  if (t.dataset.choixn) { brouillon.choix[t.dataset.choixn].n = t.value; return; }
  if (t.form && t.form.id === "f-ajout" && t.name) { brouillon[t.name] = t.type === "checkbox" ? t.checked : t.value; return; }
  if (!m) return;
  /* écran maison */
  if (t.dataset.f) {
    const f = t.dataset.f;
    m[f] = t.type === "checkbox" ? t.checked : t.value === "" ? null : +t.value;
  } else if (t.dataset.h) {
    m.rep = { ...(m.rep || {}), [t.dataset.h]: t.value };
  } else if (t.dataset.l) {
    const [i, f] = t.dataset.l.split(":"), l = m.travaux[+i];
    l[f] = t.type === "checkbox" ? t.checked : t.value;
    if (f === "q" || f === "k") delete l.auto;
  } else return;
  sauver();
  afficher();
});

document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.choixn && brouillon) brouillon.choix[t.dataset.choixn].n = t.value;
  else if (t.form && t.form.id === "f-ajout" && t.name && t.type !== "checkbox") brouillon[t.name] = t.value;
});

document.addEventListener("submit", e => {
  if (e.target.id !== "f-ajout") return;
  e.preventDefault();
  const m = creerMaison(brouillon);
  brouillon = null;
  location.hash = `#/maison/${m.id}`;
});

window.addEventListener("hashchange", afficher);

Promise.all([chargerReferences(), fetch("maison-demo.json", { cache: "no-cache" }).then(r => (r.ok ? r.json() : null)).catch(() => null)])
  .then(([r, d]) => {
    R = r;
    DEMO = d;
    /* première visite : la maison de démonstration est déjà là */
    let vu = false;
    try { vu = !!localStorage.getItem("valou_demo_vu"); localStorage.setItem("valou_demo_vu", "1"); } catch (e) {}
    if (!vu && DEMO && !maisons.some(m => m.demo)) chargerDemo();
    afficher();
  })
  .catch(() => { $app.innerHTML = `<main><div class="alerte">Impossible de charger les prix de référence. Vérifiez la connexion et rechargez la page.</div></main>`; });
