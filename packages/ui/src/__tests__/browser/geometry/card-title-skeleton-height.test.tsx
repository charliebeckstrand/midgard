import { describe, expect, it } from 'vitest'
import {
	Card,
	CardBody,
	CardHeader,
	CardTitle,
	type CardTitleProps,
} from '../../../components/card'
import { HeadingSkeleton } from '../../../components/heading'
import { renderUI } from '../../helpers'

/**
 * A loading title keeps the height of the settled title. A block
 * `HeadingSkeleton` has the font size of a heading, not its taller line box, so
 * it is shorter than the `CardTitle` it stands in for. The swap to the real
 * title then grows the header and moves the body down. An `inline` skeleton
 * inside a real `CardTitle` lets the line box of the title set the height of the
 * header. These tests hold that parity at each title level.
 */
function boardCard(title: React.ReactNode, level?: CardTitleProps['level']) {
	return (
		<Card outline className="w-[400px]">
			<CardHeader>
				<CardTitle level={level} className="min-w-0 flex-1">
					{title}
				</CardTitle>
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
	it.each([undefined, 1, 2, 4, 6] as const)(
		'an inline HeadingSkeleton in a level %s CardTitle keeps the header the settled height',
		(level) => {
			const settled = renderUI(boardCard('Shipments by Destination Region', level))
			const loading = renderUI(boardCard(<HeadingSkeleton inline />, level))

			const settledHeader = headerHeight(settled.container)
			const loadingHeader = headerHeight(loading.container)

			expect(settledHeader).toBeGreaterThan(0)
			expect(loadingHeader).toBe(settledHeader)
		},
	)

	it('puts a span, not a div, inside the heading', () => {
		const { container } = renderUI(boardCard(<HeadingSkeleton inline />))

		const placeholder = container.querySelector(
			'[data-slot="card-title"] [data-slot="placeholder"]',
		)

		expect(placeholder?.tagName).toBe('SPAN')
	})
})
