/* Valou — moteur de calcul du budget (version démo).
   Aucun affichage ici : uniquement des calculs, testés dans demo/tests/moteur.test.mjs.

   Règles (identiques à l'appli Valou v51) :
   - Matériaux = quantité × consommation moyenne × (1 + chutes), arrondie au conditionnement, × prix HTVA.
     · poste fait soi-même  → prix magasin + TVA 21 %
     · poste fait par un artisan → prix négociant (à défaut : prix magasin, signalé) + TVA du projet
   - Main-d'œuvre = quantité × tarif M (bas / moyen / haut, HTVA), seulement si un artisan le fait.
   - TVA du projet : 6 % (logement de plus de 10 ans) ou 21 %.
   - Frais annexes : container M02 si démolition ou dépose de toiture.
   - Imprévus : 10 % (15 % si maison ancienne ou support abîmé).
   - Un poste sans référence détaillée garde la fourchette Valou (signalée).
   - Aucun prix n'est inventé : un prix absent est « à compléter ». */

export const TVA_MAGASIN = 21;
const num = v => (v === "" || v == null || isNaN(+v) ? null : +v);
const moy = (a, b) => (a + b) / 2;
const T0 = () => [0, 0, 0];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

/* Unité d'affichage d'un poste à partir de son unité de prix */
export function unitePoste(u, k) {
  if (k === "i_re") return "m²";
  if (u.includes("m²")) return "m²";
  if (u.includes("/ml")) return "m";
  if (u.includes("escalier")) return "escalier";
  if (u.includes("unité") || u === "€") return "pièce";
  return "forfait";
}

/* Prépare les données de référence.
   ref = tarifs-reference.json, mo = main-oeuvre.json, hubo = prix-hubo.json,
   pub = table Supabase valou_tarifs (prix publiés depuis le tableau de bord), facultatif. */
export function indexer({ ref, mo, hubo, pub }) {
  const R = { postes: {}, mos: {}, art: {}, pub: {}, px: { mag: {}, neg: {} }, liste: ref.postes };
  ref.postes.forEach(p => (R.postes[p.k] = p));
  mo.postes.forEach(m => (R.mos[m.id] = m));
  (hubo.articles || []).forEach(a => (R.art[a.id] = a));
  if (pub && pub.p) R.pub = pub.p;
  if (pub && pub.mag) R.px.mag = pub.mag;
  if (pub && pub.neg) R.px.neg = pub.neg;
  return R;
}

/* Prix magasin HTVA d'un article R : prix publié, sinon prix Hubo TVAC ÷ 1,21 */
export function prixMagasin(R, id) {
  const o = R.px.mag[id], a = R.art[id];
  if (o && num(o.p) != null) return { pu: +o.p, src: o.s || "magasin", qte: (a && a.qte) || 1, cond: (a && a.cond) || "" };
  if (a && a.prix != null) return { pu: Math.round((a.prix / 1.21) * 100) / 100, src: "Hubo", qte: a.qte || 1, cond: a.cond || "", promo: !!a.promo, ver: !!a.verifier };
  return null;
}

/* Prix négociant HTVA ; à défaut le prix magasin, signalé par defaut = true */
export function prixNegociant(R, id) {
  const o = R.px.neg[id], a = R.art[id];
  if (o && num(o.p) != null) return { pu: +o.p, src: o.s || "négociant", qte: num(o.q) || (a && a.qte) || 1, cond: o.c || (a && a.cond) || "" };
  const m = prixMagasin(R, id);
  return m ? { ...m, defaut: true } : null;
}

const articlesDe = (R, k) => {
  const pb = R.pub[k];
  return (pb && pb.c && pb.c.length ? pb.c : R.postes[k].c) || [];
};

const chiffrable = (R, x) => (x.r ? !!prixMagasin(R, x.r) : num(x.p0) != null) && (x.mode === "ep" ? x.e0 != null && x.d != null : (x.q0 ?? x.q) != null);

/* Un poste est « détaillé » s'il a une main-d'œuvre de référence, ou si tous ses articles sont chiffrables.
   Sinon, il garde la fourchette Valou (un poste à moitié chiffré serait faussement bas). */
export function estDetaille(R, k) {
  const p = R.postes[k];
  if (!p) return false;
  if (p.mo) return true;
  const c = articlesDe(R, k);
  return c.length > 0 && c.every(x => chiffrable(R, x));
}

/* Hypothèses par défaut, affichées et modifiables dans l'appli */
export const HYPOTHESES = {
  pose: { t: "Pose du carrelage", o: [["droite", "Droite (+10 % de chutes)"], ["diag", "Diagonale (+15 %)"]], d: "droite" },
  anc: { t: "Carrelage posé sur un ancien carrelage", o: [["non", "Non"], ["oui", "Oui (primaire d'accrochage)"]], d: "non" },
  fen: { t: "Pose des châssis", o: [["reno", "En rénovation"], ["depose", "Dépose totale"]], d: "reno" },
  rad: { t: "Radiateurs", o: [["rempl", "Remplacement"], ["nouv", "Nouveau raccordement"]], d: "rempl" },
  cont: { t: "Container à gravats 6 m³", o: [["oui", "Oui"], ["non", "Non"]], d: "oui" },
  etat: { t: "Maison ancienne ou support abîmé", o: [["non", "Non (imprévus 10 %)"], ["oui", "Oui (imprévus 15 %)"]], d: "non" },
};

/* Taux de TVA du projet : 6 % si le logement a plus de 10 ans */
export function tauxProjet(maison, annee = new Date().getFullYear()) {
  const r = maison.rep || {};
  if (r.age === "plus") return 6;
  if (r.age === "moins") return 21;
  const a = num(maison.annee);
  return a != null && annee - a > 10 ? 6 : 21;
}

/* Calcul d'un poste (toutes les pièces confondues : l'arrondi au conditionnement se fait sur le total) */
function calculerPoste(R, k, Q, QL, rep, rate) {
  const p = R.postes[k], u = unitePoste(p.u, k), QD = Q - QL;
  const o = { k, n: p.n, g: p.g, u, Q, QL, mode: "detaille", matD: T0(), matA: T0(), mo: T0(), articles: [], main: null, notes: [], manques: [], hypo: [] };

  if (!estDetaille(R, k)) {
    const m = p.m || [0, 0], l = p.l || [0, 0];
    o.mode = "fourchette";
    o.matD = [QD * m[0], QD * moy(m[0], m[1]), QD * m[1]];
    o.matA = [QL * m[0], QL * moy(m[0], m[1]), QL * m[1]];
    o.mo = [QL * l[0], QL * moy(l[0], l[1]), QL * l[1]];
    o.notes.push("Pas encore de référence détaillée : fourchette Valou (matériel + main-d'œuvre).");
  } else {
    articlesDe(R, k).forEach(x => {
      if (x.opt === "ancien") { o.hypo.push("anc"); if (rep.anc !== "oui") return; }
      let ch = num(x.pe) || 0;
      if (x.pose) { o.hypo.push("pose"); ch = rep.pose === "diag" ? 15 : 10; }
      const ep = x.mode === "ep";
      const a0 = ep ? x.e0 : x.q0 ?? x.q, a1 = ep ? x.e1 ?? x.e0 : x.q1 ?? x.q0 ?? x.q;
      if (a0 == null || (ep && x.d == null)) { o.manques.push(`${x.n} : consommation à compléter`); return; }
      const conso = ep ? num(x.d) * moy(+a0, +a1) : moy(+a0, +a1);
      const indicatif = /indicatif/i.test(x.n);
      [["mag", QD], ["neg", QL]].forEach(([sc, QQ]) => {
        if (!(QQ > 0)) return;
        const besoin = QQ * conso * (1 + ch / 100);
        if (x.r) {
          const px = sc === "mag" ? prixMagasin(R, x.r) : prixNegociant(R, x.r);
          if (!px) { o.manques.push(`${x.r} ${x.n} : prix à compléter`); return; }
          const nb = Math.ceil(besoin / px.qte - 1e-9), tot = nb * px.pu;
          o.articles.push({ sc, id: x.r, n: x.n, besoin, unite: x.u || "", nb, cond: px.cond, pu: px.pu, tot, src: px.src, defaut: !!px.defaut, promo: !!px.promo, ver: !!px.ver, indicatif });
          if (sc === "mag") o.matD = add3(o.matD, [tot, tot, tot]); else o.matA = add3(o.matA, [tot, tot, tot]);
        } else if (num(x.p0) != null) {
          const pu = moy(+x.p0, num(x.p1) ?? +x.p0), tot = besoin * pu;
          o.articles.push({ sc, id: "", n: x.n, besoin, unite: x.u || "", nb: null, cond: "", pu, tot, src: "tableau de bord", indicatif });
          if (sc === "mag") o.matD = add3(o.matD, [tot, tot, tot]); else o.matA = add3(o.matA, [tot, tot, tot]);
        } else o.manques.push(`${x.n} : prix à compléter`);
      });
    });

    /* un article sans prix : le matériel du poste reprend la fourchette Valou (signalé), pour ne pas sous-estimer */
    if (o.manques.length && p.m) {
      const m = p.m;
      o.notes.push(`Matériel : fourchette Valou, car ${o.manques.join(" ; ")}.`);
      o.manquesMat = o.manques;
      o.manques = [];
      o.articles = [];
      o.matD = [QD * m[0], QD * moy(m[0], m[1]), QD * m[1]];
      o.matA = [QL * m[0], QL * moy(m[0], m[1]), QL * m[1]];
      o.matFourchette = true;
    }

    let moId = p.mo;
    if (Array.isArray(moId)) {
      const f = k === "i_ch" ? "fen" : "rad";
      o.hypo.push(f);
      moId = moId[rep[f] === "depose" || rep[f] === "nouv" ? 1 : 0];
    }
    if (moId && R.mos[moId]) {
      const m = R.mos[moId], pb = R.pub[k] || {};
      const publie = pb.l && !(pb.l[0] == m.b && pb.l[1] == m.h && (pb.lm ?? m.m) == m.m);
      const b = publie ? +pb.l[0] : m.b, h = publie ? +pb.l[1] : m.h, mm = publie ? (pb.lm != null ? +pb.lm : moy(b, h)) : m.m;
      o.mo = [QL * b, QL * mm, QL * h];
      o.main = { id: moId, n: m.n, b, m: mm, h, u: m.u, e: m.e, publie };
      if (QD > 0) o.notes.push(`Fait vous-même sur ${QD} ${u} : pas de main-d'œuvre comptée.`);
    } else if (QL > 0) {
      if (p.moinc) o.notes.push(`Main-d'œuvre ${p.moinc}.`);
      else o.manques.push("Main-d'œuvre à compléter");
    }
  }

  const tva = add3(mul3(add3(o.matA, o.mo), rate / 100), mul3(o.matD, TVA_MAGASIN / 100));
  o.mat = add3(o.matD, o.matA);
  o.tva = tva;
  o.total = add3(add3(o.mat, o.mo), tva);
  o.fiab = fiabilite(o);
  return o;
}

/* Niveau de fiabilité affiché à côté de chaque chiffre */
export function fiabilite(o) {
  if (o.manques.length) return "incomplet";
  if (o.mode === "fourchette") return "fourchette";
  if (o.matFourchette || (o.main && o.main.e > 0) || o.articles.some(a => a.promo || a.ver || a.indicatif || a.defaut)) return "estimation";
  return "reference";
}

export const FIABILITE = {
  reference: { t: "Référence détaillée", d: "Calcul article par article avec un tarif de main-d'œuvre de référence." },
  estimation: { t: "Estimation", d: "Calcul détaillé, mais un tarif ou un ratio est encore indicatif." },
  fourchette: { t: "Fourchette", d: "Pas encore de référence détaillée : fourchette Valou." },
  incomplet: { t: "À compléter", d: "Un prix manque : il n'est pas compté." },
};

/* Budget complet d'une maison.
   maison.travaux = [{ id, piece, k, q, soiMeme }] */
export function calculerBudget(R, maison, annee) {
  const rep = { ...Object.fromEntries(Object.entries(HYPOTHESES).map(([k, v]) => [k, v.d])), ...(maison.rep || {}) };
  const rate = tauxProjet(maison, annee);
  const parPoste = {};
  (maison.travaux || []).forEach(l => {
    const q = num(l.q);
    if (!R.postes[l.k] || !(q > 0)) return;
    const g = (parPoste[l.k] = parPoste[l.k] || { Q: 0, QL: 0 });
    g.Q += q;
    if (!l.soiMeme) g.QL += q;
  });

  const postes = Object.entries(parPoste).map(([k, g]) => calculerPoste(R, k, g.Q, g.QL, rep, rate));
  const somme = f => postes.reduce((s, p) => add3(s, f(p)), T0());
  const MAT = somme(p => p.mat), MO = somme(p => p.mo), TVA = somme(p => p.tva);

  let ann = 0;
  const besoinContainer = postes.some(p => p.k === "i_dem" || p.k === "i_dp");
  if (besoinContainer && rep.cont === "oui" && R.mos.M02) ann = R.mos.M02.m;
  const ANN = [ann, ann, ann];

  const pi = rep.etat === "oui" ? 15 : 10;
  const ST = add3(add3(add3(MAT, MO), TVA), ANN);
  const IM = mul3(ST, pi / 100);
  const T = add3(ST, IM);

  /* part de chaque ligne (pièce) dans son poste, pour l'affichage pièce par pièce */
  const idx = Object.fromEntries(postes.map(p => [p.k, p]));
  const lignes = (maison.travaux || []).map(l => {
    const p = idx[l.k], q = num(l.q);
    if (!p || !(q > 0)) return { ...l, total: T0(), fiab: null };
    return { ...l, total: mul3(p.total, q / p.Q), fiab: p.fiab };
  });

  const hypo = [...new Set(postes.flatMap(p => p.hypo))];
  if (besoinContainer) hypo.push("cont");
  hypo.push("etat");

  return { rate, pi, rep, postes, lignes, MAT, MO, TVA, ANN, ST, IM, T, hypo };
}

/* Coût total d'achat + rénovation.
   Droits d'enregistrement en Wallonie : 3 % pour l'habitation propre et unique, sinon 12,5 % (taux légaux, à confirmer par le notaire).
   Honoraires et frais du notaire : à encoder (montant de la simulation du notaire), sinon « à compléter ». */
export function coutTotal(maison, budget) {
  const prix = num(maison.prix) || 0;
  const tauxDroits = maison.uniqueHabitation === false ? 12.5 : 3;
  const droits = (prix * tauxDroits) / 100;
  const notaire = num(maison.fraisNotaire);
  const travaux = budget.T;
  const fixe = prix + droits + (notaire || 0);
  return { prix, tauxDroits, droits, notaire, travaux, total: travaux.map(t => fixe + t) };
}

/* Mensualité d'un crédit (taux annuel en %, durée en années) */
export function mensualite(montant, tauxAnnuel, ans) {
  const N = Math.round(num(ans) * 12), r = num(tauxAnnuel) / 1200;
  if (!(montant > 0) || !(N > 0) || num(tauxAnnuel) == null) return null;
  return r ? (montant * r) / (1 - Math.pow(1 + r, -N)) : montant / N;
}

/* Premier budget en 30 secondes : quelques cases à cocher.
   Les QUANTITÉS sont estimées à partir de la surface (hypothèses affichées), les PRIX viennent toujours des références. */
export const RAPIDE = [
  { id: "peinture", t: "Peinture des murs", k: "mur_peinture", q: m => Math.round(m.surface * 2.5), hyp: "surface des murs ≈ 2,5 × surface habitable" },
  { id: "sols", t: "Sols (carrelage)", k: "sol_carrelage", q: m => Math.round(m.surface), hyp: "toute la surface habitable" },
  { id: "elec", t: "Électricité complète", k: "i_re", q: m => Math.round(m.surface), hyp: "toute la surface habitable" },
  { id: "cuisine", t: "Cuisine équipée", k: "meu_cuisine", q: () => 1 },
  { id: "sdb", t: "Salle de bain équipée", k: "meu_sdb", q: () => 1 },
  { id: "chassis", t: "Châssis (PVC)", k: "i_ch", nombre: "Nombre de châssis" },
  { id: "chaudiere", t: "Chaudière gaz à condensation", k: "i_cha", q: () => 1 },
  { id: "radiateurs", t: "Radiateurs", k: "i_rad", nombre: "Nombre de radiateurs" },
  { id: "toiture", t: "Toiture (tuiles terre cuite + sous-toiture)", k: ["i_cv_1", "i_st", "i_dp"], nombre: "Surface de toiture (m²)" },
  { id: "isol", t: "Isolation de la toiture (sous rampants)", k: "i_to_1", nombre: "Surface à isoler (m²)" },
];

export function travauxRapides(maison, choix) {
  const out = [];
  RAPIDE.forEach(r => {
    const c = choix[r.id];
    if (!c || !c.on) return;
    const q = r.nombre ? num(c.n) : r.q(maison);
    if (!(q > 0)) return;
    (Array.isArray(r.k) ? r.k : [r.k]).forEach(k => out.push({ piece: "Toute la maison", k, q, auto: r.hyp || null }));
  });
  return out;
}
