import { createPhotonProvider } from 'ui/address-input'

/**
 * The geocoder. Photon ranks by prominence and returns businesses beside plain
 * addresses, so a name typed in the search resolves to the business that
 * carries it.
 *
 * One instance for the form. The search field asks it for matches, and a submit
 * asks it for the position of an address that the reader typed.
 */
export const placeGeocoder = createPhotonProvider({ limit: 8 })
