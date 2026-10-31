import { type RenderResult, render } from '@testing-library/react'
import type { ComponentType, ReactNode } from 'react'
import { LocaleProvider } from 'ui/providers/locale'
import { CI } from '../../../vitest.base.ts'
import { catalogs } from '../app/catalogs.ts'
import { LOCALES } from '../app/language.ts'

/**
 * The time limit of a case that loads a copy ({@link loadCopy}). The first
 * import of a module in a language runs the docs plugin on it, which is slow
 * when the other test files run too.
 */
export const COPY_TIMEOUT = CI ? 180_000 : 60_000

/**
 * The module at `path` in `locale`: the copy of the module, with each demo
 * text in the language (`plugin/copies.ts`). English has no copy, so in
 * English it is the module itself. The query of the copy is not a literal, so
 * the copy loads through `import`.
 *
 * @param path - The module path, relative to this folder, such as `../pages/modules/grid/data.tsx`.
 * @param locale - The locale of the copy.
 * @returns The module. Without a type argument, a module whose default export is a component.
 */
export async function loadCopy<T = { default: ComponentType }>(
	path: string,
	locale: string,
): Promise<T> {
	return import(/* @vite-ignore */ locale === LOCALES[0] ? path : `${path}?lang=${locale}`)
}

/** Renders `ui` in `locale`, with the catalogs of the docs. */
export function renderInLocale(ui: ReactNode, locale: string): RenderResult {
	return render(
		<LocaleProvider locale={locale} catalogs={catalogs}>
			{ui}
		</LocaleProvider>,
	)
}
