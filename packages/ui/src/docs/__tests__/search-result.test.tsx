import { render, screen } from '@testing-library/react'
import { useIntl } from 'ui/primitives/intl'
import { describe, expect, it } from 'vitest'
import type { SearchEntry } from '../search/types.ts'
import { localizeEntry } from '../search/ui/localize.ts'
import { ResultLabel, ResultSubtitle } from '../search/ui/search-result.tsx'

// Each row of the results shows the name of its entry. Below the name, a page
// or a tab shows its section, and the API reference of a component shows
// "API reference".

function Row({ entry }: { entry: SearchEntry }) {
	const option = localizeEntry(useIntl(), entry)

	return (
		<>
			<p data-testid="label">
				<ResultLabel option={option} />
			</p>
			<p data-testid="subtitle">
				<ResultSubtitle option={option} />
			</p>
		</>
	)
}

describe('a row of the results', () => {
	it('names the page of a tab in the label, and shows the section below it', () => {
		render(
			<Row
				entry={{ kind: 'tab', label: 'Sorting', href: '/modules/grid/sorting', context: 'Grid' }}
			/>,
		)

		expect(screen.getByTestId('label').textContent).toBe('Grid › Sorting')

		expect(screen.getByTestId('subtitle').textContent).toBe('Tab, Modules')
	})

	it('shows "API reference" below the API reference of a component', () => {
		render(
			<Row
				entry={{
					kind: 'component',
					label: '<Field />',
					href: '/fieldset#api-Field',
					context: 'Fieldset',
				}}
			/>,
		)

		expect(screen.getByTestId('label').textContent).toBe('<Field />')

		expect(screen.getByTestId('subtitle').textContent).toBe('API reference')
	})
})
