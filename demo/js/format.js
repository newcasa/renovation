const fmt0 = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 0 });
const fmt2 = new Intl.NumberFormat("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* Montant arrondi à la centaine pour les fourchettes, à l'euro pour le reste */
export const euros = (v, arrondi = 1) => fmt0.format(Math.round(v / arrondi) * arrondi) + " €";
export const euros2 = v => fmt2.format(v) + " €";
export const nombre = v => fmt0.format(v);

export const esc = s =>
  String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
