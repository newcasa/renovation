/* Test du parcours dans un vrai navigateur + captures d'écran.
   Lancer depuis la racine du dépôt :  node demo/tests/parcours.mjs [dossier-captures]
   (démarre lui-même un petit serveur local) */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");

const OUT = process.argv[2] || "captures";
mkdirSync(OUT, { recursive: true });
const PORT = 8765, URL = `http://localhost:${PORT}/demo/`;
const serveur = spawn("python3", ["-m", "http.server", String(PORT)], { stdio: "ignore" });
await new Promise(r => setTimeout(r, 800));

const navigateur = await chromium.launch();
const erreurs = [];
try {
  for (const [nom, vue] of [["ordi", { width: 1280, height: 900 }], ["tel", { width: 390, height: 844 }]]) {
    const page = await navigateur.newPage({ viewport: vue, deviceScaleFactor: 2 });
    page.on("pageerror", e => erreurs.push(`${nom} : ${e.message}`));
    page.on("console", m => m.type() === "error" && !/supabase|valou_tarifs|Failed to load resource/i.test(m.text()) && erreurs.push(`${nom} : ${m.text()}`));
    await page.goto(URL);
    await page.getByText("Ajouter une maison").first().waitFor();
    await page.screenshot({ path: `${OUT}/${nom}-1-accueil.png` });

    /* ajouter une maison en 30 secondes */
    await page.getByText("Ajouter une maison").first().click();
    await page.fill('input[name="nom"]', "Maison test");
    await page.fill('input[name="commune"]', "Namur");
    await page.fill('input[name="prix"]', "245000");
    await page.fill('input[name="annee"]', "1965");
    await page.fill('input[name="surface"]', "120");
    await page.selectOption('select[name="etat"]', "renover");
    for (const id of ["peinture", "sols", "elec", "cuisine", "sdb", "chaudiere"]) await page.check(`[data-choix="${id}"]`);
    await page.check('[data-choix="radiateurs"]');
    await page.fill('[data-choixn="radiateurs"]', "7");
    await page.screenshot({ path: `${OUT}/${nom}-2-ajouter.png`, fullPage: nom === "ordi" }); // sur téléphone, la capture pleine page perturbe le clic suivant
    await page.getByText("Voir le vrai coût").click();

    /* le vrai coût */
    await page.locator(".vrai-cout .gros").waitFor({ timeout: 8000 });
    const total = await page.locator(".vrai-cout .gros").innerText();
    assert.match(total, /€/);
    assert.equal(await page.inputValue('[data-f="prix"]'), "245000"); // le nom et le prix ont bien été gardés
    assert.match(await page.locator("h1").innerText(), /Maison test/);
    await page.screenshot({ path: `${OUT}/${nom}-3-vrai-cout.png` });

    /* ouvrir un groupe et un poste */
    await page.locator(".grp > summary").first().click();
    await page.locator(".poste > summary").first().click();
    await page.screenshot({ path: `${OUT}/${nom}-4-detail.png`, fullPage: true });

    /* frais de notaire : le total augmente du montant encodé */
    const avant = await page.locator(".vrai-cout .gros").innerText();
    await page.fill('[data-f="fraisNotaire"]', "2500");
    await page.locator('[data-f="fraisNotaire"]').dispatchEvent("change");
    const apres = await page.locator(".vrai-cout .gros").innerText();
    const n = s => +s.replace(/[^\d]/g, "");
    assert.equal(n(apres) - n(avant), 2500);

    /* hypothèse : support abîmé → imprévus 15 % */
    assert.match(await page.locator(".recap").innerText(), /Imprévus \(15 %\)/);

    /* pièce par pièce : passer la peinture en « moi-même » */
    await page.locator('[data-l="0:soiMeme"]').check();
    await page.locator(".vrai-cout .gros").waitFor();
    assert.notEqual(await page.locator(".vrai-cout .gros").innerText(), apres);

    /* retour à l'accueil : la maison est enregistrée */
    await page.getByText("← Mes maisons").click();
    await page.locator(".maison").first().waitFor();
    await page.screenshot({ path: `${OUT}/${nom}-5-mes-maisons.png` });

    /* pas de défilement horizontal sur téléphone */
    const large = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.ok(!large, `${nom} : défilement horizontal`);
    await page.close();
  }
  assert.deepEqual(erreurs, []);
  console.log("Parcours OK — captures dans", OUT);
} catch (e) { console.log("Erreurs page :", erreurs); throw e; } finally {
  await navigateur.close();
  serveur.kill();
}
