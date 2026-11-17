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

    /* la maison de démonstration est déjà là à la première visite */
    await page.getByText("Maison de démonstration").first().click();
    await page.locator(".vrai-cout .gros").waitFor();
    await page.screenshot({ path: `${OUT}/${nom}-0-demo.png` });
    await page.screenshot({ path: `${OUT}/${nom}-0-demo-complet.png`, fullPage: nom === "ordi" });
    await page.getByText("← Mes maisons").click();

    /* comparer les deux maisons de démonstration */
    await page.locator('.nav-i[href="#/comparer"]').click();
    await page.locator(".verdict").waitFor();
    assert.match(await page.locator(".verdict p").innerText(), /moins cher au final/);
    await page.screenshot({ path: `${OUT}/${nom}-6-comparer.png`, fullPage: nom === "ordi" });

    /* dossier pour la banque de la maison A */
    await page.locator('.cmp thead a').first().click();
    await page.getByText("Dossier pour la banque").click();
    await page.locator(".feuille").waitFor();
    for (const [k, v] of [["apport", "40000"], ["taux", "3.2"], ["duree", "25"]]) {
      await page.fill(`[data-fin="${k}"]`, v);
      await page.locator(`[data-fin="${k}"]`).dispatchEvent("change");
    }
    assert.match(await page.locator(".feuille").innerText(), /\/ mois/);
    await page.screenshot({ path: `${OUT}/${nom}-7-dossier.png`, fullPage: nom === "ordi" });
    if (nom === "ordi") await page.pdf({ path: `${OUT}/dossier-banque-exemple.pdf`, format: "A4", printBackground: true });

    /* professionnels, moteur, feuille de route */
    await page.locator('.nav-i[href="#/pro/artisan"]').click();
    await page.locator(".demande").first().waitFor();
    await page.selectOption("[data-metier]", "carreleur");
    await page.locator(".demande").first().waitFor();
    assert.match(await page.locator(".d-lots").first().innerText(), /carrelage/i);
    await page.getByText("Proposer un devis").first().click();
    await page.locator(".d-act.ok").waitFor();
    await page.screenshot({ path: `${OUT}/${nom}-8-artisan.png`, fullPage: nom === "ordi" });
    for (const [o, sel] of [["courtier", ".dossier-c"], ["agence", ".annonce"]]) {
      await page.locator(`.onglet[href="#/pro/${o}"]`).click();
      await page.locator(sel).first().waitFor();
      await page.screenshot({ path: `${OUT}/${nom}-8-${o}.png`, fullPage: nom === "ordi" });
    }
    /* l'artisan encode ses tarifs (confidentiels) */
    await page.locator('.onglet[href="#/pro/tarifs"]').click();
    await page.locator(".confidentiel").waitFor();
    await page.fill('[data-tarif="sol_carrelage"]', "48");
    await page.locator('[data-tarif="sol_carrelage"]').dispatchEvent("change");
    await page.check("[data-tarif-ok]");
    await page.locator(".tarifs ~ .d-act.ok").waitFor();
    await page.screenshot({ path: `${OUT}/${nom}-8-tarifs.png`, fullPage: nom === "ordi" });

    await page.locator('.nav-i[href="#/moteur"]').click();
    await page.locator(".stats").waitFor();
    /* simulation des prix locaux : 0 artisan → grille ; 12 artisans → prix locaux, avec « vous » */
    await page.locator('[data-sim-n="0"]').click();
    assert.match(await page.locator(".sim-res").innerText(), /Pas encore assez/);
    await page.locator('[data-sim-n="25"]').click();
    assert.match(await page.locator(".sim-res").innerText(), /artisans dans un rayon de \d+ km/);
    assert.equal(await page.locator(".carte-km .pt.vous").count(), 1);
    await page.locator("#prix-locaux").scrollIntoViewIfNeeded();
    await page.locator("#prix-locaux").screenshot({ path: `${OUT}/${nom}-9-prix-locaux.png` });
    assert.match(await page.locator(".stat b").first().innerText(), /^\d+$/);
    await page.screenshot({ path: `${OUT}/${nom}-9-moteur.png`, fullPage: nom === "ordi" });
    await page.locator('.nav-i[href="#/feuille-de-route"]').click();
    await page.locator(".phases").waitFor();
    await page.screenshot({ path: `${OUT}/${nom}-10-feuille.png`, fullPage: nom === "ordi" });
    await page.goto(URL);
    await page.locator(".maison").first().waitFor();

    /* ajouter une maison en 30 secondes */
    await page.getByText("Ajouter une maison").first().click();
    await page.fill('input[name="nom"]', "Maison test");
    await page.fill('input[name="commune"]', "Namur");
    await page.fill('input[name="prix"]', "245000");
    await page.fill('input[name="annee"]', "1965");
    await page.fill('input[name="surface"]', "120");
    await page.selectOption('select[name="etat"]', "renover");
    for (const id of ["peinture", "sols", "elec", "cuisine", "sdb"]) await page.check(`[data-choix="${id}"]`);
    await page.selectOption('[data-chf="actuel"]', "mazout");
    await page.selectOption('[data-chf="souhaite"]', "pac");
    await page.selectOption('[data-chf="emetteurs"]', "rad");
    await page.fill('[data-chf="nbRad"]', "7");
    await page.locator('[data-chf="nbRad"]').dispatchEvent("change");
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
    /* chauffage repris : pompe à chaleur + 7 radiateurs */
    const tout = await page.locator("main").innerText();
    assert.match(tout, /Pompe à chaleur/);
    assert.match(tout, /cuve à mazout/);
    /* une pièce : on l'ajoute, on l'ouvre, on remplit les postes imposés */
    await page.fill("#np-nom", "Chambre test");
    await page.getByText("＋ Ajouter une pièce").click();
    await page.locator(".titre-piece").waitFor();
    await page.fill('[data-pc="sol"]', "12");
    await page.locator('[data-pc="sol"]').dispatchEvent("change");
    assert.equal(await page.getAttribute('[data-pc="murs"]', "placeholder"), "32,4");
    await page.check('[data-pc="mpe"]');
    await page.check('[data-pc="pOn"]');
    await page.check('[data-pc="chOn"]');
    await page.fill('[data-pc="chN"]', "2");
    await page.locator('[data-pc="chN"]').dispatchEvent("change");
    assert.match(await page.locator(".titre-piece").innerText(), /Budget de la pièce : [1-9]/);
    await page.screenshot({ path: `${OUT}/${nom}-3b-piece.png`, fullPage: nom === "ordi" });
    await page.getByText("✓ Pièce terminée").click();
    await page.locator(".carte-piece").first().waitFor();
    assert.match(await page.locator(".carte-piece").first().innerText(), /Murs · Plafond · 2 châssis/);
    /* toute la maison : liste fixe, on remplit une quantité */
    await page.locator('details:has([data-mq="i_pi"]) > summary').click();
    await page.fill('[data-mq="i_pi"]', "4");
    await page.locator('[data-mq="i_pi"]').dispatchEvent("change");
    /* escalier : 16 marches = 1 escalier */
    await page.locator('details:has([data-mmarches="i_es_1"]) > summary').click();
    await page.fill('[data-mmarches="i_es_1"]', "16");
    await page.locator('[data-mmarches="i_es_1"]').dispatchEvent("change");
    assert.match(await page.locator('tr:has([data-mmarches="i_es_1"])').innerText(), /€/);
    await page.locator('[data-l$=":soiMeme"]').first().check();
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
