import { describe, expect, it } from 'vitest'
import { Headless, useHeadless } from '../../components/headless'
import { renderUI, screen } from '../helpers'

function Probe() {
	return <span data-slot="probe">{String(useHeadless())}</span>
}

describe('Headless', () => {
	it('useHeadless defaults to false outside a provider', () => {
		renderUI(<Probe />)

		expect(screen.getByText('false')).toBeInTheDocument()
	})

	it('sets the headless flag for descendants', () => {
		renderUI(
			<Headless>
				<Probe />
			</Headless>,
		)

		expect(screen.getByText('true')).toBeInTheDocument()
	})

	it('renders children without adding a host element', () => {
		const { container } = renderUI(
			<Headless>
				<span data-slot="child" />
			</Headless>,
		)

		const child = container.querySelector('[data-slot="child"]')

		expect(child?.parentElement).toBe(container)
	})
})
