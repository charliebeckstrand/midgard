import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { appTitle, formatTitle } from '../pages/app-title'
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

	it('gives its title as the heading of the page', () => {
		expect(renderInLocale('en', errorPage)).toMatch(/<h1[^>]*>Something went wrong<\/h1>/)
	})

	it('shows its text in the language of the locale', () => {
		const html = renderInLocale('es', errorPage)

		expect(html).toContain('Algo salió mal')

		expect(html).toContain('No se pudo cargar la página. Vuelve a intentarlo pronto.')

		expect(html).toContain('Volver a intentar')
	})
})

describe('NotFoundPage', () => {
	it('gives its title as the heading of the page', () => {
		expect(renderInLocale('en', createElement(NotFoundPage))).toMatch(/<h1[^>]*>404<\/h1>/)
	})

	it('shows its text in the language of the locale', () => {
		expect(renderInLocale('en', createElement(NotFoundPage))).toContain(
			'This page could not be found',
		)

		expect(renderInLocale('es', createElement(NotFoundPage))).toContain(
			'No se encontró esta página',
		)
	})
})

describe('appTitle', () => {
	it('shows the name of the app on the home page, and puts each other title before it', () => {
		expect(appTitle('Admin')).toEqual({ default: 'Admin', template: '%s | Admin' })

		expect(formatTitle('Users', 'Admin')).toBe('Users | Admin')
	})
})
