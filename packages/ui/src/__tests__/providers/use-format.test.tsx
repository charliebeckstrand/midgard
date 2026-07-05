import { describe, expect, it } from 'vitest'
import { type FormatSpec, LocaleProvider, useFormat } from '../../providers/locale'
import { renderUI, screen } from '../helpers'

// `.textContent` is compared exactly rather than through `toHaveTextContent`,
// which normalizes the narrow no-break space `Intl` puts before a currency
// symbol in locales like de-DE and would then mismatch the raw glyph.
function FormatProbe({ spec, value }: { spec: FormatSpec; value: number }) {
	const format = useFormat(spec)

	return <span data-testid="out">{format(value)}</span>
}

describe('useFormat', () => {
	it('folds in the ambient locale and currency', () => {
		renderUI(
			<LocaleProvider locale="de-DE" currency="EUR">
				<FormatProbe spec={{ type: 'currency' }} value={1234.5} />
			</LocaleProvider>,
		)

		expect(screen.getByTestId('out').textContent).toBe(
			new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(1234.5),
		)
	})

	it('defaults currency to USD outside a provider', () => {
		renderUI(<FormatProbe spec={{ type: 'currency' }} value={1234.5} />)

		expect(screen.getByTestId('out').textContent).toBe(
			new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(1234.5),
		)
	})

	it('layers a spec over the ambient number-format defaults', () => {
		renderUI(
			<LocaleProvider numberFormat={{ minimumFractionDigits: 2 }}>
				<FormatProbe spec={{ type: 'number' }} value={3} />
			</LocaleProvider>,
		)

		expect(screen.getByTestId('out').textContent).toBe(
			new Intl.NumberFormat(undefined, { minimumFractionDigits: 2 }).format(3),
		)
	})

	it('composes a prefixed id', () => {
		renderUI(<FormatProbe spec={{ type: 'id', prefix: 'INV', pad: 4 }} value={42} />)

		expect(screen.getByTestId('out').textContent).toBe('INV-0042')
	})
})
