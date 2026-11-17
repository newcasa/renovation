/* Valou — prototype de démonstration. Écrans : accueil, ajouter une maison, le vrai coût d'une maison. */
import { chargerReferences } from "./donnees.js";
import { calculerBudget, coutTotal, travauxRapides, RAPIDE, HYPOTHESES, FIABILITE, unitePoste } from "./moteur.js";
import { lireMaisons, ecrireMaisons, nouvelId } from "./stockage.js";
import { euros, euros2, nombre, esc } from "./format.js";

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
const fourchette = t => `${euros(t[0], 100)} – ${euros(t[2], 100)}`;

function entete(actif) {
  const lien = (h, t, id, bientot) =>
    bientot
      ? `<span class="nav-i off" title="Prochaine étape">${t}<small>bientôt</small></span>`
      : `<a class="nav-i ${actif === id ? "on" : ""}" href="${h}">${t}</a>`;
  return `<header class="top">
    <a href="#/" class="marque" aria-label="Valou, accueil"><img src="../logo.png" alt="Valou"></a>
    <nav>${lien("#/", "Mes maisons", "maisons")}${lien("", "Comparer", "", 1)}${lien("", "Professionnels", "", 1)}${lien("", "Notre moteur", "", 1)}${lien("", "Feuille de route", "", 1)}</nav>
  </header>`;
}

/* ---------- écran : accueil ---------- */
function ecranAccueil() {
  const cartes = maisons
    .map(m => {
      const b = calculerBudget(R, m), c = coutTotal(m, b);
      return `<a class="carte maison" href="#/maison/${m.id}">
        <div class="m-tete"><b>${esc(m.nom || "Maison sans nom")}</b>${m.exemple ? `<span class="badge b-exemple">Exemple</span>` : ""}</div>
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
    ${maisons.length ? `<h2>Mes maisons</h2><div class="grille">${cartes}</div>` : `<div class="vide carte"><p>Aucune maison pour l'instant.</p><button class="btn sec" data-action="exemple">Charger une maison d'exemple</button></div>`}
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

const EXEMPLE = {
  nom: "Maison d'exemple", commune: "À remplacer par la vraie maison", prix: 245000, annee: 1965, surface: 120, etat: "renover", uniqueHabitation: true,
  choix: { peinture: { on: true }, sols: { on: true }, elec: { on: true }, cuisine: { on: true }, sdb: { on: true }, chaudiere: { on: true }, radiateurs: { on: true, n: 7 }, isol: { on: true, n: 60 } },
};

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
      ${L.map(p => `<details class="poste"><summary><span>${esc(p.n)} <small class="mu">${nombre(p.Q)} ${esc(p.u)}</small></span><span class="r">${badge(p.fiab)} ${euros(p.total[1], 10)}</span></summary>${detailPoste(p, b)}</details>`).join("")}
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
      ${m.exemple ? `<span class="badge b-exemple">Exemple</span>` : ""}
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
      <span class="btn off" title="Prochaine étape">Dossier pour la banque <small>bientôt</small></span>
      <button class="btn lien" data-action="suppr-maison">Supprimer cette maison</button>
    </div>
  </main>`;
}

function detailPoste(p, b) {
  const art = p.articles.map(a => `<tr><td>${esc(a.id)} ${esc(a.n)}${a.promo ? " <small class='mu'>(prix promo)</small>" : ""}${a.defaut ? " <small class='mu'>(prix magasin, à défaut du prix négociant)</small>" : ""}</td>
    <td class="r">${a.nb != null ? `${nombre(a.nb)} × ${esc(a.cond)}` : `${a.besoin.toFixed(2).replace(".", ",")} ${esc(a.unite)}`}</td><td class="r">${euros2(a.tot)}</td></tr>`).join("");
  const mo = p.main && p.QL > 0 ? `<tr><td>${esc(p.main.id)} ${esc(p.main.n)}${p.main.e ? ` <small class='mu'>(${p.main.e === 1 ? "tarif estimé" : "tarif à vérifier"})</small>` : ""}</td><td class="r">${nombre(p.QL)} ${esc(p.u)} × ${euros2(p.main.m)}</td><td class="r">${euros2(p.mo[1])}</td></tr>` : "";
  const fbMat = p.matFourchette ? `<tr><td>Matériel (fourchette Valou)</td><td></td><td class="r">${euros2(p.mat[1])}</td></tr>` : "";
  const fb = p.mode === "fourchette" ? `<tr><td>Matériel (fourchette Valou)</td><td></td><td class="r">${euros2(p.mat[1])}</td></tr>${p.QL > 0 ? `<tr><td>Main-d'œuvre (fourchette Valou)</td><td></td><td class="r">${euros2(p.mo[1])}</td></tr>` : ""}` : "";
  return `<div class="det"><table>${art}${fbMat}${mo}${fb}<tr class="tva"><td>TVA</td><td></td><td class="r">${euros2(p.tva[1])}</td></tr></table>
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

/* ---------- routeur ---------- */
function afficher() {
  const h = location.hash.replace(/^#/, "") || "/";
  const y = window.scrollY, meme = afficher.dernier === h;
  let html;
  const mm = h.match(/^\/maison\/(\w+)/);
  if (h === "/ajouter") html = ecranAjouter();
  else if (mm && trouver(mm[1])) html = ecranMaison(trouver(mm[1]));
  else html = ecranAccueil();
  $app.innerHTML = html;
  afficher.dernier = h;
  window.scrollTo(0, meme ? y : 0);
}

/* ---------- interactions ---------- */
const maisonCourante = () => {
  const mm = location.hash.match(/^#\/maison\/(\w+)/);
  return mm && trouver(mm[1]);
};

document.addEventListener("click", e => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const a = el.dataset.action, m = maisonCourante();
  if (a === "exemple") { const x = creerMaison(EXEMPLE, true); location.hash = `#/maison/${x.id}`; }
  if (a === "suppr-ligne" && m) { m.travaux.splice(+el.dataset.i, 1); sauver(); afficher(); }
  if (a === "ajout-ligne" && m) { m.travaux.push({ id: nouvelId(), piece: "", k: "mur_peinture", q: "" }); sauver(); afficher(); }
  if (a === "suppr-maison" && m && confirm("Supprimer cette maison ?")) { maisons = maisons.filter(x => x !== m); sauver(); location.hash = "#/"; }
});

document.addEventListener("change", e => {
  const t = e.target, m = maisonCourante();
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

chargerReferences()
  .then(r => { R = r; afficher(); })
  .catch(() => { $app.innerHTML = `<main><div class="alerte">Impossible de charger les prix de référence. Vérifiez la connexion et rechargez la page.</div></main>`; });
