/* Régénère demo/questionnaire-visite.pdf (la feuille de visite A4 à l'horizontale, prête à imprimer).
   À lancer après chaque changement du questionnaire : node demo/tests/pdf-questionnaire.mjs */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire(import.meta.url)("playwright");
const racine = fileURLToPath(new URL("../../", import.meta.url));
const PORT = 8790;
const serveur = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: racine, stdio: "ignore" });
await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch();
try {
  const p = await b.newPage({ viewport: { width: 1123, height: 794 } });
  await p.goto(`http://localhost:${PORT}/demo/#/questionnaire`);
  await p.locator(".q-page").waitFor();
  await p.waitForTimeout(800); // polices
  await p.emulateMedia({ media: "print" });
  await p.pdf({ path: racine + "demo/questionnaire-visite.pdf", format: "A4", landscape: true, printBackground: true, margin: { top: "8mm", bottom: "8mm", left: "8mm", right: "8mm" } });
  console.log("demo/questionnaire-visite.pdf régénéré");
} finally { await b.close(); serveur.kill(); }
