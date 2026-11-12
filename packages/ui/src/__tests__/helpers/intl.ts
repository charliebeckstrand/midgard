import { localeIntl } from '../../primitives/intl/intl-catalog'

/**
 * The intl of Spanish, with the messages of the Spanish catalog of ui. The
 * tests that check a Spanish text use it. The setup of the tests loads the
 * catalog first (`setup/catalogs.ts`).
 */
export const intlEs = localeIntl('es')
