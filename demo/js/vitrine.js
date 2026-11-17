/* Valou — écrans de présentation : Professionnels, Notre moteur, Feuille de route.
   Les écrans « Professionnels » sont des simulations : ils montrent ce que reçoit chaque professionnel,
   à partir des maisons encodées dans le prototype. */
import { calculerBudget, coutTotal, mensualite, FIABILITE, prixLocaux, RAYONS, MIN_ARTISANS, unitePoste } from "./moteur.js";
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
  const tabs = [["artisan", "Artisan : demandes"], ["tarifs", "Artisan : mes tarifs"], ["courtier", "Courtier et banque"], ["agence", "Agence immobilière"]];
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
      <section class="carte"><table class="d-lots tarifs">
        <thead><tr><th>Poste</th><th>Votre prix (HTVA)</th></tr></thead>
        <tbody>${postes.map(p => {
          const u = unitePoste(p.u, p.k);
          return `<tr><td>${esc(p.n)}</td><td><span class="saisie"><input type="number" min="0" step="any" inputmode="decimal" data-tarif="${p.k}" value="${esc(T.p[p.k] ?? "")}" aria-label="Votre prix pour ${esc(p.n)}"><i>€/${esc(u === "pièce" ? "pièce" : u)}</i></span></td></tr>`;
        }).join("")}</tbody></table>
        <label class="cb"><input type="checkbox" data-tarif-ok ${T.ok ? "checked" : ""}> J'accepte que mes tarifs servent uniquement au calcul de prix moyens anonymes, selon les règles ci-dessus.</label>
        ${T.ok && Object.values(T.p).some(v => v > 0) ? `<p class="d-act ok">✓ Tarifs enregistrés. Ils sont repris dans la simulation de « Notre moteur ».</p>` : `<p class="mu">Démonstration : vos tarifs restent sur cet appareil.</p>`}
      </section>`;
  }

  if (onglet === "courtier") {
    corps = `<div class="pro-intro"><h2>Des dossiers de crédit complets, travaux chiffrés compris</h2>
      <p class="mu">Le courtier reçoit le coût total du projet, achat et rénovation, avec le budget des travaux poste par poste et son niveau de fiabilité.</p></div>
      <div class="grille">${L.map(x => {
        const f = x.m.fin || {}, emprunt = Math.max(0, x.c.total[1] - (+f.apport || 0)), mens = mensualite(emprunt, f.taux, f.duree);
        const tot = x.b.postes.reduce((s, p) => s + p.total[1], 0) || 1;
        const det = Math.round((x.b.postes.filter(p => p.fiab === "reference" || p.fiab === "estimation").reduce((s, p) => s + p.total[1], 0) / tot) * 100);
        return `<article class="carte dossier-c">${x.c.notaireEncode ? `<span class="badge b-reference">Dossier prêt</span>` : `<span class="badge b-estimation">🔒 En attente du montant du notaire</span>`}<h3>${esc(x.m.nom)}</h3><small class="mu">${esc(x.m.commune || "")}</small>
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
    { t: "Aujourd'hui", s: "Prototype : j'achète", on: true, l: ["Le vrai coût d'une maison : achat, notaire et travaux", "Pièces avec leurs postes imposés, budget bas / moyen / haut et fiabilité", "Visite : photos en rafale par pièce, questionnaire papier", "Comparaison de plusieurs maisons", "Dossier pour la banque, verrouillé jusqu'au montant du notaire", "Tableau de bord des prix de référence"] },
    { t: "Étape 1", s: "Lancement en Wallonie", l: ["Profil « Je rénove ma maison » : le même outil pour les propriétaires", "Comptes et synchronisation entre appareils (photos comprises)", "Tarifs confidentiels des artisans : prix moyens à 5, 10, 15 et 20 km du chantier", "Devis réels pour fiabiliser les prix"] },
    { t: "Étape 2", s: "Mise en relation", l: ["Envoi du projet chiffré aux artisans de la zone", "Réponses et devis dans l'appli", "Dossier de crédit transmis au courtier", "Suivi du chantier : budget prévu et dépenses réelles", "Lecture automatique du questionnaire photographié"] },
    { t: "Étape 3", s: "Tout l'immobilier", l: ["Profil « Je vends » : fiche « travaux à prévoir » jointe à l'annonce", "Agences : vrai coût affiché sur les annonces", "Estimation du prix de vente, avec une source de données fiable", "Bruxelles et Flandre, en néerlandais et en anglais"] },
  ];
  const revenus = [
    ["Particuliers", "Gratuit : c'est ce qui fait venir les utilisateurs (acheteurs et propriétaires)"],
    ["Artisans", "Demandes de projets déjà chiffrés dans leur zone : à la demande ou par abonnement ; priorité pour ceux qui partagent leurs tarifs"],
    ["Courtiers et banques", "Accès aux dossiers de crédit complets (achat + travaux) ; forme à valider juridiquement (FSMA)"],
    ["Agences", "Fiche « vrai coût, travaux compris » sur les annonces de maisons à rénover"],
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
