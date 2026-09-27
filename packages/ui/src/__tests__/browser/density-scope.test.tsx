import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { Badge, BadgeSkeleton } from '../../components/badge'
import { Card, CardHeader } from '../../components/card'
import { Placeholder } from '../../components/placeholder'
import { Table, TableBody, TableCell, TableRow } from '../../components/table'
import { DensityProvider } from '../../providers/density'
import { present, renderUI } from '../helpers'

/**
 * A static leaf with no `size` follows the nearest density scope.
 *
 * Badge, Card, and Table read no context. Their `density-*` classes select the step in CSS from
 * the nearest `data-density` scope (packages/ui/tailwind.css). The innermost scope must win at
 * every depth. An explicit `size` makes the leaf its own scope, and a consumer `className` must
 * win over each step.
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

	it.each([
		['compact', 'sm'],
		['snug', 'md'],
		['loose', 'lg'],
	] as const)('pads the cells of a table with no size under a %s provider', (density, step) => {
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
	})
	it('pads the header of an unsized card at the step of the outer card', () => {
		const { container } = renderUI(
			<Card size="lg">
				<Card>
					<CardHeader>header</CardHeader>
				</Card>
			</Card>,
		)

		const header = present(
			container.querySelector<HTMLElement>('[data-slot="card-header"]'),
			'card header',
		)

		expect(Number.parseFloat(getComputedStyle(header).paddingBottom)).toBe(CARD_PADDING_PX.lg)
	})

	it('lets a consumer className win over each step, inside a scope and on a pinned leaf', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Badge className="text-2xl">in scope</Badge>
				<Badge size="lg" className="text-2xl">
					pinned
				</Badge>
			</DensityProvider>,
		)

		expect(badgeFont(container, 'in scope')).toBe(24)

		expect(badgeFont(container, 'pinned')).toBe(24)
	})

	it.each([
		['takes the step of the scope', undefined, 26],
		['keeps an explicit size', 'lg', 34],
	] as const)('a badge skeleton %s', (_name, size, height) => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<BadgeSkeleton size={size} />
			</DensityProvider>,
		)

		const skeleton = present(
			container.querySelector<HTMLElement>('[data-slot="placeholder"]'),
			'badge skeleton',
		)

		expect(Number.parseFloat(getComputedStyle(skeleton).height)).toBe(height)
	})

	it('pads the cells of a table at its size inside another scope', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Table size="lg">
					<TableBody>
						<TableRow>
							<TableCell>cell</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</DensityProvider>,
		)

		const cell = present(container.querySelector<HTMLElement>('td'), 'cell')

		expect(Number.parseFloat(getComputedStyle(cell).paddingLeft)).toBe(CELL_PADDING_PX.lg)
	})
	it('keeps the Placeholder default height below a step and a plain class', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Placeholder />
				<Placeholder className="h-8" />
			</DensityProvider>,
		)

		const heights = Array.from(
			container.querySelectorAll<HTMLElement>('[data-slot="placeholder"]'),
			(node) => Number.parseFloat(getComputedStyle(node).height),
		)

		expect(heights).toEqual([16, 32])
	})
})
