/* Valou — écrans de présentation : Professionnels, Notre moteur, Feuille de route.
   Les écrans « Professionnels » sont des simulations : ils montrent ce que reçoit chaque professionnel,
   à partir des maisons encodées dans le prototype. */
import { calculerBudget, coutTotal, mensualite, FIABILITE, prixLocaux, RAYONS, MIN_ARTISANS, unitePoste } from "./moteur.js?v=202611232126";
import { RACINE, img } from "./chemins.js?v=202611232126";
import { euros, euros2, nombre, esc } from "./format.js?v=202611232126";

/* ---------- métiers : quels postes reçoit chaque artisan ---------- */
/* une partie du projet : un poste dans une pièce (ou pour toute la maison) */
export const cleLigne = l => `${l.k}|${l.pieceId || "maison"}`;

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
  /* 4 profils, chacun avec ses propres onglets */
  const PROFILS = [
    { id: "artisan", t: "Je suis artisan", ico: "🔨", d: "Recevoir des projets déjà chiffrés, avec les photos des pièces.", tabs: [["artisan", "Demandes reçues"], ["tarifs", "Mes tarifs"]], demo: "#/demo-artisan",
      av: ["Des projets déjà chiffrés, avec les photos des pièces", "Un client qui connaît son budget : moins de devis refusés", "Vous choisissez : visite, devis ou pas disponible", "Vos tarifs restent confidentiels"] },
    { id: "negociant", t: "Je suis négociant", ico: "🧱", d: "Être vu des particuliers et des artisans de votre zone : vos matériaux, services, coordonnées et horaires.", tabs: [["negociant", "Ma fiche"], ["negprix", "Mes prix"]], demo: "#/demo-negociant",
      av: ["Visible sur les projets des maisons de votre zone", "Vos types de matériaux, services, coordonnées et horaires mis en avant", "Des clients avec un chantier déjà chiffré", "Aucune offre à envoyer : les clients viennent à vous"] },
    { id: "courtier", t: "Je suis courtier ou banque", ico: "🏦", d: "Recevoir des dossiers de crédit complets : achat, notaire et travaux.", tabs: [["courtier", "Dossiers reçus"]],
      av: ["Un dossier complet : achat, notaire, travaux poste par poste", "Moins de temps à reconstituer le budget du client", "Le PEB et les travaux énergétiques déjà identifiés"] },
    { id: "agence", t: "Je suis une agence", ico: "🏠", d: "Publier vos annonces librement, avec l'estimation des travaux en option.", tabs: [["agence", "Mon annonce"]],
      av: ["Vos annonces, rédigées librement", "L'estimation des travaux en option, pour rassurer les acheteurs", "Des acheteurs qui osent visiter les maisons à rénover"] },
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
    corps = `<div class="pro-intro"><h2>Vos annonces, comme vous le voulez</h2>
      <p class="mu">L'agence écrit librement son annonce. Rien n'est obligatoire sur les travaux. Si elle le souhaite, elle peut ajouter l'estimation Valou des travaux.</p></div>
      <div class="deux">
        <section class="carte"><h2>Mon annonce</h2><div class="champs">
          <label>Titre<input data-annonce="titre" value="${esc(A.titre ?? "")}" placeholder="ex. Maison 3 façades avec jardin"></label>
          <label>Prix demandé (€)<input type="number" min="0" data-annonce="prix" value="${esc(A.prix ?? "")}" placeholder="ex. 245000"></label>
          <label class="large">Texte de l'annonce<textarea data-annonce="texte" rows="6" placeholder="Décrivez le bien comme vous le souhaitez.">${esc(A.texte || "")}</textarea></label>
          <label class="cb large"><input type="checkbox" data-annonce="valou" ${A.valou ? "checked" : ""}> Ajouter l'estimation Valou des travaux (facultatif)</label>
        </div></section>
        <section><h2 class="petit-titre">Aperçu de l'annonce</h2>
          <article class="carte annonce seule">
            <div class="a-photo"><img src="${RACINE}photo-par-defaut.jpg" alt=""><span class="badge b-exemple">Exemple</span></div>
            <div class="a-corps"><h3>${esc(A.titre || "Titre de l'annonce")}</h3>
              ${A.prix ? `<div class="a-prix">${euros(+A.prix)}</div>` : ""}
              ${A.texte ? `<p class="a-texte">${esc(A.texte)}</p>` : `<p class="mu">Votre texte apparaîtra ici.</p>`}
              ${A.valou && x ? `<div class="a-valou"><img src="${img("favicon-valou-48.png")}" alt=""><div><small>Estimation Valou des travaux (${esc(x.m.nom)})</small><b>${euros(x.b.T[0], 1000)} – ${euros(x.b.T[2], 1000)}</b></div></div>` : ""}
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
  carreleur: [
    AR("Atelier du Carreau", "Seraing", 3, "Carrelage de sols et de murs, grands formats et salles de bain.", ["Grand format 120×60", "Salles de bain", "Douches à l'italienne", "Faïence murale"], "04 000 02 01"),
    AR("Pose Nette", "Grâce-Hollogne", 9, "Pose soignée, joints réguliers, chantier propre et rangé chaque soir.", ["Carrelage de sol", "Plinthes", "Terrasses", "Ragréage"], "04 000 02 02"),
    AR("Mosaïque Liégeoise", "Liège", 7, "Carreaux de ciment, mosaïques et pierre naturelle pour les maisons de caractère.", ["Carreaux de ciment", "Mosaïque", "Pierre naturelle", "Restauration"], "04 000 02 03", { tarifs: false }),
  ],
  peintre: [
    AR("Pinceau Clair", "Liège", 7, "Peinture intérieure et plafonnage, finitions lisses et teintes sur mesure.", ["Peinture intérieure", "Plafonnage", "Enduits lissés", "Conseil couleurs"], "04 000 03 01"),
    AR("Teinte Juste", "Flémalle", 11, "Peinture et papier peint, protection complète des sols et des meubles.", ["Peinture", "Papier peint", "Boiseries", "Plafonds"], "04 000 03 02"),
    AR("Atelier Blanc Mat", "Seraing", 3, "Plaques de plâtre, cloisons et peinture pour les rénovations rapides.", ["Plaques de plâtre", "Cloisons", "Faux plafonds", "Peinture"], "04 000 03 03", { tarifs: false }),
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
  ["gros", "🧱", "Gros œuvre (blocs, briques, ciment, béton)", ["general"]],
  ["toiture", "🏠", "Toiture et zinguerie", ["couvreur"]],
  ["isolation", "🧤", "Isolation", ["couvreur", "general"]],
  ["bois", "🪵", "Bois et panneaux", ["menuisier"]],
  ["menuiseries", "🚪", "Portes et châssis", ["menuisier"]],
  ["carrelage", "◼️", "Carrelage et revêtements de sol", ["carreleur"]],
  ["sanitaire", "🚿", "Sanitaire et plomberie", ["chauffagiste"]],
  ["chauffage", "🔥", "Chauffage", ["chauffagiste"]],
  ["electricite", "💡", "Électricité et éclairage", ["electricien"]],
  ["peinture", "🎨", "Peinture et plâtre", ["peintre"]],
  ["cuisine", "🍳", "Cuisines", ["menuisier"]],
  ["exterieur", "🌳", "Extérieurs et aménagements", ["general"]],
  ["outillage", "🔧", "Outillage et petit matériel", []],
  ["engins", "🚜", "Location d'engins (mini-pelle, chargeuse…)", ["general"]],
  ["echafaudage", "🏗️", "Location d'échafaudages", ["couvreur", "general"]],
  ["conteneur", "🗑️", "Conteneurs à déchets", ["general"]],
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
