/* Chargement des références : les mêmes fichiers que l'appli Valou (à la racine du site),
   puis les prix publiés depuis le tableau de bord des calculs (Supabase, lecture publique). */
import { indexer } from "./moteur.js";

const json = u => fetch(u, { cache: "no-cache" }).then(r => (r.ok ? r.json() : Promise.reject(new Error(u))));

async function prixPublies() {
  try {
    const cfg = await json("../kozi-config.json");
    if (!cfg || !cfg.url || !cfg.key) return null;
    const h = { apikey: cfg.key };
    if (!/^sb_/.test(cfg.key)) h.Authorization = "Bearer " + cfg.key;
    const r = await fetch(cfg.url.replace(/\/$/, "") + "/rest/v1/valou_tarifs?id=eq.ref&select=data,updated_at", { headers: h, cache: "no-store" });
    if (!r.ok) return null;
    const a = await r.json();
    return a[0] ? { ...a[0].data, maj: a[0].updated_at } : null;
  } catch (e) {
    return null;
  }
}

export async function chargerReferences() {
  const [ref, mo, hubo, aides, pub] = await Promise.all([
    json("../tarifs-reference.json"),
    json("../main-oeuvre.json"),
    json("../prix-hubo.json"),
    json("../aides-renovation.json").catch(() => null),
    prixPublies(),
  ]);
  const R = indexer({ ref, mo, hubo, pub });
  R.aides = aides;
  R.sources = { mo: mo.source, moDate: mo.date, hubo: hubo.source, huboDate: hubo.date, pub: pub ? pub.maj : null };
  return R;
}
