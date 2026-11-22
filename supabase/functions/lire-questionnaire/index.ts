// Valou — lecture de la photo du questionnaire de visite (écrit à la main) avec Claude.
// Fonction Supabase (Deno). La clé Anthropic est un secret Supabase : ANTHROPIC_API_KEY
// (Supabase → Edge Functions → Secrets). Elle n'est jamais envoyée au navigateur.
import Anthropic from "npm:@anthropic-ai/sdk";

const ORIGINES_OK = [/^https:\/\/(www\.)?hoono\.be$/, /^http:\/\/localhost(:\d+)?$/, /^https:\/\/[a-z0-9-]+\.claudeusercontent\.com$/];
const MAX_PHOTOS = 2;
const MAX_OCTETS = 4_500_000; // par photo, en base64

const PIECES_IMPRIMEES = ["Hall d'entrée", "Séjour / salon", "Cuisine", "WC", "Salle de bain", "Chambre 1", "Chambre 2", "Chambre 3", "Chambre 4", "Couloir / palier", "Bureau", "Buanderie", "Grenier / combles", "Garage", "Autre", "Autre"];
const GROS = { i_cv_1: "Toiture : couverture", i_to_1: "Isolation de la toiture", i_fa_3: "Isolation de façade (extérieure)", i_fa_1: "Façade : enduit / crépi", i_re: "Électricité complète", i_co: "Tableau électrique", i_pe: "Porte d'entrée", i_pi: "Portes intérieures", i_dem: "Démolition intérieure", i_zi: "Gouttières", i_es_1: "Escalier à peindre", i_te: "Terrasse" };
const RAPPELS = { chassis: "Tester chaque châssis", plans: "Demander à voir les plans", peb: "Demander le certificat PEB", elec: "Demander le contrôle de l'installation électrique", chaudiere: "Âge et entretien de la chaudière", toiture: "Âge de la toiture, charpente", humidite: "Traces d'humidité", eau: "Ouvrir les robinets, tirer la chasse", amiante: "Maison d'avant 2001 : amiante", photos: "Photographier chaque pièce" };
const CHAUFFAGES = { aucun: "Aucun / à créer", gaz: "Gaz", mazout: "Mazout", electrique: "Électrique", pac: "Pompe à chaleur", pellets: "Pellets", autre: "Autre" };

const nombre = { type: ["number", "null"] };
const texte = { type: ["string", "null"] };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lisible", "maison", "pieces", "gros", "rappels", "doutes"],
  properties: {
    lisible: { type: "boolean", description: "false si la photo n'est pas un questionnaire Valou ou est illisible" },
    maison: {
      type: "object",
      additionalProperties: false,
      required: ["adresse", "commune", "prix", "annee", "surface", "etages", "facades", "largeur", "profondeur", "etat", "seule_habitation", "peb", "peb_conso", "chauffage"],
      properties: {
        adresse: texte, commune: texte, prix: nombre, annee: nombre, surface: nombre,
        etages: { type: ["integer", "null"], description: "nombre écrit après « rez + » (0 = plain-pied)" },
        facades: { type: ["integer", "null"], enum: [2, 3, 4, null] },
        largeur: nombre, profondeur: nombre,
        etat: { type: ["string", "null"], enum: ["bon", "rafraichir", "renover", null] },
        seule_habitation: { type: ["boolean", "null"] },
        peb: { type: ["string", "null"], enum: ["A++", "A+", "A", "B", "C", "D", "E", "F", "G", null] },
        peb_conso: nombre,
        chauffage: { type: ["string", "null"], enum: [...Object.keys(CHAUFFAGES), null] },
      },
    },
    pieces: {
      type: "array",
      description: "une entrée par ligne du tableau où quelque chose est écrit ou coché",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nom", "sol_m2", "sol_a_refaire", "murs_a_refaire", "chassis", "remarques"],
        properties: { nom: { type: "string" }, sol_m2: nombre, sol_a_refaire: { type: "boolean" }, murs_a_refaire: { type: "boolean" }, chassis: { type: ["integer", "null"] }, remarques: texte },
      },
    },
    gros: { type: "array", items: { type: "string", enum: Object.keys(GROS) } },
    rappels: { type: "array", items: { type: "string", enum: Object.keys(RAPPELS) } },
    doutes: { type: "array", items: { type: "string" }, description: "réponses difficiles à lire, en français, courtes" },
  },
};

const CONSIGNE = `Tu lis la photo d'un questionnaire de visite Valou (une feuille A4 imprimée, remplie au stylo, en français, en Belgique).
Recopie fidèlement ce qui est écrit ou coché ; n'invente rien : une case vide donne null (ou false pour une case à cocher), une ligne de pièce vide n'est pas renvoyée.
La feuille contient :
- en haut : Adresse, Commune, Prix (€), Année, Surface (m²), Étages (« rez + » suivi d'un chiffre), Façades (2, 3 ou 4), Largeur façade (m), Profondeur (m) ; État (${["Bon", "À rafraîchir", "À rénover"].join(", ")} → bon / rafraichir / renover) ; Seule habitation (Oui/Non) ; PEB (une lettre cochée) et la consommation en kWh/m²/an ; Chauffage existant (${Object.entries(CHAUFFAGES).map(([k, v]) => `${v} → ${k}`).join(", ")}).
- un cadre « À ne pas oublier » avec des cases : ${Object.entries(RAPPELS).map(([k, v]) => `${v} → ${k}`).join(" ; ")}.
- le tableau des pièces, lignes pré-imprimées : ${PIECES_IMPRIMEES.join(", ")} (« Autre » : prends le nom écrit à la main). Colonnes : Sol m², Sol à refaire (case), Murs à refaire (case), Châssis à remplacer (nombre), Remarques (texte libre, recopie-le).
- à droite, « Gros travaux (hors pièces) », des cases : ${Object.entries(GROS).map(([k, v]) => `${v} → ${k}`).join(" ; ")}.
Les nombres belges utilisent la virgule décimale (« 12,5 » = 12.5) et parfois un point ou une espace pour les milliers (« 245.000 » = 245000).
Si plusieurs photos sont fournies, ce sont des parties de la même feuille : fusionne-les.
Mets dans « doutes » ce que tu as eu du mal à lire.`;

function cors(origine: string | null) {
  const ok = origine && ORIGINES_OK.some(r => r.test(origine));
  return {
    "Access-Control-Allow-Origin": ok ? origine! : "https://hoono.be",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
const repondre = (corps: unknown, statut: number, entetes: Record<string, string>) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { ...entetes, "Content-Type": "application/json" } });

Deno.serve(async req => {
  const origine = req.headers.get("origin");
  const h = cors(origine);
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return repondre({ erreur: "méthode" }, 405, h);
  if (!origine || !ORIGINES_OK.some(r => r.test(origine))) return repondre({ erreur: "origine non autorisée" }, 403, h);
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return repondre({ erreur: "clé Anthropic non configurée dans Supabase" }, 503, h);

  let photos: { type: string; data: string }[];
  try {
    photos = (await req.json()).photos;
  } catch {
    return repondre({ erreur: "requête illisible" }, 400, h);
  }
  if (!Array.isArray(photos) || !photos.length || photos.length > MAX_PHOTOS) return repondre({ erreur: `1 à ${MAX_PHOTOS} photos` }, 400, h);
  for (const p of photos) {
    if (!p || !["image/jpeg", "image/png", "image/webp"].includes(p.type) || typeof p.data !== "string" || p.data.length > MAX_OCTETS) {
      return repondre({ erreur: "photo refusée (format ou taille)" }, 400, h);
    }
  }

  const client = new Anthropic(); // lit ANTHROPIC_API_KEY
  try {
    const reponse = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      system: CONSIGNE,
      messages: [{
        role: "user",
        content: [
          ...photos.map(p => ({ type: "image" as const, source: { type: "base64" as const, media_type: p.type as "image/jpeg", data: p.data } })),
          { type: "text" as const, text: "Lis ce questionnaire et renvoie les réponses." },
        ],
      }],
    });
    if (reponse.stop_reason === "refusal") return repondre({ erreur: "lecture refusée" }, 422, h);
    if (reponse.stop_reason === "max_tokens") return repondre({ erreur: "réponse trop longue" }, 502, h);
    const bloc = reponse.content.find(b => b.type === "text");
    if (!bloc || bloc.type !== "text") return repondre({ erreur: "pas de réponse" }, 502, h);
    return repondre({ lu: JSON.parse(bloc.text) }, 200, h);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return repondre({ erreur: "trop de demandes, réessayez dans une minute" }, 429, h);
    if (e instanceof Anthropic.AuthenticationError) return repondre({ erreur: "clé Anthropic refusée" }, 503, h);
    if (e instanceof Anthropic.APIError) return repondre({ erreur: "service de lecture indisponible" }, 502, h);
    if (e instanceof SyntaxError) return repondre({ erreur: "réponse illisible" }, 502, h);
    throw e;
  }
});
