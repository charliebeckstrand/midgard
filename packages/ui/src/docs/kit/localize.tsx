import { type ComponentType, use, useDeferredValue } from 'react'
import { useIntl } from 'ui/primitives/intl'
import { getOrCompute } from '../../utilities/get-or-compute.ts'
import { noop } from '../../utilities/noop.ts'

/** The loader of the copy of a page module in one language (`plugin/demo-text.ts`). */
export type CopyLoader = () => Promise<{ default: ComponentType }>

/** A page or a tab in the language of the reader ({@link localize}). */
export type LocalizedPage = ComponentType & {
	/** Loads the copy of the page in the language of `locale`, if the page has one. */
	preload: (locale: string) => Promise<void>
}

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
 * In the browser, the copy in the language of the HTML starts to load when the
 * module loads. The server render waits for the copy, and the hydration render
 * keeps the HTML of the server until the copy loads. When the reader changes
 * the language, the page shows the old language until the copy of the new one
 * loads.
 */
export function localize(
	English: ComponentType,
	copies: Readonly<Record<string, CopyLoader>>,
): LocalizedPage {
	// The load of each copy, by language. `use` needs the same promise at each render.
	const loads = new Map<string, Promise<ComponentType>>()

	// Each copy that loaded, by language, so a render after the load does not suspend.
	const loaded = new Map<string, ComponentType>()

	const load = (language: string, loader: CopyLoader) =>
		getOrCompute(loads, language, () =>
			loader().then(({ default: Copy }) => {
				loaded.set(language, Copy)

				return Copy
			}),
		)

	function Localized() {
		const language = useDeferredValue(toLanguage(useIntl().locale))

		const loader = copies[language]

		if (loader === undefined) return <English />

		const Copy = loaded.get(language) ?? use(load(language, loader))

		return <Copy />
	}

	Localized.displayName = `Localized(${English.displayName ?? English.name})`

	const preload = async (locale: string) => {
		const language = toLanguage(locale)

		const loader = copies[language]

		if (loader) await load(language, loader)
	}

	const { lang } = globalThis.document?.documentElement ?? {}

	// An error of the load shows when the page renders.
	if (lang) preload(lang).catch(noop)

	return Object.assign(Localized, { preload })
}
