import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider, useLocale } from '../../providers/locale'
import { matchLocale } from '../../providers/locale/locale-choice'
import { act, renderUI, screen } from '../helpers'

// The English locales of the apps, with the default first.
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
