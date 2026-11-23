/* Maisons enregistrées sur l'appareil (démo : pas de compte nécessaire). */
import { cle } from "./chemins.js?v=202611231235";
const CLE = cle("valou_demo_maisons");

export function lireMaisons() {
  try {
    return JSON.parse(localStorage.getItem(CLE) || "[]");
  } catch (e) {
    return [];
  }
}

export function ecrireMaisons(liste) {
  try {
    localStorage.setItem(CLE, JSON.stringify(liste));
  } catch (e) {}
}

export const nouvelId = () => Math.random().toString(36).slice(2, 10);
