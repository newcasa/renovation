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

const navigateur = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] }); // caméra simulée pour le viseur
const erreurs = [];
try {
  for (const [nom, vue] of [["ordi", { width: 1280, height: 900 }], ["tel", { width: 390, height: 844 }]]) {
    const page = await navigateur.newPage({ viewport: vue, deviceScaleFactor: 2 });
    const onglet = o => page.locator(`.om-i[data-o="${o}"]`).click(); // onglets de la fiche maison
    /* menu : en haut sur ordinateur, barre du bas sur téléphone (« Plus » pour les autres pages) */
    const menu = async h => {
      if (nom === "ordi") return page.locator(`.nav-i[href="${h}"]`).click();
      const bas = page.locator(`.bb-i[href="${h}"]`);
      if (await bas.count()) return bas.click();
      await page.locator('.bb-i[href="#/plus"]').click();
      await page.locator(`.plus-i[href="${h}"]`).click();
    };
    page.on("pageerror", e => erreurs.push(`${nom} : ${e.message}`));
    page.on("console", m => m.type() === "error" && !/supabase|valou_tarifs|Failed to load resource/i.test(m.text()) && erreurs.push(`${nom} : ${m.text()}`));
    await page.goto(URL);
    /* page d'intro : logo, phrase d'accroche, bouton « Commencer la démo » */
    await page.locator(".intro-logo").waitFor();
    assert.match(await page.locator(".intro-boite").innerText(), /vrai coût[\s\S]*Commencer la démo[\s\S]*Acheteurs[\s\S]*acheteur confiant, un artisan gagnant, un négociant content… et une Wallonie qui va de l'avant/);
    await page.screenshot({ path: `${OUT}/${nom}-00-intro.png` });
    await page.getByText("Commencer la démo →").click();
    await page.getByText("Ajouter une maison").first().waitFor();
    await page.screenshot({ path: `${OUT}/${nom}-1-accueil.png` });

    /* la maison de démonstration est déjà là à la première visite */
    await page.getByText("Maison de démonstration").first().click();
    await onglet("projet"); await page.locator(".vrai-cout .gros").waitFor();
    /* PEB : maison A classée G → obligation annoncée et travaux énergétiques chiffrés */
    assert.match(await page.locator(".energie").innerText(), /PEB G[\s\S]*Obligation de rénovation annoncée[\s\S]*label D[\s\S]*Total des travaux énergétiques/);
    await page.screenshot({ path: `${OUT}/${nom}-0-demo.png` });
    await page.screenshot({ path: `${OUT}/${nom}-0-demo-complet.png`, fullPage: nom === "ordi" });

    /* Projet : simuler une offre → le total (prix + enregistrement + notaire + travaux) suit l'offre */
    const auPrix = await page.locator(".sim-tot td:last-child b").innerText();
    await page.fill('[data-f="offre"]', "200000");
    await page.locator('[data-f="offre"]').dispatchEvent("change");
    await page.locator(".sim-ecart").waitFor();
    assert.match(await page.locator(".sim-ecart").innerText(), /de moins/);
    assert.notEqual(await page.locator(".sim-tot td:last-child b").innerText(), auPrix);
    assert.match(await page.locator(".sim-cmp thead").innerText(), /Prix demandé[\s\S]*Votre offre/i); // prix initial à côté de l'offre
    assert.match(await page.locator(".sim-cmp tbody tr").first().innerText(), /245\s?000 €[\s\S]*200\s?000 €/);
    assert.equal(await page.locator("text=Comparer avec mes autres maisons").count(), 0);
    assert.match(await page.locator(".sim-recap").innerText(), /Offre[\s\S]*200\s?000 €[\s\S]*Droits[\s\S]*Notaire[\s\S]*Travaux/i);
    await page.locator(".sim-recap").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/${nom}-0e-offre.png` });
    await page.fill('[data-f="offre"]', "");
    await page.locator('[data-f="offre"]').dispatchEvent("change");
    await page.locator(".sim-ecart").waitFor({ state: "detached" });
    assert.equal(await page.locator(".sim-tot td:last-child b").innerText(), auPrix);
    /* travaux à inclure ou non dans la demande de prêt */
    const emp = () => page.locator('.ligne:has-text("Montant à emprunter") b').first().innerText();
    const empAvant = await emp();
    await page.locator(".pret-trav > summary").click();
    await page.locator("[data-pret]").first().uncheck();
    assert.notEqual(await emp(), empAvant);
    assert.match(await page.locator(".pret-trav > summary").innerText(), /sur[\s\S]*− /);
    await page.locator("[data-pret]").first().check();
    assert.equal(await emp(), empAvant);
    /* Les pros : contacter un courtier */
    await onglet("artisans");
    await page.locator('[data-action="courtier-envoyer"]').first().click();
    assert.match(await page.locator(".co-liste").innerText(), /Dossier envoyé/);
    assert.equal(await page.evaluate(() => document.querySelector("main").lastElementChild.classList.contains("envoi")), true, "l'envoi aux artisans reste en dernier");
    /* didacticiel : le bouton ❔ le relance, bulle par bulle */
    await page.locator(".aide-btn").click();
    await page.locator("#tuto .tuto-bulle").waitFor();
    assert.match(await page.locator(".tuto-pied small").innerText(), /^1 \/ \d/);
    await page.screenshot({ path: `${OUT}/${nom}-0f-tuto.png` });
    await page.locator('[data-tuto="suivant"]').click();
    assert.match(await page.locator(".tuto-pied small").innerText(), /^2 \//);
    await page.screenshot({ path: `${OUT}/${nom}-0g-tuto.png` });
    await page.locator('[data-tuto="passer"]').click();
    assert.equal(await page.locator("#tuto").count(), 0);

    /* photos de la visite : rangées par pièce, associées par le nom */
    const png = { name: "photo.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAAFklEQVR4nGP8//8/AwMDAxMDFgDHAwBkVQMJtYt0YgAAAABJRU5ErkJggg==", "base64") };
    await onglet("pieces");
    await page.getByText("📷 Photos de la visite").first().click();
    /* mode visite : on tape le nom, on enchaîne les photos, « Pièce suivante », etc. */
    await page.fill("#visite-nom", "Cuisine");
    await page.getByText("Commencer la visite →").click();
    /* viseur intégré : 2 photos de suite, sans valider */
    await page.waitForFunction(() => { const v = document.getElementById("viseur"); return v && v.videoWidth > 0; });
    await page.locator('[data-action="declencher"]').click();
    await page.locator(".vis-miniatures img").first().waitFor();
    await page.locator('[data-action="declencher"]').click();
    await page.locator(".vis-miniatures img").nth(1).waitFor();
    assert.match(await page.locator(".vis-nom").innerText(), /Cuisine\s*2 photos/);
    await page.getByText("Pièce suivante →").click();
    await page.fill("#visite-nom", "Mezzanine");
    await page.getByText("Commencer cette pièce →").click();
    await page.waitForFunction(() => { const v = document.getElementById("viseur"); return v && v.videoWidth > 0; });
    await page.locator('[data-action="declencher"]').click();
    await page.locator(".vis-miniatures img").first().waitFor();
    await page.getByText("Terminer la visite").click();
    await page.locator('.groupe-photos:has(h2:has-text("Mezzanine"))').waitFor();
    assert.match(await page.locator('.groupe-photos:has(h2:has-text("Cuisine"))').innerText(), /2 photos[\s\S]*Ouvrir la pièce/);
    await page.getByText("Créer la pièce « Mezzanine »").click();
    await page.locator('.groupe-photos:has(h2:has-text("Mezzanine")) >> text=Ouvrir la pièce').waitFor();
    await page.screenshot({ path: `${OUT}/${nom}-0b-photos.png`, fullPage: nom === "ordi" });
    await page.locator('.groupe-photos:has(h2:has-text("Cuisine")) >> text=Ouvrir la pièce').click();
    await page.locator(".titre-piece").waitFor();
    assert.equal(await page.locator(".galerie .vignette").count(), 2); // la pièce affiche ses photos
    await page.goto(URL + "#/");
    await page.getByText("Maison de démonstration A").first().click();

    /* envoi du projet aux artisans, puis ce que reçoit le carreleur (avec les photos de la cuisine) */
    await onglet("artisans");
    await page.locator("main > .envoi").waitFor();
    assert.ok(await page.evaluate(() => { const m = document.querySelector("main"); return m.lastElementChild.classList.contains("envoi"); }), "l'envoi aux artisans est le dernier bloc");
    /* négociants repliés : une ligne chacun, la fiche s'ouvre au toucher */
    assert.equal(await page.locator(".negs .neg-l").count(), 6, "plusieurs négociants");
    assert.equal(await page.locator(".negs .neg-l[open]").count(), 0, "repliés au départ");
    await page.locator('.neg-l > summary:has-text("Brik")').click();
    assert.match(await page.locator(".negs").innerText(), /Négociants de votre région[\s\S]*Brik'O[\s\S]*Matériaux vendus[\s\S]*✓/);
    assert.match(await page.locator(".negs").innerText(), /Comptoir du Sanitaire[\s\S]*|Loca'Chantier/);
    await page.getByText("👷 Choisir les artisans").click();
    assert.equal(await page.locator(".negs .neg-l").count(), 6, "négociants repliés aussi sur la page des artisans");
    assert.ok(await page.locator(".negs .neg-l[open]").count() <= 1, "seul le négociant déjà ouvert reste ouvert");
    await page.goBack();
    await onglet("artisans");
    await page.getByText("📨 Envoyer le projet aux artisans").click();
    await page.locator('[data-action="envoi-ok"]').click();
    await page.getByText("Voir ce que reçoit l'artisan →").click();
    await page.selectOption("[data-metier]", "carreleur");
    await page.locator(".demande").first().waitFor();
    /* la demande est fermée : on ne voit que l'adresse ; un clic l'ouvre */
    assert.equal(await page.locator(".demande .d-lots").first().isVisible(), false);
    assert.match(await page.locator(".demande .d-resume").first().innerText(), /Nouvelle demande|Répondu/);
    await page.locator(".demande .d-resume").first().click();
    await page.locator(".demande .d-lots").first().waitFor();
    assert.match(await page.locator(".demande").first().innerText(), /Projet envoyé[\s\S]*photos? de la visite/);
    await page.screenshot({ path: `${OUT}/${nom}-0c-artisan-photos.png`, fullPage: nom === "ordi" });
    /* l'artisan peut proposer une visite */
    await page.locator('.demande [data-action="pro-visite"]').first().click();
    assert.match(await page.locator(".demande").first().innerText(), /proposition de visite/);
    /* section « Contacter » : résumé du projet et coordonnées de l'artisan qui a répondu */
    await menu("#/contacts");
    await page.locator('.grille .maison:has-text("Maison de démonstration A")').click();
    await page.locator(".resume").waitFor();
    assert.match(await page.locator("main").innerText(), /Carreleur[\s\S]*Visite proposée[\s\S]*Atelier du Carreau[\s\S]*Négociants de votre région/);
    await page.screenshot({ path: `${OUT}/${nom}-0e-contacts.png`, fullPage: nom === "ordi" });
    /* maison B : pour un métier, on consulte le projet personnalisé, on coche 3 artisans (pas plus) et on envoie */
    await page.locator(".retour").click();
    await page.locator('.grille .maison:has-text("Maison de démonstration B")').click();
    /* un métier avec au moins 2 parties : on n'en envoie qu'une (ex. le séjour mais pas la salle de bain) */
    await page.locator(".contact-ligne").first().waitFor();
    const nbL = await page.locator(".contact-ligne").count();
    let iL = -1;
    for (let i = 0; i < nbL && iL < 0; i++) {
      await page.locator(".contact-ligne").nth(i).locator('[data-v="p"]').click();
      if (await page.locator(".contact-ligne").nth(i).locator("[data-part]").count() >= 2) iL = i;
      else await page.locator(".contact-ligne").nth(i).locator('[data-v="p"]').click();
    }
    assert.ok(iL >= 0, "un métier avec 2 parties");
    const L = () => page.locator(".contact-ligne").nth(iL);
    assert.match(await L().locator(".ct-projet").innerText(), /À envoyer : \d+ parties/);
    const nParts = await L().locator("[data-part]").count();
    await L().locator("[data-part]").first().uncheck();
    assert.match(await L().locator(".ct-projet").innerText(), new RegExp(`À envoyer : ${nParts - 1} partie`));
    assert.equal(await L().locator("tr.exclu").count(), 1);
    /* le matériau souhaité (ex. le type de carrelage) et une remarque partent avec le projet */
    await L().locator("[data-mat]:visible").nth(1).fill("Grès cérame 60×60 test");
    await L().locator("[data-mat]:visible").nth(1).dispatchEvent("change");
    await L().locator("[data-note-metier]").fill("Joints gris test");
    await L().locator("[data-note-metier]").dispatchEvent("change");
    assert.equal(await L().locator("[data-mat]:visible").nth(1).inputValue(), "Grès cérame 60×60 test");
    const metierTest = await L().locator('[data-v="p"]').getAttribute("data-metier");
    await page.screenshot({ path: `${OUT}/${nom}-0f-parties.png`, fullPage: nom === "ordi" });
    await L().locator('[data-v="a"]').click();
    for (let i = 0; i < 3; i++) await L().locator("[data-art]").nth(i).check();
    assert.equal(await L().locator("[data-art]").count(), 3, "3 profils d'artisans par métier");
    /* le profil d'un artisan */
    await L().locator('a:has-text("Voir le profil")').first().click();
    await page.locator(".profil-art").waitFor();
    assert.match(await page.locator(".profil-art").innerText(), /Exemple fictif[\s\S]*Spécialités[\s\S]*Téléphone[\s\S]*04 000/);
    await page.screenshot({ path: `${OUT}/${nom}-0g-profil-artisan.png`, fullPage: nom === "ordi" });
    await page.goBack();
    await page.locator(".contact-ligne").first().waitFor();
    await page.screenshot({ path: `${OUT}/${nom}-0g-choix-artisans.png`, fullPage: nom === "ordi" });
    await L().locator('[data-action="envoi-metier"]').click();
    assert.match(await L().innerText(), /Envoyé à 3 artisans/);
    await page.goto(URL + "#/pro/artisan");
    await page.selectOption("[data-metier]", metierTest);
    for (const d of await page.locator(".demande .d-resume").all()) await d.click();
    assert.match(await page.locator(".demande").filter({ hasText: "Grès cérame 60×60 test" }).innerText(), /Souhaits du client[\s\S]*Grès cérame 60×60 test[\s\S]*Joints gris test/);
    await page.screenshot({ path: `${OUT}/${nom}-0h-souhaits-artisan.png`, fullPage: nom === "ordi" });

    /* négociant : sa fiche (services, coordonnées, horaires), visible sur la fiche de la maison ; pas d'offres */
    await page.goto(URL + "#/pro/negociant");
    await page.fill('[data-negfiche="nom"]', "Négoce Test");
    await page.locator('[data-negfiche="nom"]').dispatchEvent("change");
    assert.match(await page.locator(".fiche-neg").innerText(), /Négoce Test[\s\S]*Livraison sur chantier[\s\S]*Lundi/);
    /* types de matériaux vendus : obligatoires */
    await page.check('[data-negrayon="sanitaire"]');
    assert.match(await page.locator(".fiche-neg").innerText(), /Matériaux vendus[\s\S]*Sanitaire et plomberie/);
    while (await page.locator("[data-negrayon]:checked").count()) await page.locator("[data-negrayon]:checked").first().click();
    await page.locator(".alerte-mini").waitFor();
    await page.check('[data-negrayon="sanitaire"]');
    await page.check('[data-negrayon="gros"]');
    await page.check('[data-negrayon="conteneur"]');
    assert.match(await page.locator(".fiche-neg").innerText(), /Conteneurs à déchets/);
    for (const r of ["engins", "echafaudage"]) assert.equal(await page.locator(`[data-negrayon="${r}"]`).count(), 1);
    assert.equal(await page.locator(".alerte-mini").count(), 0);
    assert.equal(await page.getByText("Envoyer mon offre").count(), 0);
    await page.screenshot({ path: `${OUT}/${nom}-0d-negociant.png`, fullPage: nom === "ordi" });
    await page.goto(URL + "#/pro/negprix");
    await page.fill('[data-negprix="R19"]', "25");
    await page.locator('[data-negprix="R19"]').dispatchEvent("change");
    /* agence : annonce libre, estimation Valou facultative (décochée au départ) */
    await page.goto(URL + "#/pro/agence");
    assert.equal(await page.locator('[data-annonce="valou"]').isChecked(), false);
    assert.equal(await page.locator(".a-valou").count(), 0);
    for (const d of ["demo-artisan", "demo-negociant"]) { await page.goto(URL + "#/" + d); await page.locator(".etapes-demo li").nth(3).waitFor(); }
    await page.goto(URL + "#/");
    await page.getByText("Maison de démonstration A").first().click();
    await page.getByText("← Mes maisons").click();

    /* comparer les deux maisons de démonstration */
    await menu("#/comparer");
    await page.locator(".verdict").waitFor();
    assert.match(await page.locator(".verdict p").innerText(), /moins cher au final/);
    assert.match(await page.locator(".cmp").innerText(), /Label PEB[\s\S]*PEB G[\s\S]*PEB C/);
    await page.screenshot({ path: `${OUT}/${nom}-6-comparer.png`, fullPage: nom === "ordi" });

    /* dossier pour la banque de la maison A */
    await page.locator('.cmp thead a').first().click();
    await onglet("projet");
    await page.getByText("Dossier pour la banque").click();
    await page.locator(".feuille").waitFor();
    /* envoi à la banque : possible tout de suite, sans valider le montant du notaire */
    assert.equal(await page.locator(".verrou-banque").count(), 0);
    await page.locator('[data-action="envoyer-banque"]').click();
    assert.match(await page.locator("#envoi").innerText(), /envoyé/);
    for (const [k, v] of [["apport", "40000"], ["taux", "3.2"], ["duree", "25"]]) {
      await page.fill(`[data-fin="${k}"]`, v);
      await page.locator(`[data-fin="${k}"]`).dispatchEvent("change");
    }
    assert.match(await page.locator(".feuille").innerText(), /\/ mois/);
    await page.screenshot({ path: `${OUT}/${nom}-7-dossier.png`, fullPage: nom === "ordi" });
    if (nom === "ordi") await page.pdf({ path: `${OUT}/dossier-banque-exemple.pdf`, format: "A4", printBackground: true });

    /* professionnels, moteur, feuille de route */
    await menu("#/pro");
    await page.getByText("Je suis artisan").click();
    await page.locator(".demande").first().waitFor();
    await page.selectOption("[data-metier]", "carreleur");
    await page.locator(".demande").first().waitFor();
    if (!(await page.locator(".demande .d-lots").first().isVisible())) await page.locator(".demande .d-resume").first().click();
    assert.match(await page.locator(".d-lots").first().innerText(), /carrelage/i);
    { const b = page.locator('.demande details[open] [data-action="pro-ok"]'); if (await b.count()) await b.first().click(); } // sinon : l'artisan a déjà répondu
    await page.locator(".d-act.ok").first().waitFor();
    await page.screenshot({ path: `${OUT}/${nom}-8-artisan.png`, fullPage: nom === "ordi" });
    /* l'artisan envoie un devis chiffré ; le particulier le reçoit dans « Contacter » et l'utilise dans le dossier */
    await page.selectOption("[data-metier]", "peintre");
    const dPeintre = page.locator('.demande:has-text("Seraing")').first();
    if (!(await dPeintre.locator(".d-lots").isVisible())) await dPeintre.locator(".d-resume").click();
    await dPeintre.locator('[data-action="pro-ok"]').click();
    await dPeintre.locator(".d-devis-m").fill("3000");
    await dPeintre.locator(".d-devis-n").fill("Disponible en mars");
    await dPeintre.locator('[data-action="pro-devis-envoyer"]').click();
    assert.match(await dPeintre.locator(".d-act.ok").innerText(), /3\s?000 € envoyé/);
    await page.goto(URL + "#/");
    await page.locator('.grille .maison:has-text("Maison de démonstration A")').click();
    await onglet("artisans");
    await page.locator('.choisir-art a:has-text("Devis reçus")').click(); // juste à côté de « Choisir les artisans par métier »
    await page.locator(".devis-recus").waitFor();
    assert.match(await page.locator(".devis-recus").innerText(), /Devis reçus[\s\S]*Peintre et plafonneur[\s\S]*Pinceau Clair[\s\S]*Disponible en mars[\s\S]*3\s?000 €/);
    assert.ok(await page.locator(".pastille").count() > 0, "pastille sur Contacter");
    await page.screenshot({ path: `${OUT}/${nom}-8b-devis-recus.png`, fullPage: nom === "ordi" });
    await page.locator('.devis-recus [data-action="devis-utiliser"]').click();
    await page.locator(".devis-recus .dr-ok a").click();
    await page.locator(".feuille").waitFor();
    assert.match(await page.locator(".feuille").innerText(), /dont devis d'artisans retenus \(1\)[\s\S]*Pinceau Clair[\s\S]*3\s?000 €/);
    await page.goto(URL + "#/pro/artisan");
    await page.selectOption("[data-metier]", "carreleur"); // la suite du parcours repart du carreleur
    for (const [o, sel] of [["courtier", ".dossier-c"], ["agence", ".annonce"]]) {
      await page.goto(URL + "#/pro/" + o);
      await page.locator(sel).first().waitFor();
      await page.screenshot({ path: `${OUT}/${nom}-8-${o}.png`, fullPage: nom === "ordi" });
    }
    /* l'artisan encode ses tarifs (confidentiels) */
    await page.goto(URL + "#/pro/tarifs");
    await page.locator(".confidentiel").waitFor();
    await page.fill('[data-tarif="sol_carrelage"]', "48");
    await page.locator('[data-tarif="sol_carrelage"]').dispatchEvent("change");
    await page.check("[data-tarif-ok]");
    await page.locator(".tarifs ~ .d-act.ok").waitFor();
    await page.screenshot({ path: `${OUT}/${nom}-8-tarifs.png`, fullPage: nom === "ordi" });

    await menu("#/moteur");
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
    /* questionnaire de visite à imprimer */
    await page.goto(URL + "#/questionnaire");
    await page.locator(".q-page").first().waitFor();
    assert.equal(await page.locator(".q-page").count(), 1, "une seule page");
    assert.equal(await page.locator(".q-table tbody tr").count(), 16);
    assert.match(await page.locator(".q-table thead").innerText(), /Remarques/); assert.equal(await page.locator(".q-table thead th").count(), 6, "pièces, sol, sol à refaire, murs, châssis, remarques");
    const lienPdf = await page.locator(".barre-outils a[download]").getAttribute("href");
    assert.equal((await page.request.get(lienPdf)).status(), 200, "le PDF de la feuille existe");
    /* mode présentation : hoono.be/demo/#/presentation remet les maisons de démonstration à zéro */
    await page.goto(URL + "#/presentation");
    await page.waitForFunction(() => location.hash === "#/bienvenue"); // la remise à zéro ramène à la page d'intro
    await page.getByText("Commencer la démo →").click();
    await page.locator(".maison").first().waitFor();
    assert.match(await page.locator(".grille").innerText(), /Maison de démonstration A[\s\S]*Maison de démonstration B/);
    await menu("#/feuille-de-route");
    await page.locator(".phases").waitFor();
    await page.screenshot({ path: `${OUT}/${nom}-10-feuille.png`, fullPage: nom === "ordi" });
    await page.goto(URL + "#/");
    await page.locator(".maison").first().waitFor();

    /* ajouter une maison (sans estimation rapide : les travaux se remplissent ensuite dans « Les travaux ») */
    await page.getByText("Ajouter une maison").first().click();
    await page.fill('input[name="nom"]', "Maison test");
    await page.fill('input[name="commune"]', "Seraing");
    await page.fill('input[name="prix"]', "245000");
    await page.fill('input[name="annee"]', "1965");
    await page.fill('input[name="surface"]', "120");
    await page.selectOption('select[name="etages"]', "1"); // nombre d'étages : obligatoire
    await page.selectOption('select[name="etat"]', "renover");
    assert.equal(await page.locator("[data-chf]").count(), 0, "plus de chauffage dans le formulaire d'ajout");
    await page.screenshot({ path: `${OUT}/${nom}-2-ajouter.png`, fullPage: nom === "ordi" }); // sur téléphone, la capture pleine page perturbe le clic suivant
    assert.equal(await page.locator("[data-choix]").count(), 0, "plus d'estimation rapide");
    await page.selectOption('select[name="facades"]', "3"); // nombre de façades
    await page.getByText("Voir le vrai coût").click();

    /* le vrai coût */
    await onglet("projet"); await page.locator(".vrai-cout .gros").waitFor({ timeout: 8000 });
    const total = await page.locator(".vrai-cout .gros").innerText();
    assert.match(total, /€/);
    assert.match(await page.locator(".vrai-cout .legende").innerText(), /Prix d'achat\s*245\s?000 €/); // le nom et le prix ont bien été gardés
    assert.match(await page.locator("h1").innerText(), /Maison test/);
    assert.match(await page.locator(".titre-maison").innerText(), /3 façades · rez \+ 1/);
    /* type de toiture : on clique sur le schéma */
    await onglet("travaux");
    await page.locator('.toit-c[data-t="croupe"]').click();
    assert.match(await page.locator(".toit-c.on").innerText(), /Quatre pans/);
    assert.match(await page.locator(".titre-maison").innerText(), /toit : quatre pans/);
    /* surface du toit : 9 m × 10 m, 4 pans à 35° → 90 ÷ cos 35° ≈ 110 m² ; « = 110 » reprend la mesure dans la couverture */
    for (const [k, v] of [["larg", "9"], ["prof", "10"]]) { await page.fill(`[data-tdim="${k}"]`, v); await page.locator(`[data-tdim="${k}"]`).dispatchEvent("change"); }
    assert.match(await page.locator(".toit-res:has-text(\"Surface de toiture\")").innerText(), /Surface de toiture\s*≈ 110 m²[\s\S]*Sol des combles[^\n]*\n?\s*≈ 90 m²/);
    await page.locator('details:has([data-mq="i_cv_1"]) > summary').click();
    await page.locator('.toit-q[data-k="i_cv_1"]').click();
    assert.equal(await page.inputValue('[data-mq="i_cv_1"]'), "110");
    /* surface des façades : 3 façades, rez + 1 → (2 × 9 + 1 × 10) × 6 m = 168 m² */
    assert.match(await page.locator(".toit-res").first().innerText(), /Surface des façades\s*≈ 168 m²/);
    await page.locator('details:has([data-mq="i_fa_3"]) > summary').click();
    await page.locator('.toit-q[data-k="i_fa_3"]').click();
    assert.equal(await page.inputValue('[data-mq="i_fa_3"]'), "168");
    /* « Qu'est-ce qui est à refaire ? » : Oui remplit les postes avec les mesures, un 2e toucher les retire */
    await page.locator('.gt[data-g="crepi"]').click();
    assert.match(await page.locator('.gt[data-g="crepi"]').innerText(), /Oui/);
    assert.equal(await page.inputValue('[data-mq="i_fa_1"]'), "168");
    await page.locator('.gt[data-g="crepi"]').click();
    assert.equal(await page.inputValue('[data-mq="i_fa_1"]'), "");
    await page.screenshot({ path: `${OUT}/${nom}-3-vrai-cout.png` });

    /* le chauffage se règle sur la fiche, onglet Travaux : mazout → pompe à chaleur + 7 radiateurs */
    await onglet("travaux");
    await page.selectOption('[data-mchf="actuel"]', "mazout");
    await page.selectOption('[data-mchf="souhaite"]', "pac");
    await page.selectOption('[data-mchf="emetteurs"]', "rad");
    await page.fill('[data-mchf="nbRad"]', "7");
    await page.locator('[data-mchf="nbRad"]').dispatchEvent("change");
    await onglet("projet");
    /* ouvrir un groupe et un poste */
    await page.locator(".grp > summary").first().click();
    await page.locator(".poste > summary").first().click();
    await page.screenshot({ path: `${OUT}/${nom}-4-detail.png`, fullPage: true });

    /* apport sur la fiche : montant à emprunter = vrai coût − apport */
    await onglet("projet");
    await page.fill('.carte [data-fin="apport"]', "40000");
    await page.locator('.carte [data-fin="apport"]').dispatchEvent("change");
    assert.equal(await page.inputValue('[data-fin="apport"]'), "40000");
    assert.match(await page.locator("main").innerText(), /Montant à emprunter/);
    /* frais de notaire : toujours calculés d'après notaire.be (245 000 € → 4 513 €), plus de saisie */
    assert.match(await page.locator("details.notaire summary").innerText(), /4\s?513 €/);
    assert.equal(await page.locator('[data-notaire-reel], [data-f="fraisNotaire"]').count(), 0, "plus de saisie du notaire");
    const apres = await page.locator(".vrai-cout .gros").innerText();

    /* hypothèse : support abîmé → imprévus 15 % */
    await onglet("projet");
    assert.match(await page.locator(".recap:not(.recap-en):not(.sim-recap)").innerText(), /Imprévus \(15 %\)/);

    /* pièce par pièce : passer la peinture en « moi-même » */
    /* chauffage repris : pompe à chaleur + 7 radiateurs */
    await onglet("travaux");
    const tout = await page.locator("main").innerText();
    assert.match(tout, /Pompe à chaleur/);
    assert.match(tout, /cuve à mazout/);
    /* une pièce : on l'ajoute, on l'ouvre, on remplit les postes imposés */
    await onglet("pieces");
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
    /* structure, toiture et équipements : liste fixe, on remplit une quantité */
    await onglet("travaux");
    await page.locator('details:has([data-mq="i_pi"]) > summary').click();
    await page.fill('[data-mq="i_pi"]', "4");
    await page.locator('[data-mq="i_pi"]').dispatchEvent("change");
    /* escalier : 16 marches = 1 escalier */
    await page.locator('details:has([data-mmarches="i_es_1"]) > summary').click();
    await page.fill('[data-mmarches="i_es_1"]', "16");
    await page.locator('[data-mmarches="i_es_1"]').dispatchEvent("change");
    assert.match(await page.locator('tr:has([data-mmarches="i_es_1"])').innerText(), /€/);
    await onglet("projet"); await page.locator(".vrai-cout .gros").waitFor();
    assert.notEqual(await page.locator(".vrai-cout .gros").innerText(), apres);

    /* retour à l'accueil : la maison est enregistrée */
    await page.getByText("← Mes maisons").click();
    await page.locator(".maison").first().waitFor();
    await page.screenshot({ path: `${OUT}/${nom}-5-mes-maisons.png` });

    /* pas de défilement horizontal sur téléphone */
    const large = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.ok(!large, `${nom} : défilement horizontal`);

    /* « Je rénove ma maison » : pas de prix d'achat ni de notaire, étapes, prêt travaux, devis */
    await page.goto(URL + "#/");
    await page.locator('.pc-choix[data-p="renovation"]').click();
    assert.match(await page.locator(".hero h1").innerText(), /rénovation/);
    assert.match(await page.locator(".grille").innerText(), /Ma maison à rénover \(démo\)[\s\S]*Budget de la rénovation/);
    assert.doesNotMatch(await page.locator(".grille").innerText(), /Maison de démonstration A/);
    await page.screenshot({ path: `${OUT}/${nom}-17-renovation-accueil.png` });
    await page.locator('.grille .maison:has-text("Ma maison à rénover")').click();
    await page.locator(".vc-mini").waitFor();
    await onglet("projet");
    assert.match(await page.locator(".vrai-cout").innerText(), /Le budget de votre rénovation/);
    assert.doesNotMatch(await page.locator(".vrai-cout").innerText(), /Prix d'achat|Droits|Notaire/);
    assert.equal(await page.locator('.om-i[data-o="achat"]').count(), 0);
    assert.equal(await page.locator('.om-i[data-o="etapes"]').count(), 0, "plus d'étapes");
    await onglet("projet");
    await page.fill('[data-fin="apport"]', "10000");
    await page.locator('[data-fin="apport"]').dispatchEvent("change");
    assert.match(await page.locator("main").innerText(), /Simulation de financement[\s\S]*Montant à emprunter \(prêt travaux\)/);
    await page.getByText("Dossier pour la banque").click();
    await page.locator(".feuille").waitFor();
    assert.match(await page.locator(".feuille").innerText(), /Rénovation[\s\S]*Le budget de la rénovation[\s\S]*Budget total/);
    assert.doesNotMatch(await page.locator(".feuille").innerText(), /Prix d'achat|Droits d'enregistrement/);
    await page.getByText("← Retour à la maison").click();
    await onglet("artisans");
    assert.equal(await page.locator(".devis").count(), 0, "plus de devis à retenir");
    await page.screenshot({ path: `${OUT}/${nom}-19-renovation-artisans.png`, fullPage: nom === "ordi" });
    assert.ok(await page.evaluate(() => document.querySelector("main").lastElementChild.classList.contains("envoi")), "l'envoi aux artisans reste le dernier bloc");
    /* choisir plusieurs artisans par métier, avec le projet propre à chacun (écran « Contacter ») */
    await page.getByText("👷 Choisir les artisans →").click();
    await page.waitForFunction(() => location.hash.startsWith("#/contacts/"));
    await page.locator(".contact-ligne").first().waitFor();
    await page.locator(".contact-ligne").first().locator('[data-v="a"]').click();
    await page.locator(".contact-ligne").first().locator("[data-art]").first().waitFor();
    for (let i = 0; i < 2; i++) await page.locator(".contact-ligne").first().locator("[data-art]").nth(i).check();
    await page.locator(".contact-ligne").first().locator('[data-action="envoi-metier"]').click();
    assert.match(await page.locator(".contact-ligne").first().innerText(), /Envoyé à 2 artisans/);
    /* dossier pour la banque, point 4 : le devis de l'artisan choisi remplace l'estimation de son métier */
    const idReno = page.url().split("/contacts/")[1];
    await page.goto(URL + "#/dossier/" + idReno);
    await page.locator(".dd-metier").first().waitFor();
    const avantDevis = await page.locator(".feuille .f-table tr.tot").first().innerText();
    const champDevis = page.locator("[data-devis-montant]").first();
    await champDevis.fill("1000");
    await champDevis.dispatchEvent("change");
    await page.locator(".feuille").getByText("Total des devis retenus").waitFor();
    assert.match(await page.locator(".feuille").innerText(), /dont devis d'artisans retenus \(1\)[\s\S]*1\s?000 €[\s\S]*4\. Les devis des artisans/);
    assert.notEqual(await page.locator(".feuille .f-table tr.tot").first().innerText(), avantDevis, "le total tient compte du devis");
    await page.screenshot({ path: `${OUT}/${nom}-22-dossier-devis.png`, fullPage: nom === "ordi" });
    await page.locator('[data-devis-choix][value=""]').first().check(); // revenir à l'estimation
    assert.equal(await page.locator(".feuille .f-table tr.tot").first().innerText(), avantDevis);
    /* comparer : seulement les maisons à acheter */
    await menu("#/comparer");
    await page.locator("main .puces").waitFor();
    assert.doesNotMatch(await page.locator("main").innerText(), /Ma maison à rénover/);
    /* ajouter une maison à rénover : pas de prix demandé */
    await page.goto(URL + "#/");
    await page.getByText("＋ Ajouter ma maison à rénover").first().click();
    assert.equal(await page.locator('input[name="prix"]').count(), 0);
    await page.fill('input[name="nom"]', "Rénovation test");
    await page.fill('input[name="annee"]', "1970");
    await page.fill('input[name="surface"]', "100");
    await page.selectOption('select[name="etages"]', "0");
    await page.getByText("Voir le budget de la rénovation").click();
    await onglet("projet"); await page.locator(".vrai-cout .gros").waitFor();
    /* rénovation sans travaux : pas de tableaux à 0 €, un rappel à la place */
    await page.locator(".vide-trav").waitFor();
    assert.equal(await page.locator('h2:has-text("Simulation de financement")').count(), 0);
    assert.match(await page.locator(".vrai-cout").innerText(), /Le budget de votre rénovation/);
    /* photo du questionnaire : on photographie les 2 pages, Valou remplit la maison (démonstration : questionnaire d'exemple) */
    await onglet("pieces");
    await page.getByText("📝 Photo du questionnaire").click();
    await page.locator("[data-qphoto]").setInputFiles([png, { ...png, name: "page2.png" }]);
    await page.locator(".q-photos .vignette").nth(1).waitFor();
    await page.locator('[data-action="q-lire"]').click();
    await page.locator(".q-resultat").waitFor();
    assert.match(await page.locator(".q-resultat").innerText(), /Démonstration[\s\S]*6 pièces[\s\S]*Séjour \/ salon[\s\S]*Structure/);
    await page.screenshot({ path: `${OUT}/${nom}-20-questionnaire-photo.png`, fullPage: nom === "ordi" });
    await page.locator('[data-action="q-appliquer"]').click();
    await page.locator(".carte-piece").nth(5).waitFor();
    assert.match(await page.locator(".grille-pieces").innerText(), /Séjour \/ salon[\s\S]*Cuisine[\s\S]*Salle de bain[\s\S]*Chambre 2/);
    assert.doesNotMatch(await page.locator(".vc-mini").innerText(), /\b0 €/);
    await page.goto(URL + "#/");
    await page.locator('.pc-choix[data-p="achat"]').click(); // retour au parcours « J'achète »
    await page.locator('.grille .maison:has-text("Maison de démonstration A")').waitFor();

    /* supprimer une maison depuis l'accueil, avec confirmation dans l'appli */
    const carteB = page.locator('.m-case:has-text("Maison de démonstration B")');
    await carteB.locator(".m-suppr").click();
    await page.locator(".conf").waitFor();
    assert.match(await page.locator(".conf").innerText(), /Supprimer « Maison de démonstration B » \?[\s\S]*effacé/);
    await page.screenshot({ path: `${OUT}/${nom}-21-supprimer.png` });
    await page.locator('.conf [data-action="suppr-annuler"]').click();
    assert.equal(await page.locator(".conf").count(), 0);
    assert.equal(await carteB.count(), 1, "annuler : la maison reste");
    await carteB.locator(".m-suppr").click();
    await page.locator(".conf-ok").click();
    await page.locator(".conf").waitFor({ state: "detached" });
    assert.equal(await page.locator('.m-case:has-text("Maison de démonstration B")').count(), 0, "la maison est supprimée");

    /* version d'essai pour les particuliers : maisons d'exemple étiquetées « Fictive », sans pages pour les professionnels */
    await page.goto(URL + "#/essai");
    await page.locator(".essai-etapes").waitFor();
    await page.screenshot({ path: `${OUT}/${nom}-11-essai.png` });
    await page.goto(URL + "#/");
    await page.locator(".essai-info").waitFor();
    assert.equal(await page.locator('.nav-i[href="#/pro"], .bb-i[href="#/plus"]').count(), 0, "pas d'espace pro en essai");
    assert.equal(await page.locator('.nav-i[href="#/avis"]').count(), 1);
    assert.equal(await page.locator('.bb-i[href="#/avis"]').count(), 1);
    if (nom === "tel") assert.ok(await page.locator(".barre-bas").isVisible(), "barre du bas sur téléphone");
    assert.match(await page.locator(".grille").innerText(), /Maison de démonstration A[\s\S]*Fictive/); // les maisons d'exemple restent pour montrer un projet rempli
    assert.match(await page.locator(".grille").innerText(), /Maison test/); // la maison du testeur est là
    await page.screenshot({ path: `${OUT}/${nom}-12-essai-maisons.png` });
    await page.goto(URL + "#/pro/artisan");
    await page.locator(".essai-etapes").waitFor(); // les pages pro ramènent à l'accueil de l'essai
    await page.goto(URL + "#/comparer");
    await page.locator("main").waitFor();
    await page.goto(URL + "#/avis");
    await page.fill("#avis-aime", "Le vrai coût");
    await page.locator("#avis-aime").dispatchEvent("change");
    await page.locator('input[name="avis-note"][value="4"]').check();
    await page.locator('.avis-choix label.on:has-text("4")').waitFor();
    assert.equal(await page.inputValue("#avis-aime"), "Le vrai coût");
    await page.screenshot({ path: `${OUT}/${nom}-13-avis.png`, fullPage: nom === "ordi" });
    /* les liens du présentateur quittent l'essai sans remise à zéro */
    await page.goto(URL + "#/demo-artisan");
    await page.locator(".etapes-demo li").first().waitFor();
    assert.equal(await page.locator(".badge-essai").count(), 0);
    await page.goto(URL + "#/essai");
    await page.locator(".essai-etapes").waitFor();
    await page.goto(URL + "#/demo");
    await page.locator(".intro-logo").waitFor();
    await page.getByText("Commencer la démo →").click();
    await page.locator('.grille .maison:has-text("Maison de démonstration A")').waitFor(); // tout est conservé
    assert.match(await page.locator(".grille").innerText(), /Maison test/);
    await page.goto(URL + "#/essai");
    await page.locator(".essai-etapes").waitFor();
    /* l'ouverture sans adresse reste dans l'essai ; la présentation en sort */
    await page.goto(URL);
    await page.locator(".essai-info").waitFor();
    await page.goto(URL + "#/presentation");
    await page.waitForFunction(() => location.hash === "#/bienvenue");
    await page.locator(".intro-logo").waitFor();
    assert.equal(await page.locator(".badge-essai").count(), 0);

    /* les 4 versions (une tuile chacune) : chacune son accueil et ses propres données */
    await page.goto(URL + "particulier/");
    await page.locator(".essai-etapes").waitFor();
    assert.match(await page.locator(".intro-boite").innerText(), /Pour vous, c'est gratuit/);
    assert.doesNotMatch(await page.locator("main").innerText(), /Voir mes maisons/); // la « Maison test » de la version complète n'y est pas
    assert.equal(await page.locator('link[rel="manifest"]').getAttribute("href"), "manifest.webmanifest");
    await page.screenshot({ path: `${OUT}/${nom}-14-v-particulier.png` });
    await page.goto(URL + "artisan/");
    assert.match(await page.locator(".intro-boite h1").innerText(), /Des chantiers déjà chiffrés/);
    assert.equal(await page.locator(".intro-fin").count(), 0, "phrase de fin : seulement la version complète");
    await page.screenshot({ path: `${OUT}/${nom}-15-v-artisan.png` });
    await page.getByText("Commencer la démo →").click();
    await page.locator(".etapes-demo li").first().waitFor();
    await page.goto(URL + "negociant/");
    assert.match(await page.locator(".intro-boite h1").innerText(), /Soyez vu sur les chantiers/);
    await page.screenshot({ path: `${OUT}/${nom}-16-v-negociant.png` });
    await page.getByText("Commencer la démo →").click();
    await page.locator(".etapes-demo li").first().waitFor();
    await page.goto(URL + "#/demo");
    assert.match(await page.locator(".intro-boite h1").innerText(), /Le vrai coût/);
    await page.close();
  }
  assert.deepEqual(erreurs, []);
  console.log("Parcours OK — captures dans", OUT);
} catch (e) { console.log("Erreurs page :", erreurs); throw e; } finally {
  await navigateur.close();
  serveur.kill();
}
