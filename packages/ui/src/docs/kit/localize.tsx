import { type ComponentType, use, useDeferredValue } from 'react'
import { preloadModule } from 'react-dom'
import { useIntl } from 'ui/primitives/intl'
import { getOrCompute } from '../../utilities/get-or-compute.ts'

/** The loader of the copy of a page module in one language (`plugin/copies.ts`). */
export type CopyLoader = () => Promise<{ default: ComponentType }>

/** The language subtag of the BCP 47 tag `locale`, such as `es` for `es-ES`. */
function toLanguage(locale: string): string {
	return new Intl.Locale(locale).language
}

/**
 * The page or the tab `English` in the language of the reader. The docs
 * plugin wraps the default export of each page and each tab module with it,
 * and gives the loader of the copy of the module in each language that has a
 * catalog. A language with no copy shows `English`.
 *
 * In the server build, `preloads` gives the URL of each chunk that the copy in
 * a language adds. The HTML of the page in that language preloads them, so
 * the browser loads the copy with the page module. The server render waits
 * for the copy, and the hydration render keeps the HTML of the server until
 * the copy loads. When the reader changes the language, the page shows the old
 * language until the copy of the new one loads.
 */
export function localize(
	English: ComponentType,
	copies: Readonly<Record<string, CopyLoader>>,
	preloads: Readonly<Record<string, readonly string[]>> = {},
): ComponentType {
	// The load of each copy, by language. `use` needs the same promise at each
	// render, and it reads a promise that it saw resolve with no suspend.
	const loads = new Map<string, Promise<ComponentType>>()

	function Localized() {
		const language = useDeferredValue(toLanguage(useIntl().locale))

		const loader = copies[language]

		if (loader === undefined) return <English />

		for (const href of preloads[language] ?? []) preloadModule(href)

		const Copy = use(getOrCompute(loads, language, () => loader().then((module) => module.default)))

		return <Copy />
	}

	Localized.displayName = `Localized(${English.displayName ?? English.name})`

	return Localized
}
