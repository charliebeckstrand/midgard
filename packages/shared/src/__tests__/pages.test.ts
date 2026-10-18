import { createElement, type ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { LocaleProvider, type LocaleProviderProps } from 'ui/providers/locale'
import { describe, expect, it } from 'vitest'
import { catalogs } from '../locale/catalogs'
import { ErrorPage } from '../pages/error-page'
import { NotFoundPage } from '../pages/not-found-page'

/** The server markup of `page` in `locale`, with the catalogs of shared, as `AppProviders` gives them. */
function render(locale: string, page: ReactNode): string {
	// The third argument gives the children, which the props type requires.
	const props = { locale, catalogs } as LocaleProviderProps

	return renderToString(createElement(LocaleProvider, props, page))
}

const errorPage = createElement(ErrorPage, { error: new Error('down'), retry: () => {} })

describe('ErrorPage', () => {
	it('shows its text in English', () => {
		const html = render('en', errorPage)

		expect(html).toContain('Something went wrong')

		expect(html).toContain('Try again')
	})

	it('shows its text in the language of the locale', () => {
		const html = render('es', errorPage)

		expect(html).toContain('Algo salió mal')

		expect(html).toContain('No se pudo cargar la página. Vuelve a intentarlo pronto.')

		expect(html).toContain('Volver a intentar')
	})
})

describe('NotFoundPage', () => {
	it('shows its text in the language of the locale', () => {
		expect(render('en', createElement(NotFoundPage))).toContain('This page could not be found')

		expect(render('es', createElement(NotFoundPage))).toContain('No se encontró esta página')
	})
})
