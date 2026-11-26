/* Valou — documents du dossier pour la banque (fiches de paie, PEB, compromis…).
   Ils restent sur l'appareil (IndexedDB) : rien n'est envoyé. Les photos sont réduites, les PDF gardés tels quels. */
import { cle } from "./chemins.js?v=202611260132";
import { reduire } from "./photos.js?v=202611260132";

const DB = cle("valou_demo_docs"), STORE = "docs";
const MAX_OCTETS = 10 * 1024 * 1024; // 10 Mo par document
let ouverture = null;
function base() {
  if (!ouverture) ouverture = new Promise((ok, ko) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" }).createIndex("maison", "maisonId");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
  return ouverture;
}
const tx = async (mode, f) => { const db = await base(); return new Promise((ok, ko) => { const t = db.transaction(STORE, mode), s = t.objectStore(STORE), r = f(s); t.oncomplete = () => ok(r && r.result); t.onerror = () => ko(t.error); }); };

/* types de documents demandés par la banque */
export const TYPES_DOCS = [
  ["identite", "Carte d'identité (recto et verso)"],
  ["paie", "Fiches de paie (les 3 dernières)"],
  ["contrat", "Contrat de travail ou attestation de l'employeur"],
  ["impots", "Avertissement-extrait de rôle (impôts)"],
  ["epargne", "Extraits de compte (épargne, apport)"],
  ["compromis", "Compromis de vente ou offre acceptée", "achat"],
  ["titre", "Titre de propriété", "renovation"],
  ["peb", "Certificat PEB"],
  ["devis", "Devis des artisans"],
  ["autre", "Autre document"],
];

export async function ajouterDoc(maisonId, type, fichier) {
  const pdf = fichier.type === "application/pdf";
  if (!pdf && !/^image\//.test(fichier.type)) throw new Error("format non accepté (photo ou PDF)");
  if (fichier.size > MAX_OCTETS) throw new Error("fichier trop lourd (10 Mo au plus)");
  const blob = pdf ? fichier : await reduire(fichier, 2000);
  const d = { id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36), maisonId, type, nom: fichier.name || (pdf ? "document.pdf" : "photo.jpg"), mime: pdf ? "application/pdf" : "image/jpeg", taille: blob.size, date: Date.now(), blob };
  await tx("readwrite", s => s.put(d));
  return d;
}
export const listerDocs = maisonId => tx("readonly", s => s.index("maison").getAll(maisonId)).then(L => (L || []).sort((a, b) => a.date - b.date));
export const supprimerDoc = id => tx("readwrite", s => s.delete(id));
export async function supprimerDocsMaison(maisonId) {
  for (const d of await listerDocs(maisonId)) await supprimerDoc(d.id);
}
