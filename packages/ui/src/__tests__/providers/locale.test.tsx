import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Listbox, ListboxOption } from '../../components/listbox'
import { writeChoice } from '../../providers/appearance/appearance-storage'
import { LocaleProvider, resolveRequestLocale, useLocale } from '../../providers/locale'
import { localeChoice, matchLocale } from '../../providers/locale/locale-choice'
import { act, clearCookies, renderUI, screen } from '../helpers'

// The English locales, with the default first.
const LOCALES = ['en-US', 'en-GB', 'en-CA', 'en-AU'] as const

/** Makes the browser report `languages` as the languages of the reader. */
function stubLanguages(languages: string[]) {
	vi.spyOn(Navigator.prototype, 'languages', 'get').mockReturnValue(languages)
}

afterEach(() => {
	localStorage.clear()
})

function LocaleProbe() {
	const config = useLocale()

	return (
		<>
			<span data-testid="locale">{config.locale ?? ''}</span>
			<span data-testid="currency">{config.currency ?? ''}</span>
			<span data-testid="numberFormat">{config.numberFormat?.style ?? ''}</span>
			<span data-testid="dateFormat">{config.dateFormat?.dateStyle ?? ''}</span>
			<span data-testid="timeZone">{config.timeZone ?? ''}</span>
		</>
	)
}

describe('LocaleProvider', () => {
	it('broadcasts the configured locale through useLocale()', () => {
		renderUI(
			<LocaleProvider
				locale="fr-FR"
				currency="EUR"
				numberFormat={{ style: 'percent' }}
				dateFormat={{ dateStyle: 'long' }}
			>
				<LocaleProbe />
			</LocaleProvider>,
		)

		expect(screen.getByTestId('locale')).toHaveTextContent('fr-FR')

		expect(screen.getByTestId('currency')).toHaveTextContent('EUR')

		expect(screen.getByTestId('numberFormat')).toHaveTextContent('percent')

		expect(screen.getByTestId('dateFormat')).toHaveTextContent('long')
	})

	it('folds a nested provider over the enclosing config rather than replacing it', () => {
		renderUI(
			<LocaleProvider locale="fr-FR" dateFormat={{ dateStyle: 'long' }} timeZone="Asia/Tokyo">
				<LocaleProvider currency="EUR">
					<LocaleProbe />
				</LocaleProvider>
			</LocaleProvider>,
		)

		expect(screen.getByTestId('currency')).toHaveTextContent('EUR')

		expect(screen.getByTestId('locale')).toHaveTextContent('fr-FR')

		expect(screen.getByTestId('dateFormat')).toHaveTextContent('long')

		expect(screen.getByTestId('timeZone')).toHaveTextContent('Asia/Tokyo')
	})

	it('falls back to an empty config when no provider wraps the consumer', () => {
		renderUI(<LocaleProbe />)

		expect(screen.getByTestId('locale')).toHaveTextContent('')

		expect(screen.getByTestId('currency')).toHaveTextContent('')
	})
})

describe('LocaleProvider with locales', () => {
	it('resolves System to the locale that matches the languages of the browser', () => {
		stubLanguages(['en-AU', 'en'])

		renderUI(
			<LocaleProvider locale="en-US" locales={LOCALES}>
				<LocaleProbe />
			</LocaleProvider>,
		)

		expect(screen.getByTestId('locale')).toHaveTextContent('en-AU')
	})

	it('resolves System to the default locale when no language of the browser matches', () => {
		stubLanguages(['fr-FR', 'de'])

		renderUI(
			<LocaleProvider locale="en-GB" locales={LOCALES}>
				<LocaleProbe />
			</LocaleProvider>,
		)

		expect(screen.getByTestId('locale')).toHaveTextContent('en-GB')
	})

	it('takes the stored locale, and ignores a stored value outside the locales', () => {
		stubLanguages(['en-CA'])

		localStorage.setItem('locale', 'en-GB')

		const { unmount } = renderUI(
			<LocaleProvider locale="en-US" locales={LOCALES}>
				<LocaleProbe />
			</LocaleProvider>,
		)

		expect(screen.getByTestId('locale')).toHaveTextContent('en-GB')

		unmount()

		// The first render wrote the stored choice to the cookie. Remove it, so the
		// second render reads the storage alone.
		clearCookies()

		localStorage.setItem('locale', 'fr-FR')

		renderUI(
			<LocaleProvider locale="en-US" locales={LOCALES}>
				<LocaleProbe />
			</LocaleProvider>,
		)

		expect(screen.getByTestId('locale')).toHaveTextContent('en-CA')
	})

	it('renders the server markup in the default locale', () => {
		localStorage.setItem('locale', 'en-GB')

		const markup = renderToString(
			<LocaleProvider locale="en-US" locales={LOCALES}>
				<LocaleProbe />
			</LocaleProvider>,
		)

		expect(markup).toContain('en-US')

		expect(markup).not.toContain('en-GB')
	})

	it('falls back to the first locale with no locale of its own', () => {
		stubLanguages(['fr-FR'])

		renderUI(
			<LocaleProvider locales={['en-CA', 'en-US']}>
				<LocaleProbe />
			</LocaleProvider>,
		)

		expect(screen.getByTestId('locale')).toHaveTextContent('en-CA')
	})

	it('follows a choice from another tab', () => {
		renderUI(
			<LocaleProvider locale="en-US" locales={LOCALES}>
				<LocaleProbe />
			</LocaleProvider>,
		)

		act(() => {
			localStorage.setItem('locale', 'en-AU')

			window.dispatchEvent(new StorageEvent('storage', { key: 'locale' }))
		})

		expect(screen.getByTestId('locale')).toHaveTextContent('en-AU')
	})

	it('gives the stored locale to a nested provider, and lets a nested locale win', () => {
		localStorage.setItem('locale', 'en-GB')

		renderUI(
			<LocaleProvider locale="en-US" locales={LOCALES}>
				<LocaleProvider currency="EUR">
					<LocaleProbe />
				</LocaleProvider>
				<LocaleProvider locale="fr-FR">
					<span data-testid="nested">
						<NestedLocale />
					</span>
				</LocaleProvider>
			</LocaleProvider>,
		)

		expect(screen.getByTestId('locale')).toHaveTextContent('en-GB')

		expect(screen.getByTestId('nested')).toHaveTextContent('fr-FR')
	})

	it('reads no stored locale without locales', () => {
		localStorage.setItem('locale', 'en-GB')

		renderUI(
			<LocaleProvider locale="fr-FR">
				<LocaleProbe />
			</LocaleProvider>,
		)

		expect(screen.getByTestId('locale')).toHaveTextContent('fr-FR')
	})
})

/** Writes the locale tag of the nearest provider. */
function NestedLocale() {
	return <>{useLocale().locale}</>
}

describe('matchLocale', () => {
	it('takes the first preferred language that a locale has', () => {
		expect(matchLocale(['fr-FR', 'en-AU', 'en-GB'], LOCALES)).toBe('en-AU')
	})

	it('prefers a tag of the same language that the reader also prefers', () => {
		expect(matchLocale(['en-NZ', 'en-GB'], LOCALES)).toBe('en-GB')
	})

	it('takes the first locale of the language when no tag matches', () => {
		expect(matchLocale(['en'], LOCALES)).toBe('en-US')

		expect(matchLocale(['en-NZ'], LOCALES)).toBe('en-US')
	})

	it('compares the tags without case', () => {
		expect(matchLocale(['EN-gb'], LOCALES)).toBe('en-GB')
	})

	it('returns undefined when no locale has a preferred language', () => {
		expect(matchLocale(['fr-FR', 'de'], LOCALES)).toBeUndefined()

		expect(matchLocale([], LOCALES)).toBeUndefined()
	})
})

/** A listbox with no value, which shows its placeholder. */
function EmptyListbox() {
	return (
		<Listbox aria-label="Fruit">
			<ListboxOption value="apple">Apple</ListboxOption>
		</Listbox>
	)
}

/** The trigger of the listbox, which shows the placeholder or the value. */
const fruit = () => screen.getByRole('combobox', { name: 'Fruit' })

describe('LocaleProvider messages', () => {
	it.each([
		['es-MX', 'Seleccionar'],
		['fr-FR', 'Select'],
	])('shows the messages of ui for %s in its language, else in English', (locale, text) => {
		renderUI(
			<LocaleProvider locale={locale}>
				<EmptyListbox />
			</LocaleProvider>,
		)

		expect(fruit()).toHaveTextContent(text)
	})

	it('shows the English defaults with no provider', () => {
		renderUI(<EmptyListbox />)

		expect(fruit()).toHaveTextContent('Select')
	})

	it('lets a nested locale set the language of its region', () => {
		renderUI(
			<LocaleProvider locale="es-ES">
				<LocaleProvider locale="en-US">
					<EmptyListbox />
				</LocaleProvider>
			</LocaleProvider>,
		)

		expect(fruit()).toHaveTextContent('Select')
	})

	it('words a count with the plural rules of the language', () => {
		renderUI(
			<LocaleProvider locale="es-ES">
				<Listbox aria-label="Fruit" multiple value={['a', 'b', 'c', 'd']}>
					{['a', 'b', 'c', 'd'].map((value) => (
						<ListboxOption key={value} value={value}>
							{value}
						</ListboxOption>
					))}
				</Listbox>
			</LocaleProvider>,
		)

		expect(fruit()).toHaveTextContent('4 seleccionados')
	})

	it('follows the stored locale to its language', () => {
		localStorage.setItem('locale', 'es-ES')

		renderUI(
			<LocaleProvider locale="en-US" locales={['en-US', 'es-ES']}>
				<EmptyListbox />
			</LocaleProvider>,
		)

		expect(fruit()).toHaveTextContent('Seleccionar')
	})
})

describe('locale cookie', () => {
	it('writes the choice to the cookie with the stored choice', () => {
		writeChoice(localeChoice(LOCALES), 'en-GB')

		expect(document.cookie).toContain('locale=en-GB')

		expect(localStorage.getItem('locale')).toBe('en-GB')

		writeChoice(localeChoice(LOCALES), 'system')

		expect(document.cookie).toContain('locale=system')
	})

	it('takes the cookie over another stored choice, as the server does', () => {
		localStorage.setItem('locale', 'en-GB')

		// biome-ignore lint/suspicious/noDocumentCookie: the test sets the cookie that a server reads.
		document.cookie = 'locale=en-AU; path=/'

		renderUI(
			<LocaleProvider locale="en-US" locales={LOCALES}>
				<LocaleProbe />
			</LocaleProvider>,
		)

		expect(screen.getByTestId('locale')).toHaveTextContent('en-AU')

		expect(document.cookie).toContain('locale=en-AU')
	})

	it('writes a choice stored before the cookie existed', () => {
		localStorage.setItem('locale', 'en-GB')

		renderUI(
			<LocaleProvider locale="en-US" locales={LOCALES}>
				<LocaleProbe />
			</LocaleProvider>,
		)

		expect(document.cookie).toContain('locale=en-GB')
	})

	it('takes the cookie when the storage holds no choice', () => {
		// biome-ignore lint/suspicious/noDocumentCookie: the test sets the cookie that a server reads.
		document.cookie = 'locale=en-AU; path=/'

		renderUI(
			<LocaleProvider locale="en-US" locales={LOCALES}>
				<LocaleProbe />
			</LocaleProvider>,
		)

		expect(screen.getByTestId('locale')).toHaveTextContent('en-AU')
	})

	it('writes no cookie for the System choice that the reader has not changed', () => {
		renderUI(
			<LocaleProvider locale="en-US" locales={LOCALES}>
				<LocaleProbe />
			</LocaleProvider>,
		)

		expect(document.cookie).not.toContain('locale=')
	})
})

describe('resolveRequestLocale', () => {
	const locales = ['en-US', 'en-GB', 'es-ES', 'es-MX'] as const

	it('takes a cookie that holds one of the locales', () => {
		expect(resolveRequestLocale({ cookie: 'es-MX', acceptLanguage: 'en-GB', locales })).toBe(
			'es-MX',
		)
	})

	it('matches the accepted languages for the System choice, in the order of their weight', () => {
		expect(
			resolveRequestLocale({
				cookie: 'system',
				acceptLanguage: 'fr-FR;q=0.9, es-ES;q=0.8, en-GB;q=0.95',
				locales,
			}),
		).toBe('en-GB')
	})

	it('reads an unknown cookie as the System choice', () => {
		expect(resolveRequestLocale({ cookie: 'de-DE', acceptLanguage: 'es', locales })).toBe('es-ES')
	})

	it('falls back to the first locale when no accepted language matches', () => {
		expect(resolveRequestLocale({ acceptLanguage: 'fr, *;q=0.1', locales })).toBe('en-US')

		expect(resolveRequestLocale({ acceptLanguage: null, locales })).toBe('en-US')
	})
})
