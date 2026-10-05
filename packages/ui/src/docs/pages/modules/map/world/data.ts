import type { MapTopology } from 'ui/map'
import countries from 'world-atlas/countries-110m.json'

/**
 * The countries of `world-atlas` as a topology. The map decodes the object
 * that `geographyObject` names.
 */
export const world = countries as unknown as MapTopology
