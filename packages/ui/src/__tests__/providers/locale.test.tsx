import { describe, expect, it } from 'vitest'
import { LocaleProvider, useLocale } from '../../providers/locale'
import { renderUI, screen } from '../helpers'

function LocaleProbe() {
	const config = useLocale()

	return (
		<>
			<span data-testid="locale">{config.locale ?? ''}</span>
			<span data-testid="currency">{config.currency ?? ''}</span>
			<span data-testid="timeZone">{config.timeZone ?? ''}</span>
			<span data-testid="numberFormat">{config.numberFormat?.style ?? ''}</span>
			<span data-testid="dateFormat">{config.dateFormat?.dateStyle ?? ''}</span>
		</>
	)
}

describe('LocaleProvider', () => {
	it('broadcasts the configured locale through useLocale()', () => {
		renderUI(
			<LocaleProvider
				locale="fr-FR"
				currency="EUR"
				timeZone="Europe/Paris"
				numberFormat={{ style: 'percent' }}
				dateFormat={{ dateStyle: 'long' }}
			>
				<LocaleProbe />
			</LocaleProvider>,
		)

		expect(screen.getByTestId('locale')).toHaveTextContent('fr-FR')

		expect(screen.getByTestId('currency')).toHaveTextContent('EUR')

		expect(screen.getByTestId('timeZone')).toHaveTextContent('Europe/Paris')

		expect(screen.getByTestId('numberFormat')).toHaveTextContent('percent')

		expect(screen.getByTestId('dateFormat')).toHaveTextContent('long')
	})

	it('falls back to an empty config when no provider wraps the consumer', () => {
		renderUI(<LocaleProbe />)

		expect(screen.getByTestId('locale')).toHaveTextContent('')

		expect(screen.getByTestId('currency')).toHaveTextContent('')
	})
})
