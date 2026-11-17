/* Tests du moteur de calcul : node --test demo/tests/
   Les valeurs attendues sont calculées à la main à partir des fichiers de référence du dépôt. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { indexer, calculerBudget, coutTotal, mensualite, travauxRapides, tauxProjet } from "../js/moteur.js";

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

test("premier budget rapide : quantités tirées de la surface", () => {
  const t = travauxRapides({ surface: 100 }, { peinture: { on: true }, toiture: { on: true, n: 80 }, chassis: { on: true, n: "" } });
  assert.deepEqual(t.map(x => [x.k, x.q]), [["mur_peinture", 250], ["i_cv_1", 80], ["i_st", 80], ["i_dp", 80]]);
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
