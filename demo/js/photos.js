/* Valou — photos de la visite, rangées par pièce.
   Les photos restent sur l'appareil (IndexedDB), réduites à 1600 px pour prendre peu de place.
   Une photo garde le NOM de la pièce choisi au moment de la prise : elle s'associe ensuite à la pièce du même nom. */
import { cle } from "./chemins.js?v=202611231001";

const DB = cle("valou_demo_photos"), STORE = "photos";
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

/* réduit la photo (1600 px de côté maximum, JPEG) */
export async function reduire(fichier, max = 1600) {
  try {
    const img = await createImageBitmap(fichier);
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(ok => c.toBlob(b => ok(b || fichier), "image/jpeg", 0.78));
  } catch (e) {
    return fichier;
  }
}

export async function ajouterPhoto(maisonId, nomPiece, fichier) {
  const blob = await reduire(fichier);
  const p = { id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36), maisonId, nomPiece, date: Date.now(), blob };
  await tx("readwrite", s => s.put(p));
  return p;
}
export const listerPhotos = maisonId => tx("readonly", s => s.index("maison").getAll(maisonId)).then(L => (L || []).sort((a, b) => a.date - b.date));
export async function renommerPhoto(id, nomPiece) {
  const p = await tx("readonly", s => s.get(id));
  if (p) await tx("readwrite", s => s.put({ ...p, nomPiece }));
}
export const supprimerPhoto = id => tx("readwrite", s => s.delete(id));
export async function supprimerPhotosMaison(maisonId) {
  const L = await listerPhotos(maisonId);
  for (const p of L) await supprimerPhoto(p.id);
}

/* association photo → pièce : même nom (sans tenir compte des majuscules ni des espaces) */
export const memeNom = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
export const pieceDePhoto = (m, photo) => (m.pieces || []).find(pc => memeNom(pc.nom, photo.nomPiece)) || null;
