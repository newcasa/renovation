/* Valou — écrans de présentation : Professionnels, Notre moteur, Feuille de route.
   Les écrans « Professionnels » sont des simulations : ils montrent ce que reçoit chaque professionnel,
   à partir des maisons encodées dans le prototype. */
import { calculerBudget, coutTotal, mensualite, FIABILITE } from "./moteur.js";
import { euros, nombre, esc } from "./format.js";

/* ---------- métiers : quels postes reçoit chaque artisan ---------- */
export const METIERS = [
  { id: "general", t: "Entreprise générale", f: () => true },
  { id: "carreleur", t: "Carreleur", f: k => /^(sol|mur)_carrelage$/.test(k) },
  { id: "peintre", t: "Peintre et plafonneur", f: k => /^(mur_peinture|mur_plafonnage|pl|i_cg)$/.test(k) },
  { id: "electricien", t: "Électricien", f: k => /^i_(re|co|mc)$/.test(k) },
  { id: "chauffagiste", t: "Chauffagiste et sanitaire", f: k => /^(i_(cha|pac|rad|chs|pl)|meu_sdb|wc_.+)$/.test(k) },
  { id: "menuisier", t: "Menuisier", f: k => /^(i_(ch|ca|bv|pe|pi|pg|vo)|sol_parquet|meu_cuisine)$/.test(k) },
  { id: "couvreur", t: "Couvreur", f: k => /^i_(dp|st|cv_\d|cp_\d|zi|no|vx_\d|to_\d)$/.test(k) },
];

const qte = (Q, u) => `${nombre(Q)} ${Q > 1 && (u === "pièce" || u === "escalier") ? u + "s" : u}`;
const badge = f => (f ? `<span class="badge b-${f}" title="${esc(FIABILITE[f].d)}">${esc(FIABILITE[f].t)}</span>` : "");
const simule = `<p class="simule">Démonstration : écran simulé à partir des maisons du prototype.</p>`;

/* ---------- Professionnels ---------- */
export function ecranPro(ctx, onglet, metier) {
  const { R, maisons, entete } = ctx;
  const tabs = [["artisan", "Artisan"], ["courtier", "Courtier et banque"], ["agence", "Agence immobilière"]];
  const nav = `<div class="onglets" role="tablist">${tabs.map(([id, t]) => `<a role="tab" class="onglet ${onglet === id ? "on" : ""}" href="#/pro/${id}" aria-selected="${onglet === id}">${t}</a>`).join("")}</div>`;
  const L = maisons.map(m => { const b = calculerBudget(R, m); return { m, b, c: coutTotal(m, b) }; });
  let corps = "";

  if (onglet === "artisan") {
    const M = METIERS.find(x => x.id === metier) || METIERS[0];
    const demandes = L.map(x => ({ ...x, lots: x.b.postes.filter(p => M.f(p.k) && p.QL > 0) })).filter(x => x.lots.length);
    corps = `<div class="pro-intro"><h2>Des clients qui savent déjà ce que coûtent leurs travaux</h2>
      <p class="mu">L'artisan reçoit des projets déjà chiffrés et décrits poste par poste, avec le budget du client. Moins de visites pour rien, des devis plus rapides.</p></div>
      <label class="metier">Votre métier<select data-metier>${METIERS.map(x => `<option value="${x.id}" ${x.id === M.id ? "selected" : ""}>${esc(x.t)}</option>`).join("")}</select></label>
      ${demandes.length ? demandes.map(x => {
        const t = x.lots.reduce((s, p) => [s[0] + p.total[0], s[1] + p.total[1], s[2] + p.total[2]], [0, 0, 0]);
        return `<article class="carte demande">
          <div class="d-tete"><div><span class="badge b-reference">Nouvelle demande</span><h3>${esc(x.m.commune || x.m.nom)}</h3>
            <small class="mu">${esc([x.m.annee && `Maison de ${x.m.annee}`, x.m.surface && `${nombre(x.m.surface)} m²`].filter(Boolean).join(" · "))}</small></div>
            <div class="d-budget"><small>Budget estimé du client pour ces travaux</small><b>${euros(t[0], 100)} – ${euros(t[2], 100)}</b><small class="mu">TVA ${x.b.rate} % comprise</small></div></div>
          <table class="d-lots">${x.lots.map(p => `<tr><td>${esc(p.n)}</td><td class="r">${esc(qte(p.QL, p.u))}</td><td>${badge(p.fiab)}</td></tr>`).join("")}</table>
          <div class="d-pied"><small class="mu">${x.m.fin && x.m.fin.apport ? "✓ Dossier de financement préparé" : "Financement en préparation"} · Coordonnées du client transmises quand vous acceptez</small>
            <span class="d-act"><button class="btn" data-action="pro-ok">Proposer un devis</button><button class="btn sec" data-action="pro-non">Pas disponible</button></span></div>
        </article>`;
      }).join("") : `<div class="carte vide"><p>Aucune demande pour ce métier dans les maisons du prototype.</p></div>`}`;
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
    const x = L[0];
    corps = `<div class="pro-intro"><h2>Des annonces qui rassurent les acheteurs</h2>
      <p class="mu">L'agence affiche sur son annonce le vrai coût estimé, travaux compris. L'acheteur ose visiter une maison à rénover, parce qu'il sait ce qui l'attend.</p></div>
      ${x ? `<article class="carte annonce">
        <div class="a-photo"><img src="../photo-par-defaut.jpg" alt=""><span class="badge b-exemple">Bien fictif</span></div>
        <div class="a-corps"><small class="mu">${esc(x.m.commune || "")}</small><h3>${esc(x.m.description ? x.m.description.split(",")[0] : x.m.nom)}</h3>
          <div class="a-prix">${euros(x.c.prix)}</div>
          <div class="a-valou"><img src="../favicon-48.png" alt=""><div><small>Vrai coût estimé par Valou, travaux compris</small><b>${euros(x.c.total[0], 1000)} – ${euros(x.c.total[2], 1000)}</b></div></div>
          <a class="btn sec" href="#/maison/${x.m.id}">Voir le détail des travaux</a></div>
      </article>` : ""}`;
  }

  return `${entete("pro")}<main><h1>Côté professionnels</h1>${simule}${nav}${corps}</main>`;
}

/* ---------- Notre moteur ---------- */
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
  </main>`;
}

/* ---------- Feuille de route ---------- */
export function ecranFeuille(ctx) {
  const { entete } = ctx;
  const phases = [
    { t: "Aujourd'hui", s: "Prototype", on: true, l: ["Le vrai coût d'une maison : achat, frais et travaux", "Budget pièce par pièce, bas / moyen / haut, avec sa fiabilité", "Comparaison de plusieurs maisons", "Dossier pour la banque en PDF", "Tableau de bord des prix de référence"] },
    { t: "Étape 1", s: "Lancement en Wallonie", l: ["Comptes et synchronisation entre appareils", "Partenariats avec des courtiers en crédit", "Prix validés avec des artisans et des négociants", "Devis réels des utilisateurs pour affiner les prix"] },
    { t: "Étape 2", s: "Mise en relation", l: ["Envoi du projet chiffré aux artisans", "Réponses et devis dans l'appli", "Suivi du chantier : budget prévu et dépenses réelles", "Aides à la rénovation à jour, avec leurs échéances"] },
    { t: "Étape 3", s: "Tout l'immobilier", l: ["Agences : vrai coût affiché sur les annonces, annonces mises en avant", "Vente d'un bien et estimation", "Espaces négociants, investisseurs et notaires", "Bruxelles et Flandre, en néerlandais et en anglais"] },
  ];
  const revenus = [
    ["Courtiers en crédit", "Commission sur les dossiers de crédit transmis"],
    ["Particuliers", "Estimation gratuite ; rapport détaillé payant"],
    ["Artisans", "Demandes de projets déjà chiffrés et qualifiés"],
    ["Agences", "Badge « vrai coût » sur les annonces et mise en avant"],
  ];
  return `${entete("feuille")}<main>
    <h1>Feuille de route</h1>
    <p class="mu intro">Commencer par un besoin précis — l'acheteur qui veut savoir ce que va coûter une maison à rénover — puis ouvrir Valou à tous les métiers de l'immobilier.</p>
    <ol class="phases">${phases.map(p => `<li class="carte phase ${p.on ? "on" : ""}"><small>${esc(p.t)}</small><h2>${esc(p.s)}</h2><ul>${p.l.map(x => `<li>${esc(x)}</li>`).join("")}</ul></li>`).join("")}</ol>
    <section class="carte"><h2>Modèle économique envisagé</h2><p class="mu">Pistes à valider avec les premiers partenaires.</p>
      <div class="revenus">${revenus.map(([t, x]) => `<div><b>${esc(t)}</b><p class="mu">${esc(x)}</p></div>`).join("")}</div>
    </section>
  </main>`;
}
