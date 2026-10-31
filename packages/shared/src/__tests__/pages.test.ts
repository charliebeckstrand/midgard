import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { ErrorPage } from '../pages/error-page'
import { NotFoundPage } from '../pages/not-found-page'
import { renderInLocale } from './helpers/intl'

const errorPage = createElement(ErrorPage, { error: new Error('down'), retry: () => {} })

describe('ErrorPage', () => {
	it('shows its text in English', () => {
		const html = renderInLocale('en', errorPage)

		expect(html).toContain('Something went wrong')

		expect(html).toContain('Try again')
	})

	it('shows its text in the language of the locale', () => {
		const html = renderInLocale('es', errorPage)

		expect(html).toContain('Algo salió mal')

		expect(html).toContain('No se pudo cargar la página. Vuelve a intentarlo pronto.')

		expect(html).toContain('Volver a intentar')
	})
})

describe('NotFoundPage', () => {
	it('shows its text in the language of the locale', () => {
		expect(renderInLocale('en', createElement(NotFoundPage))).toContain(
			'This page could not be found',
		)

		expect(renderInLocale('es', createElement(NotFoundPage))).toContain(
			'No se encontró esta página',
		)
	})
})
