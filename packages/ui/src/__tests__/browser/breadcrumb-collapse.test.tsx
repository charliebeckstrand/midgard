import { Fragment } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, onTestFinished } from 'vitest'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '../../components/breadcrumb'
import { act, attach, frames, present } from '../helpers'
import { hydrate, serverMarkup } from '../helpers/hydrate'

const CRUMBS = ['Places', 'United States of America', 'Oregon', 'Portland']

/** The list of a collapsing trail of `crumbs`. */
function crumbList(crumbs: readonly string[]) {
	return (
		<BreadcrumbList>
			{crumbs.map((crumb, index) => (
				<Fragment key={crumb}>
					{index > 0 && <BreadcrumbSeparator />}
					<BreadcrumbItem>
						<BreadcrumbLink href={`/${crumb}`} current={index === crumbs.length - 1}>
							{crumb}
						</BreadcrumbLink>
					</BreadcrumbItem>
				</Fragment>
			))}
		</BreadcrumbList>
	)
}

/** A collapsing trail of `crumbs` in a box `width` pixels wide, with `after` on the line after the trail. */
function trail(width: number, crumbs: readonly string[] = CRUMBS, after?: string) {
	return (
		<div data-testid="box" style={{ width }}>
			<Breadcrumb collapse>
				{crumbList(crumbs)}

				{after ? <button type="button">{after}</button> : null}
			</Breadcrumb>
		</div>
	)
}

/** The list of the trail in `container`. */
function list(container: HTMLElement) {
	return present(container.querySelector<HTMLElement>('[data-slot=breadcrumb-list]'), 'list')
}

/** Whether `element` paints inside the clip of the list, on the line of the trail. */
function onLine(container: HTMLElement, element: Element) {
	const box = list(container).getBoundingClientRect()

	const rect = element.getBoundingClientRect()

	return rect.top >= box.top && rect.bottom <= box.bottom
}

/**
 * What the line of the trail draws: `…` when a crumb gave way, then the label of
 * each crumb on the line.
 */
function drawn(container: HTMLElement) {
	const labels = Array.from(container.querySelectorAll('[data-slot=breadcrumb-label]'))

	const shown = labels.filter((label) => onLine(container, label))

	const mark = container.querySelector('[data-slot=breadcrumb-mark]')

	return [
		...(mark && onLine(container, mark) ? ['…'] : []),
		...shown.map((label) => label.textContent),
	]
}

/** The box of each label and mark on the line, to compare two paints. */
function boxes(container: HTMLElement) {
	return Array.from(
		container.querySelectorAll('[data-slot=breadcrumb-label], [data-slot=breadcrumb-mark]'),
		(element) => {
			const { x, y, width, height } = element.getBoundingClientRect()

			return [x, y, width, height]
		},
	)
}

describe('a collapsing breadcrumb (real browser)', () => {
	it('paints the fit from the server, and hydration does not change it', async ({ signal }) => {
		const container = attach(serverMarkup(trail(360)))

		await frames()

		signal.throwIfAborted()

		expect(container.querySelector('script')).toBeNull()

		expect(drawn(container)).toEqual(['…', 'Oregon', 'Portland'])

		const before = boxes(container)

		const { onRecoverableError, consoleError } = hydrate(container, trail(360))

		await frames()

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		expect(boxes(container)).toEqual(before)
	})

	it('shows a trail of one crumb whole, with no mark', () => {
		const container = attach(serverMarkup(trail(400, ['Oregon'])))

		expect(drawn(container)).toEqual(['Oregon'])

		const label = present(
			container.querySelector<HTMLElement>('[data-slot=breadcrumb-label]'),
			'label',
		)

		// The row has room, so the crumb shows its whole label.
		expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth)

		expect(list(container).getBoundingClientRect().left).toBe(
			present(
				container.querySelector('[data-slot=breadcrumb-label]'),
				'label',
			).getBoundingClientRect().left,
		)
	})

	it('gives way from the left as the row narrows, and comes back as it grows', () => {
		const container = attach(document.createElement('div'))

		const root = createRoot(container)

		act(() => root.render(trail(800)))

		onTestFinished(() => act(() => root.unmount()))

		const box = present(container.querySelector<HTMLElement>('[data-testid=box]'), 'box')

		// CSS makes the fit, so the layout that follows each width has it.
		const at = (width: number) => {
			box.style.width = `${width}px`

			return drawn(container)
		}

		expect(at(800)).toEqual(CRUMBS)

		expect(at(360)).toEqual(['…', 'Oregon', 'Portland'])

		expect(at(150)).toEqual(['…', 'Portland'])

		expect(at(800)).toEqual(CRUMBS)
	})

	it('clips the current page only after every crumb above it has gone', () => {
		const container = attach(serverMarkup(trail(90)))

		expect(drawn(container)).toEqual(['…', 'Portland'])

		const label = present(
			Array.from(container.querySelectorAll<HTMLElement>('[data-slot=breadcrumb-label]')).at(-1),
			'current page',
		)

		expect(label.scrollWidth).toBeGreaterThan(label.clientWidth)

		expect(list(container).getBoundingClientRect().right).toBeLessThanOrEqual(
			present(container.querySelector('[data-testid=box]'), 'box').getBoundingClientRect().right,
		)
	})

	it('keeps what follows the trail on the line, and gives way before it', () => {
		const after = 'Share this place with a friend'

		const container = attach(serverMarkup(trail(360, CRUMBS, after)))

		// Without the action, this row holds `…`, Oregon, and Portland.
		expect(drawn(container)).toEqual(['…', 'Portland'])

		const button = present(container.querySelector('button'), 'button')

		const box = present(container.querySelector('[data-testid=box]'), 'box')

		expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(
			box.getBoundingClientRect().right,
		)

		expect(button.getBoundingClientRect().top).toBeLessThan(
			list(container).getBoundingClientRect().bottom,
		)
	})

	it('gives way in a box that holds the list and what follows it', () => {
		const container = attach(
			serverMarkup(
				<div data-testid="box" style={{ width: 360 }}>
					<Breadcrumb collapse>
						<div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
							{crumbList(CRUMBS)}

							<span style={{ flexShrink: 0 }}>Badge</span>
						</div>
					</Breadcrumb>
				</div>,
			),
		)

		const shown = drawn(container)

		expect(shown[0]).toBe('…')

		expect(shown.at(-1)).toBe('Portland')

		const right = present(
			container.querySelector('[data-testid=box]'),
			'box',
		).getBoundingClientRect().right

		expect(list(container).getBoundingClientRect().right).toBeLessThanOrEqual(right)

		expect(
			present(container.querySelector('span:not([data-slot])'), 'badge').getBoundingClientRect()
				.right,
		).toBeLessThanOrEqual(right)
	})

	it('keeps the current page on the line in a trail past the places of the order rule', () => {
		const crumbs = Array.from({ length: 20 }, (_, index) => `Crumb ${index + 1}`)

		const container = attach(serverMarkup(trail(360, crumbs)))

		const shown = drawn(container)

		expect(shown[0]).toBe('…')

		expect(shown.at(-1)).toBe('Crumb 20')

		expect(shown).not.toContain('Crumb 1')
	})

	it('sends the pointer on the mark to the nearest crumb that gave way', () => {
		const container = attach(serverMarkup(trail(360)))

		const mark = present(container.querySelector('[data-slot=breadcrumb-mark]'), 'mark')

		const { left, top, width, height } = mark.getBoundingClientRect()

		const hit = document.elementFromPoint(left + width / 2, top + height / 2)

		expect(hit?.closest('a')?.getAttribute('href')).toBe('/United States of America')
	})

	it('draws the focus ring of a crumb that gave way on the mark', async () => {
		const container = attach(document.createElement('div'))

		const root = createRoot(container)

		act(() => root.render(trail(360)))

		onTestFinished(() => act(() => root.unmount()))

		const link = present(
			container.querySelector<HTMLElement>('a[href="/United States of America"]'),
			'link',
		)

		const mark = present(link.querySelector<HTMLElement>('[data-slot=breadcrumb-mark]'), 'mark')

		const { userEvent } = await import('vitest/browser')

		// Tab from the line before the trail, so the focus is a keyboard focus.
		const start = document.createElement('button')

		container.prepend(start)

		start.focus()

		await userEvent.tab()

		await userEvent.tab()

		expect(document.activeElement).toBe(link)

		expect(onLine(container, mark)).toBe(true)

		expect(getComputedStyle(mark).outlineStyle).not.toBe('none')

		expect(getComputedStyle(mark).color).not.toBe('rgba(0, 0, 0, 0)')
	})
})
