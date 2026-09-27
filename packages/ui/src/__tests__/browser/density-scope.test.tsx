import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { Badge } from '../../components/badge'
import { Card } from '../../components/card'
import { Table, TableBody, TableCell, TableRow } from '../../components/table'
import { DensityProvider } from '../../providers/density'
import { present, renderUI } from '../helpers'

/**
 * A static leaf with no `size` follows the nearest density scope.
 *
 * Badge, Card, and Table read no context. Their `density-*` rows select the step in CSS from the
 * nearest `data-density` ancestor (packages/ui/tailwind.css). The innermost scope must win at
 * every depth, and an explicit `size` must pin the step.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
const BADGE_FONT_PX = { sm: 14, md: 16, lg: 18 } as const

const CARD_PADDING_PX = { sm: 8, md: 12, lg: 16 } as const

const CELL_PADDING_PX = { sm: 4, md: 8, lg: 12 } as const

const badgeFont = (container: HTMLElement, text: string) => {
	const badge = present(
		[...container.querySelectorAll<HTMLElement>('[data-slot="badge"]')].find(
			(node) => node.textContent === text,
		),
		`badge ${text}`,
	)

	return Number.parseFloat(getComputedStyle(badge).fontSize)
}

describe('density scopes on static leaves (real browser)', () => {
	it.each<[string, () => ReactElement, keyof typeof BADGE_FONT_PX]>([
		['takes md outside a scope', () => <Badge>x</Badge>, 'md'],
		[
			'follows a compact provider',
			() => (
				<DensityProvider density="compact">
					<Badge>x</Badge>
				</DensityProvider>
			),
			'sm',
		],
		[
			'follows a sized card inside a compact provider',
			() => (
				<DensityProvider density="compact">
					<Card size="lg">
						<Badge>x</Badge>
					</Card>
				</DensityProvider>
			),
			'lg',
		],
		[
			'follows an md card that resets a compact provider',
			() => (
				<DensityProvider density="compact">
					<Card size="md">
						<Badge>x</Badge>
					</Card>
				</DensityProvider>
			),
			'md',
		],
		[
			'follows the innermost of three scopes',
			() => (
				<DensityProvider density="compact">
					<Card size="lg">
						<Card size="sm">
							<Badge>x</Badge>
						</Card>
					</Card>
				</DensityProvider>
			),
			'sm',
		],
		[
			'keeps an explicit size inside a scope',
			() => (
				<DensityProvider density="compact">
					<Badge size="lg">x</Badge>
				</DensityProvider>
			),
			'lg',
		],
	])('a badge %s', (_name, ui, step) => {
		const { container } = renderUI(ui())

		expect(badgeFont(container, 'x')).toBe(BADGE_FONT_PX[step])
	})

	it('pads an unsized card at the step of the outer card', () => {
		const { container } = renderUI(
			<DensityProvider density="loose">
				<Card size="sm">
					<Card>inner</Card>
				</Card>
			</DensityProvider>,
		)

		const inner = present(
			container.querySelectorAll<HTMLElement>('[data-slot="card"]')[1],
			'inner card',
		)

		expect(Number.parseFloat(getComputedStyle(inner).paddingTop)).toBe(CARD_PADDING_PX.sm)
	})

	it.each(['compact', 'snug', 'loose'] as const)(
		'pads the cells of a table with no density prop under a %s provider',
		(density) => {
			const step = ({ compact: 'sm', snug: 'md', loose: 'lg' } as const)[density]

			const { container } = renderUI(
				<DensityProvider density={density}>
					<Table>
						<TableBody>
							<TableRow>
								<TableCell>cell</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</DensityProvider>,
			)

			const cell = present(container.querySelector<HTMLElement>('td'), 'cell')

			expect(Number.parseFloat(getComputedStyle(cell).paddingLeft)).toBe(CELL_PADDING_PX[step])
		},
	)
})
