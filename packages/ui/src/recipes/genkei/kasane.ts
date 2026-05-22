/**
 * Compat shim. The canonical kasane now lives in `kiso/` — it is a flat
 * fragment map (no archetype logic) and so structurally belongs alongside
 * `omote` / `sen`. This re-export keeps the genkei consumers wired up while
 * the katakana migration is in progress; remove once `genkei/control` moves.
 */

export { kasane } from '../kiso/kasane'
