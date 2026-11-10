/**
 * Loads the chunk of the county map. The map module is a large part of the
 * code, so the Drawer loads it in a chunk of its own, and a page with no
 * state map does not load it.
 */
export const loadCountyMap = () => import('./county-map')
