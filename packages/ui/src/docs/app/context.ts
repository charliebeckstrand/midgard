import type { NavigateFunction } from 'react-router'
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

/**
 * The `navigate` of the shell. The function of the root route does not change,
 * so a link that reads it does not render again on a navigation.
 */
export const [NavigateContext, useShellNavigate] = createContext<NavigateFunction>('Navigate')
