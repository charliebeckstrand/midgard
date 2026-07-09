import { describe, expect, it } from 'vitest'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/card'
import { HeadingSkeleton } from '../../components/heading'
import { renderUI } from '../helpers'

/**
 * A loading title reserves the settled title's height. `HeadingSkeleton` is sized
 * to a heading's font-size, not its taller line-box, so a bare skeleton stands
 * shorter than the `CardTitle` it stands in for — swapping to the real title then
 * grows the header and shifts the body down. Rendering the skeleton *inside* a real
 * `CardTitle` (inline) lets the title's own line-box drive the header height, so it
 * matches whether the name has resolved or not. This pins that parity.
 */
function boardCard(title: React.ReactNode) {
	return (
		<Card outline className="w-[400px]">
			<CardHeader>
				<CardTitle className="min-w-0 flex-1">{title}</CardTitle>
			</CardHeader>
			<CardBody>body</CardBody>
		</Card>
	)
}

function headerHeight(container: HTMLElement): number {
	const el = container.querySelector('[data-slot="card-header"]')

	return el ? Math.round(el.getBoundingClientRect().height) : -1
}

describe('CardTitle skeleton height parity', () => {
	it('an inline HeadingSkeleton in a CardTitle keeps the header the settled height', () => {
		const settled = renderUI(boardCard('Shipments by Destination Region'))
		const loading = renderUI(
			boardCard(<HeadingSkeleton level={4} className="inline-block w-40 align-middle" />),
		)

		const settledHeader = headerHeight(settled.container)
		const loadingHeader = headerHeight(loading.container)

		expect(settledHeader).toBeGreaterThan(0)
		expect(loadingHeader).toBe(settledHeader)
	})
})
