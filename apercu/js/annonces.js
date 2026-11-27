/* Valou — aperçu commercial : annonces des agences (fictives) et dessins des maisons */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
/* ---------- agences (fictives) ---------- */
export const AGENCES = {
 clemeuse: { n: "Clémeuse Immobilier", v: "Liège", c: "#0F6E8C", i: "CM", tel: "04 000 11 20" },
 brique: { n: "Brique & Ardoise", v: "Seraing", c: "#8C3B2E", i: "BA", tel: "04 000 11 21" },
 coteaux: { n: "Agence Les Coteaux", v: "Chaudfontaine", c: "#3E6B3A", i: "LC", tel: "04 000 11 22" },
 toitvert: { n: "Toit Vert Immo", v: "Herstal", c: "#2E7D5B", i: "TV", tel: "04 000 11 23" },
 hesbaye: { n: "Hesbaye Logis", v: "Waremme", c: "#9A6B12", i: "HL", tel: "04 000 11 24" },
 vallee: { n: "Vallée Immo Conseil", v: "Esneux", c: "#5B4B8A", i: "VI", tel: "04 000 11 25" },
};
/* ---------- annonces (fictives) ---------- */
export const ETATS = { rafraichir: { t: "À rafraîchir", k: 1 }, renover: { t: "À rénover", k: 2 }, lourde: { t: "Rénovation lourde", k: 3 }, bon: { t: "Bon état", k: 0 } };
export const ANNONCES = [
 { id: 1, t: "Maison mitoyenne 3 chambres avec jardin", ty: "mitoyenne", co: "Liège", cp: "4020", q: "Outremeuse", p: 219000, m2: 135, ch: 3, sdb: 1, te: 180, peb: "E", an: 1932, e: "renover", ag: "clemeuse", boost: true, hue: 0 },
 { id: 2, t: "Fermette en pierre à restaurer", ty: "fermette", co: "Esneux", cp: "4130", q: "Hameau de Fontin", p: 289000, m2: 168, ch: 4, sdb: 1, te: 1850, peb: "F", an: 1890, e: "lourde", ag: "vallee", boost: true, hue: 1 },
 { id: 3, t: "Bel-étage lumineux avec garage", ty: "beletage", co: "Seraing", cp: "4100", q: "Boncelles", p: 249000, m2: 142, ch: 3, sdb: 1, te: 320, peb: "D", an: 1974, e: "rafraichir", ag: "brique", hue: 2 },
 { id: 4, t: "Villa 4 façades sur grand terrain", ty: "villa", co: "Chaudfontaine", cp: "4050", q: "Beaufays", p: 395000, m2: 196, ch: 4, sdb: 2, te: 1240, peb: "D", an: 1981, e: "renover", ag: "coteaux", hue: 3 },
 { id: 5, t: "Maison de ville en brique à moderniser", ty: "mitoyenne", co: "Herstal", cp: "4040", q: "Centre", p: 175000, m2: 118, ch: 3, sdb: 1, te: 95, peb: "F", an: 1925, e: "renover", ag: "toitvert", hue: 4 },
 { id: 6, t: "Appartement 2 chambres avec terrasse", ty: "appart", co: "Liège", cp: "4000", q: "Guillemins", p: 199000, m2: 92, ch: 2, sdb: 1, te: 0, peb: "C", an: 1968, e: "rafraichir", ag: "clemeuse", hue: 5 },
 { id: 7, t: "Maison semi-mitoyenne proche écoles", ty: "semi", co: "Waremme", cp: "4300", q: "Quartier gare", p: 239000, m2: 150, ch: 3, sdb: 1, te: 410, peb: "E", an: 1958, e: "renover", ag: "hesbaye", hue: 6 },
 { id: 8, t: "Maison de caractère en pierre", ty: "pierre", co: "Esneux", cp: "4130", q: "Tilff", p: 335000, m2: 175, ch: 4, sdb: 2, te: 640, peb: "E", an: 1910, e: "rafraichir", ag: "vallee", hue: 7 },
 { id: 9, t: "Maison ouvrière à rénover entièrement", ty: "mitoyenne", co: "Seraing", cp: "4100", q: "Jemeppe", p: 139000, m2: 104, ch: 2, sdb: 1, te: 70, peb: "G", an: 1905, e: "lourde", ag: "brique", hue: 8 },
 { id: 10, t: "Villa des années 70 avec piscine", ty: "villa", co: "Chaudfontaine", cp: "4053", q: "Embourg", p: 459000, m2: 220, ch: 5, sdb: 2, te: 1600, peb: "E", an: 1976, e: "renover", ag: "coteaux", hue: 9 },
 { id: 11, t: "Maison 3 façades rénovée en partie", ty: "semi", co: "Herstal", cp: "4040", q: "Vottem", p: 265000, m2: 148, ch: 3, sdb: 1, te: 520, peb: "C", an: 1964, e: "bon", ag: "toitvert", hue: 10 },
 { id: 12, t: "Fermette hesbignonne avec dépendances", ty: "fermette", co: "Waremme", cp: "4300", q: "Bettincourt", p: 349000, m2: 210, ch: 4, sdb: 1, te: 3200, peb: "F", an: 1880, e: "lourde", ag: "hesbaye", hue: 11 },
];
export const DESC = {
 mitoyenne: "Maison de rangée typique, belle hauteur sous plafond, cave saine. Jardin orienté sud-ouest. Proche commerces, écoles et transports.",
 fermette: "Ensemble en moellons sous ardoises, beaux volumes, poutres d'origine. Grande grange, jardin et prairie. Calme absolu.",
 beletage: "Bel-étage avec garage et atelier au rez, séjour lumineux à l'étage, cuisine séparée. Quartier résidentiel recherché.",
 villa: "Villa 4 façades sur terrain arboré, séjour avec feu ouvert, grand garage. Toiture et menuiseries d'origine.",
 appart: "Appartement traversant au 3e étage avec ascenseur, terrasse plein sud, cave et emplacement vélo. Faibles charges.",
 semi: "Maison 3 façades avec garage et jardin clos, combles aménageables. Rue calme, à deux pas des écoles.",
 pierre: "Maison de caractère en pierre du pays, parquets anciens, cheminées, jardin en terrasses avec vue sur la vallée.",
};
export const PEBC = { A: "#1C8C3E", B: "#53A33A", C: "#A2C02D", D: "#F2C511", E: "#F0951E", F: "#E5531F", G: "#C9231E" };
/* ---------- maisons dessinées (illustrations, pas de photos) ---------- */
const PAL = [["#B5583F", "#7A2E22"], ["#9A8F7E", "#5F574B"], ["#C26A4A", "#8A3B2E"], ["#EDE6DA", "#BFB4A2"], ["#A64B36", "#6E2A1E"], ["#D9D4CC", "#A9A196"], ["#B9654A", "#83402D"], ["#A39784", "#6B6253"], ["#9C4C38", "#5F2A1F"], ["#F1ECE2", "#C8BFAE"], ["#BE7356", "#8A4630"], ["#ADA08A", "#736856"]];
const ROOF = { tuile: "#8A3B2E", ardoise: "#3C4350", anthra: "#2D3038" };
export function house(a, v = 0) {
 const [w1, w2] = PAL[a.hue % PAL.length], sky = v === 1 ? ["#F6D8B8", "#FCEBD8"] : v === 2 ? ["#BFD9EE", "#E7F1F9"] : ["#A9CBEA", "#E3EEF8"];
 const g = `g${a.id}${v}`;
 let b = "";
 const win = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#F7F4EE"/><rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" fill="#7FA3C4"/><path d="M${x + w / 2} ${y + 3} V${y + h - 3} M${x + 3} ${y + h * .42} H${x + w - 3}" stroke="#F7F4EE" stroke-width="2.5"/>`;
 const door = (x, y, c = "#3B4A5E") => `<rect x="${x}" y="${y}" width="30" height="58" rx="2" fill="${c}"/><circle cx="${x + 24}" cy="${y + 31}" r="2" fill="#E2C497"/>`;
 const tree = (x, s = 1) => `<rect x="${x - 3 * s}" y="${250 - 40 * s}" width="${6 * s}" height="${40 * s}" fill="#6B4B33"/><circle cx="${x}" cy="${250 - 58 * s}" r="${30 * s}" fill="#4F8A4A"/><circle cx="${x - 16 * s}" cy="${250 - 44 * s}" r="${20 * s}" fill="#5E9A55"/><circle cx="${x + 17 * s}" cy="${250 - 46 * s}" r="${22 * s}" fill="#477F43"/>`;
 const bricks = `<pattern id="p${g}" width="22" height="10" patternUnits="userSpaceOnUse"><rect width="22" height="10" fill="${w1}"/><path d="M0 0H22M0 5H22M11 0V5M0 5V10M22 5V10" stroke="${w2}" stroke-width=".7" opacity=".45"/></pattern>`;
 const stone = `<pattern id="p${g}" width="26" height="16" patternUnits="userSpaceOnUse"><rect width="26" height="16" fill="${w1}"/><path d="M0 8 Q6 6 13 8 T26 8 M8 0 V8 M19 8 V16" stroke="${w2}" stroke-width="1" fill="none" opacity=".5"/></pattern>`;
 const fill = a.ty === "fermette" || a.ty === "pierre" ? stone : a.ty === "villa" || a.ty === "appart" ? "" : bricks;
 const wall = fill ? `url(#p${g})` : w1;
 if (a.ty === "mitoyenne") b = `<rect x="40" y="70" width="70" height="180" fill="#C9A08C"/><rect x="290" y="80" width="70" height="170" fill="#B88B76"/><path d="M28 72 L75 40 L122 72Z M280 82 L325 52 L372 82Z" fill="#7B3A2E"/>
  <rect x="110" y="88" width="180" height="162" fill="${wall}"/><path d="M98 92 L200 40 L302 92Z" fill="${ROOF.tuile}"/><rect x="176" y="56" width="16" height="22" fill="#6E3326"/>
  ${win(128, 110, 40, 46)}${win(232, 110, 40, 46)}${win(128, 180, 40, 46)}${door(222, 192)}<rect x="110" y="246" width="180" height="6" fill="#8E8A84"/>`;
 else if (a.ty === "fermette") b = `<rect x="40" y="120" width="120" height="130" fill="${wall}"/><path d="M30 124 L100 76 L170 124Z" fill="${ROOF.ardoise}"/>
  <rect x="160" y="100" width="190" height="150" fill="${wall}"/><path d="M148 104 L255 50 L362 104Z" fill="${ROOF.ardoise}"/><rect x="300" y="62" width="14" height="26" fill="#5F574B"/>
  <path d="M60 250 V180 Q100 150 140 180 V250Z" fill="#6E5640"/><path d="M100 160 V250" stroke="#4E3B2B" stroke-width="2"/>${win(184, 126, 34, 40)}${win(296, 126, 34, 40)}${win(184, 186, 34, 40)}${door(244, 192, "#5C7A5A")}
  <rect x="180" y="124" width="6" height="44" fill="#5C7A5A"/><rect x="216" y="124" width="6" height="44" fill="#5C7A5A"/>${tree(372, .9)}`;
 else if (a.ty === "villa") b = `<rect x="60" y="130" width="230" height="120" fill="${w1}"/><rect x="290" y="168" width="80" height="82" fill="${w2}"/><path d="M44 134 L175 72 L306 134Z" fill="${ROOF.anthra}"/><path d="M284 170 L330 140 L376 170Z" fill="${ROOF.anthra}"/>
  ${win(84, 158, 56, 50)}${win(160, 158, 56, 50)}${door(236, 192)}<rect x="300" y="196" width="60" height="54" fill="#C9CED6"/><path d="M300 206H360M300 216H360M300 226H360M300 236H360" stroke="#AEB4BE"/>${tree(28, .9)}`;
 else if (a.ty === "appart") b = `<rect x="110" y="40" width="190" height="210" fill="${w1}"/><rect x="110" y="34" width="190" height="10" fill="${w2}"/>
  ${[60, 108, 156].map(y => win(130, y, 40, 34) + win(186, y, 40, 34) + win(242, y, 40, 34) + `<rect x="126" y="${y + 36}" width="160" height="5" fill="${w2}"/>`).join("")}${door(190, 192, "#2F3E52")}${tree(60, .8)}${tree(350, .7)}`;
 else if (a.ty === "beletage") b = `<rect x="90" y="80" width="220" height="170" fill="${wall}"/><rect x="84" y="74" width="232" height="10" fill="#8E8A84"/>
  ${win(112, 104, 58, 52)}${win(184, 104, 58, 52)}${win(256, 108, 40, 46)}<rect x="112" y="186" width="100" height="64" fill="#C9CED6"/><path d="M112 198H212M112 210H212M112 222H212M112 234H212" stroke="#AEB4BE"/>${door(250, 192)}`;
 else if (a.ty === "semi") b = `<rect x="40" y="96" width="60" height="154" fill="#B88B76"/><path d="M30 100 L70 72 L110 100Z" fill="#7B3A2E"/><rect x="100" y="104" width="200" height="146" fill="${wall}"/><path d="M88 108 L200 52 L312 108Z" fill="${ROOF.tuile}"/>
  ${win(122, 130, 44, 44)}${win(232, 130, 44, 44)}${win(122, 192, 44, 44)}${door(234, 192)}<rect x="300" y="186" width="70" height="64" fill="${w2}"/><rect x="306" y="196" width="58" height="54" fill="#C9CED6"/>${tree(372, .6)}`;
 else b = `<rect x="80" y="96" width="240" height="154" fill="${wall}"/><path d="M66 100 L200 44 L334 100Z" fill="${ROOF.ardoise}"/><rect x="260" y="56" width="14" height="28" fill="#5F574B"/>
  ${win(104, 124, 40, 48)}${win(180, 124, 40, 48)}${win(256, 124, 40, 48)}${win(104, 190, 40, 48)}${door(186, 192, "#6B4B33")}${win(256, 190, 40, 48)}${tree(40, .8)}`;
 return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(a.t)}"><defs><linearGradient id="s${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>${fill}</defs>
  <rect width="400" height="300" fill="url(#s${g})"/><circle cx="${v === 1 ? 330 : 70}" cy="54" r="22" fill="#FFF6D6" opacity=".85"/>
  <path d="M0 230 Q100 205 200 226 T400 222 V300 H0Z" fill="#9CC48B"/>${b}<rect y="250" width="400" height="50" fill="#8DB97C"/><path d="M0 268 H400" stroke="#7DA86D" stroke-width="3" opacity=".5"/></svg>`;
}
