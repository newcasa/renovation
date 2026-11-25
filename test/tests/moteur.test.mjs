/* Tests du moteur de calcul : node --test demo/tests/
   Les valeurs attendues sont calculées à la main à partir des fichiers de référence du dépôt. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { indexer, calculerBudget, coutTotal, mensualite, tauxProjet } from "../js/moteur.js";

const lire = f => JSON.parse(readFileSync(new URL("../../" + f, import.meta.url)));
const R = indexer({ ref: lire("tarifs-reference.json"), mo: lire("main-oeuvre.json"), hubo: lire("prix-hubo.json") });
const proche = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.01, `${msg} : ${a} au lieu de ${b}`);
const maison = (travaux, x = {}) => ({ annee: 1965, prix: 245000, travaux, ...x });

test("carrelage de sol 20 m² par un artisan, maison de 1965 (TVA 6 %)", () => {
  const b = calculerBudget(R, maison([{ k: "sol_carrelage", q: 20 }]), 2026);
  const p = b.postes[0];
  // carrelage : 20 × 1,10 = 22 m² → 13 boîtes de 1,80 m² × 29,74 € ; colle : 110 kg → 5 sacs × 14,37 € ; joint : 3 kg → 1 sac × 15,69 €
  proche(p.mat[1], 13 * 29.74 + 5 * 14.37 + 15.69, "matériaux");
  assert.deepEqual(p.mo, [700, 1000, 1300]);
  assert.equal(b.rate, 6);
  proche(p.total[1], 474.16 + 1000 + (474.16 + 1000) * 0.06, "total du poste");
  proche(b.T[1], (474.16 + 1000) * 1.06 * 1.1, "total avec imprévus 10 %");
  assert.equal(p.fiab, "estimation"); // prix négociant pas encore encodé : prix magasin à défaut
});

test("pose en diagonale : 15 % de chutes", () => {
  const b = calculerBudget(R, maison([{ k: "sol_carrelage", q: 20 }], { rep: { pose: "diag" } }), 2026);
  const car = b.postes[0].articles.find(a => a.id === "R19");
  assert.equal(car.nb, Math.ceil(23 / 1.8)); // 13 boîtes
});

test("primaire d'accrochage seulement sur un ancien carrelage", () => {
  const sans = calculerBudget(R, maison([{ k: "sol_carrelage", q: 20 }]), 2026);
  const avec = calculerBudget(R, maison([{ k: "sol_carrelage", q: 20 }], { rep: { anc: "oui" } }), 2026);
  assert.ok(!sans.postes[0].articles.some(a => a.id === "R31"));
  assert.ok(avec.postes[0].articles.some(a => a.id === "R31"));
});

test("peinture faite soi-même : matériel magasin + TVA 21 %, pas de main-d'œuvre", () => {
  const b = calculerBudget(R, maison([{ k: "mur_peinture", q: 40, soiMeme: true }]), 2026);
  const p = b.postes[0];
  const mat = 74.37 + 33.05; // 1 seau de primer + 1 seau de peinture, HTVA
  proche(p.mat[1], mat, "matériaux");
  assert.deepEqual(p.mo, [0, 0, 0]);
  proche(p.total[1], mat * 1.21, "total");
});

test("poste sans référence détaillée : fourchette Valou", () => {
  const b = calculerBudget(R, maison([{ k: "meu_cuisine", q: 1 }]), 2026);
  const p = b.postes[0];
  assert.equal(p.mode, "fourchette");
  assert.equal(p.fiab, "fourchette");
  proche(p.total[1], ((3305.79 + 16528.93) / 2 + 3000) * 1.06, "total moyen");
});

test("démolition : container M02 et imprévus 15 % si maison abîmée", () => {
  const b = calculerBudget(R, maison([{ k: "i_dem", q: 10 }], { rep: { etat: "oui" } }), 2026);
  assert.deepEqual(b.ANN, [250, 250, 250]);
  assert.equal(b.pi, 15);
  const sansC = calculerBudget(R, maison([{ k: "i_dem", q: 10 }], { rep: { cont: "non" } }), 2026);
  assert.deepEqual(sansC.ANN, [0, 0, 0]);
});

test("arrondi au conditionnement sur le total du poste, pas pièce par pièce", () => {
  const b = calculerBudget(R, maison([{ k: "mur_peinture", q: 20, piece: "Salon" }, { k: "mur_peinture", q: 20, piece: "Chambre" }]), 2026);
  const peinture = b.postes[0].articles.find(a => a.id === "R17");
  assert.equal(peinture.nb, 1); // 8 L au total → 1 seau de 10 L
  proche(b.lignes[0].total[1] + b.lignes[1].total[1], b.postes[0].total[1], "somme des pièces");
});

test("salle de bain : pas de main-d'œuvre de référence et articles sans prix → fourchette entière", () => {
  const p = calculerBudget(R, maison([{ k: "meu_sdb", q: 1 }]), 2026).postes[0];
  assert.equal(p.mode, "fourchette");
  proche(p.total[1], ((3305.79 + 14049.59) / 2 + (2500 + 10500) / 2) * 1.06, "total moyen");
});

test("articles chiffrés mais pas de tarif de main-d'œuvre : main-d'œuvre en fourchette Valou", () => {
  const p = calculerBudget(R, maison([{ k: "i_fa_2", q: 10 }]), 2026).postes[0];
  assert.equal(p.moFourchette, true);
  assert.equal(p.fiab, "estimation");
  assert.deepEqual(p.mo, [200, 325, 450]);
});

test("aucun poste de la grille ne reste « à compléter »", () => {
  R.liste.forEach(x => assert.notEqual(calculerBudget(R, maison([{ k: x.k, q: 1 }]), 2026).postes[0].fiab, "incomplet", x.k));
});

test("TVA : 21 % pour un logement récent", () => {
  assert.equal(tauxProjet({ annee: 2020 }, 2026), 21);
  assert.equal(tauxProjet({ annee: 2010 }, 2026), 6);
});

test("châssis : main-d'œuvre selon la pose (rénovation ou dépose totale)", () => {
  const a = calculerBudget(R, maison([{ k: "i_ch", q: 2 }]), 2026).postes[0];
  const b = calculerBudget(R, maison([{ k: "i_ch", q: 2 }], { rep: { fen: "depose" } }), 2026).postes[0];
  assert.equal(a.main.id, "M22");
  assert.equal(b.main.id, "M23");
  // fenêtre PVC R24 : prix à compléter → matériel en fourchette Valou, signalé comme estimation
  assert.equal(a.matFourchette, true);
  assert.equal(a.fiab, "estimation");
  proche(a.mat[1], 2 * (309.92 + 557.85) / 2, "matériel châssis");
});

test("coût total : droits d'enregistrement 3 % ou 12,5 %", () => {
  const m = maison([{ k: "i_dem", q: 10 }], { fraisNotaire: 2500 });
  const b = calculerBudget(R, m, 2026);
  const c = coutTotal(m, b);
  assert.equal(c.droits, 7350);
  proche(c.total[1], 245000 + 7350 + 2500 + b.T[1], "total");
  assert.equal(coutTotal({ ...m, uniqueHabitation: false }, b).droits, 30625);
});

test("mensualité d'un crédit", () => {
  proche(mensualite(100000, 0, 10), 100000 / 120, "taux zéro");
  assert.equal(mensualite(100000, null, 20), null);
  assert.ok(mensualite(200000, 3.5, 25) > 900 && mensualite(200000, 3.5, 25) < 1100);
});

test("tous les postes de la grille se calculent sans erreur", () => {
  const b = calculerBudget(R, maison(R.liste.map(p => ({ k: p.k, q: 3 }))), 2026);
  assert.equal(b.postes.length, R.liste.length);
  b.postes.forEach(p => p.total.forEach(v => assert.ok(Number.isFinite(v), p.k)));
});

test("maisons de démonstration : travaux valides, et B moins chère au final que A", () => {
  const L = lire("demo/maison-demo.json").maisons.map(d => {
    d.travaux.forEach(t => assert.ok(R.postes[t.k], t.k));
    const b = calculerBudget(R, d, 2026);
    assert.equal(b.postes.filter(p => p.fiab === "incomplet").length, 0);
    assert.ok(b.T[0] < b.T[1] && b.T[1] < b.T[2]);
    return { d, c: coutTotal(d, b) };
  });
  const [A, B] = L;
  assert.ok(B.d.prix > A.d.prix && B.c.total[1] < A.c.total[1], "l'histoire de la comparaison");
});

import { prixLocaux, quantile, sansExtremes } from "../js/moteur.js";

test("prix locaux : jamais de moyenne avec moins de 5 artisans", () => {
  const t = [{ d: 2, p: 40 }, { d: 3, p: 50 }, { d: 4, p: 45 }, { d: 9, p: 60 }];
  assert.equal(prixLocaux(t), null);
});

test("prix locaux : on élargit le rayon jusqu'à trouver 5 artisans", () => {
  const t = [{ d: 2, p: 40 }, { d: 3, p: 50 }, { d: 4, p: 45 }, { d: 8, p: 55 }, { d: 14, p: 60 }, { d: 30, p: 99 }];
  const r = prixLocaux(t);
  assert.equal(r.rayon, 15);
  assert.equal(r.n, 5);
  assert.equal(r.m, 50); // médiane de 40, 45, 50, 55, 60
});

test("prix locaux : un prix anormal est écarté", () => {
  const t = [40, 42, 45, 47, 50, 300].map((p, i) => ({ d: 1 + i * 0.5, p }));
  const r = prixLocaux(t);
  assert.equal(r.ecartes, 1);
  assert.ok(r.h < 60);
});

test("quartiles", () => {
  assert.equal(quantile([10, 20, 30, 40, 50], 0.25), 20);
  assert.equal(quantile([10, 20, 30, 40], 0.5), 25);
  assert.deepEqual(sansExtremes([1, 2, 3]), [1, 2, 3]);
});

import { travauxEffectifs, mursPiece, travauxChauffage } from "../js/moteur.js";

test("pièces : postes imposés, murs = sol × 2,7, plafond = sol", () => {
  const pc = { id: "a", nom: "Chambre", type: "standard", sol: 12, sOn: true, sT: "parquet", mpe: true, mMe: true, pOn: true, pT: "peinture", chOn: true, chN: 2, hc: "ra", hr: true, hn: 1 };
  assert.equal(mursPiece(pc), 32.4);
  const t = travauxEffectifs({ pieces: [pc], travaux: [{ piece: "Toute la maison", k: "i_re", q: 100 }] });
  assert.deepEqual(t.map(l => [l.k, l.q, !!l.soiMeme]), [["sol_parquet", 12, false], ["mur_peinture", 32.4, true], ["pl_peinture", 12, false], ["i_ch", 2, false], ["i_rad", 1, false], ["i_re", 100, false]]);
  assert.equal(mursPiece({ ...pc, murs: 26 }), 26); // surface des murs mesurée
  const sdb = travauxEffectifs({ pieces: [{ id: "b", nom: "SDB", type: "sdb", sol: 6, meu: true, mca: true, mcaM2: 20, hc: "sol", hr: true }] });
  assert.deepEqual(sdb.map(l => [l.k, l.q]), [["mur_carrelage", 20], ["i_chs", 6], ["meu_sdb", 1]]);
  const wc = travauxEffectifs({ pieces: [{ id: "c", nom: "WC", type: "wc", sol: 2, wi: ["sp", "ev"] }] });
  assert.deepEqual(wc.map(l => l.k), ["wc_sp", "wc_ev"]);
});

test("postes plafond ajoutés : plafonnage (M13) et peinture (signalée en estimation)", () => {
  const b = calculerBudget(R, maison([{ k: "pl_plafonnage", q: 10 }, { k: "pl_peinture", q: 10 }]), 2026);
  const pf = b.postes.find(p => p.k === "pl_plafonnage"), pp = b.postes.find(p => p.k === "pl_peinture");
  assert.equal(pf.main.id, "M13");
  assert.equal(pp.main.id, "M16");
  assert.equal(pp.fiab, "estimation");
});

test("chauffage : remplacement, déjà en place, radiateurs nouveaux si rien n'existe", () => {
  const a = travauxChauffage({ actuel: "mazout", souhaite: "pac", emetteurs: "rad", nbRad: 6 }, 120);
  assert.deepEqual(a.lignes.map(l => [l.k, l.q]), [["i_pac", 1], ["i_rad", 6]]);
  assert.equal(a.rad, "rempl");
  assert.ok(a.notes.some(n => /mazout/.test(n)));
  assert.equal(travauxChauffage({ actuel: "gaz", souhaite: "gaz" }).lignes.length, 0);
  const c = travauxChauffage({ actuel: "aucun", souhaite: "gaz", emetteurs: "sol" }, 90);
  assert.deepEqual(c.lignes.map(l => [l.k, l.q]), [["i_cha", 1], ["i_chs", 90]]);
  assert.equal(c.rad, "nouv");
});

test("escalier : 16 marches = 1 escalier", () => {
  const t = travauxEffectifs({ travaux: [{ piece: "Toute la maison", k: "i_es_1", marches: 16 }, { piece: "Toute la maison", k: "i_es_0", marches: 8 }] });
  assert.deepEqual(t.map(l => l.q), [1, 0.5]);
});

import { fraisNotaireAchat } from "../js/moteur.js";

test("frais de notaire : identiques au simulateur notaire.be (au centime)", () => {
  // relevés notaire.be : total des coûts − droits d'enregistrement
  for (const [prix, hon, tva, total] of [[150000, 1686.56, 619.62, 8455.19 - 4500.01], [245000, 2147.31, 716.38, 11862.70 - 7350.01], [400000, 2621.74, 816.01, 17086.75 - 12000]]) {
    const f = fraisNotaireAchat(prix);
    assert.equal(f.honoraires, hon, `honoraires ${prix}`);
    assert.equal(f.tva, tva, `TVA ${prix}`);
    proche(f.total, total, `total ${prix}`);
  }
  assert.equal(fraisNotaireAchat(50000), null); // pas de relevé sous 64 095 € : à compléter
});

test("coût total : frais de notaire calculés, ou montant encodé s'il existe", () => {
  const m = maison([{ k: "i_dem", q: 10 }]);
  const b = calculerBudget(R, m, 2026);
  proche(coutTotal(m, b).notaire, 11862.70 - 7350.01, "calculé");
  assert.equal(coutTotal({ ...m, fraisNotaire: 4000 }, b).notaire, 4000);
});

import { maisonDepuisQuestionnaire } from "../js/questionnaire.js";

test("questionnaire rempli → maison Valou (pièces, chauffage, structure)", () => {
  let n = 0;
  const m = maisonDepuisQuestionnaire({
    maison: { nom: "Rue des Lilas", commune: "Seraing", prix: "245000", annee: 1965, surface: 120, etat: "renover", unique: true },
    chauffage: { actuel: "mazout", souhaite: "gaz" },
    pieces: [
      { nom: "Séjour", type: "standard", sol: 30, sol_refaire: "carrelage", murs: ["peinture"], plafond: "peinture", chassis: 2, radiateurs: 2 },
      { nom: "WC", type: "wc", sol: 2, wc: ["sp", "ev", "inconnu"] },
      { nom: "Garage", type: "garage", sol: 18, chassis: 1 }, // garage : la colonne « nombre » = portes de garage
      { nom: "", sol: null }, // bloc vide : ignoré
    ],
    structure: { i_re: 120, i_es_1: 16, i_pe: "" },
  }, () => "id" + n++);
  assert.equal(m.prix, 245000);
  assert.equal(m.pieces.length, 3);
  assert.equal(m.pieces[2].pg, 1);
  assert.equal(m.pieces[2].chOn, false);
  assert.equal(m.rep.etat, "oui");
  const b = calculerBudget(R, { ...m, travaux: [...m.travaux, { k: "i_cha", q: 1 }] }, 2026);
  const k = b.lignes.map(l => [l.k, l.q]);
  assert.deepEqual(k.slice(0, 5), [["sol_carrelage", 30], ["mur_peinture", 81], ["pl_peinture", 30], ["i_ch", 2], ["i_rad", 2]]);
  assert.ok(k.some(([kk, q]) => kk === "wc_sp" && q === 1) && !k.some(([kk]) => kk === "wc_inconnu"));
  assert.ok(k.some(([kk, q]) => kk === "i_es_1" && q === 1)); // 16 marches = 1 escalier
  assert.ok(!k.some(([kk]) => kk === "i_pe")); // case vide : pas comptée
  assert.ok(k.some(([kk, q]) => kk === "i_pg" && q === 1));
});

test("châssis aluminium dans une pièce", () => {
  const t = travauxEffectifs({ pieces: [{ id: "a", nom: "Véranda", type: "standard", sol: 15, chOn: true, chN: 3, chT: "alu" }] });
  assert.deepEqual(t.map(l => [l.k, l.q]), [["i_ca", 3]]);
});

import { travauxEnergie, concerneParObligation } from "../js/moteur.js";

test("PEB : travaux énergétiques isolés, obligation annoncée pour E, F, G", () => {
  const b = calculerBudget(R, maison([{ k: "i_to_1", q: 50 }, { k: "i_ch", q: 4 }, { k: "i_cha", q: 1 }, { k: "mur_peinture", q: 40 }]), 2026);
  const e = travauxEnergie(b);
  assert.deepEqual(e.postes.map(p => p.k).sort(), ["i_ch", "i_cha", "i_to_1"]);
  assert.ok(e.total[1] > 0 && e.total[1] < b.T[1]);
  assert.equal(concerneParObligation("F"), true);
  assert.equal(concerneParObligation("D"), false);
});

test("je rénove ma maison : ni prix, ni droits, ni notaire, seulement les travaux", () => {
  const m = { projet: "renovation", prix: 245000, annee: 1960, surface: 100, uniqueHabitation: true, travaux: [{ k: "i_zi", q: 10 }] };
  const b = calculerBudget(R, m), c = coutTotal(m, b);
  assert.equal(c.prix, 0);
  assert.equal(c.droits, 0);
  assert.equal(c.notaire, 0);
  assert.ok(c.renovation);
  assert.deepEqual(c.total, b.T);
  assert.ok(b.T[1] > 0);
});
