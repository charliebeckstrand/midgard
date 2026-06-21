import { describe, expect, it } from 'vitest'
import { HeadlessProvider, useHeadless } from '../../providers/headless'
import { renderUI, screen } from '../helpers'

function Probe() {
	return <span data-slot="probe">{String(useHeadless())}</span>
}

describe('HeadlessProvider', () => {
	it('useHeadless defaults to false outside a provider', () => {
		renderUI(<Probe />)

		expect(screen.getByText('false')).toBeInTheDocument()
	})

	it('sets the headless flag for descendants', () => {
		renderUI(
			<HeadlessProvider>
				<Probe />
			</HeadlessProvider>,
		)

		expect(screen.getByText('true')).toBeInTheDocument()
	})

	it('renders children without adding a host element', () => {
		const { container } = renderUI(
			<HeadlessProvider>
				<span data-slot="child" />
			</HeadlessProvider>,
		)

		const child = container.querySelector('[data-slot="child"]')

		expect(child?.parentElement).toBe(container)
	})
})
