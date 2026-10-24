import { createContext } from 'ui/core'
import { LOCALES } from './language.ts'

/**
 * The locale that the HTML of the page renders in: the locale of the request
 * on the server, and the `lang` of the root element in the browser
 * (`language.ts`).
 */
export const [DocumentLocale, useDocumentLocale] = createContext<string>('DocumentLocale', {
	default: LOCALES[0],
})
