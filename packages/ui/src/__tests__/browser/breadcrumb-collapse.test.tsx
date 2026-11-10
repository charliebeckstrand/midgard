import { Fragment } from 'react'
import { createRoot, hydrateRoot, type Root } from 'react-dom/client'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '../../components/breadcrumb'
import { act, attach, frames, present } from '../helpers'
import { serverMarkup } from '../helpers/hydrate'

const CRUMBS = ['Places', 'United States of America', 'Oregon']

/** A collapsing trail of `crumbs` in a box `width` pixels wide. */
function trail(width: number, crumbs: readonly string[] = CRUMBS) {
	return (
		<div data-testid="box" style={{ width }}>
			<Breadcrumb collapse>
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
			</Breadcrumb>
		</div>
	)
}

/** What each crumb draws: its label, or `…` where the label is closed to nothing. */
function drawn(container: HTMLElement) {
	return Array.from(
		container.querySelectorAll<HTMLElement>('[data-slot=breadcrumb-label]'),
		(label) => (label.clientWidth === 0 ? '…' : label.textContent),
	)
}

/** How opaque the list of the trail in `container` is. */
function opacity(container: HTMLElement) {
	const list = present(container.querySelector('[data-slot=breadcrumb-list]'), 'list')

	return getComputedStyle(list).opacity
}

/** The `<nav>` of the trail in `container`. */
function nav(container: HTMLElement) {
	return present(container.querySelector<HTMLElement>('[data-slot=breadcrumb]'), 'nav')
}

describe('a collapsing breadcrumb (real browser)', () => {
	it('keeps a server trail of more than one crumb transparent, and fades it in at the fit', async ({
		signal,
	}) => {
		const container = attach(serverMarkup(trail(340)))

		// The server cannot know the room of the row. The row keeps its size, and
		// the crumbs are transparent.
		await frames()

		signal.throwIfAborted()

		expect(opacity(container)).toBe('0')

		const height = nav(container).getBoundingClientRect().height

		expect(height).toBeGreaterThan(0)

		expect(container.querySelector('script')).toBeNull()

		const error = vi.spyOn(console, 'error')

		let root: Root | undefined

		act(() => {
			root = hydrateRoot(container, trail(340))
		})

		onTestFinished(() => act(() => root?.unmount()))

		expect(error).not.toHaveBeenCalled()

		// The layout effect of the hydration measures the fit before the next
		// frame. The row has room for one more crumb, and does not change its size.
		expect(drawn(container)).toEqual(['…', 'United States of America', 'Oregon'])

		expect(nav(container).getBoundingClientRect().height).toBe(height)

		await expect.poll(() => opacity(container)).toBe('1')
	})

	it('shows a server trail of one crumb, which has no fit', async ({ signal }) => {
		const container = attach(serverMarkup(trail(340, ['Oregon'])))

		await frames()

		signal.throwIfAborted()

		expect(opacity(container)).toBe('1')

		expect(drawn(container)).toEqual(['Oregon'])
	})

	it('gives way from the left as the row narrows, and comes back as it grows', async () => {
		const container = attach(document.createElement('div'))

		const root = createRoot(container)

		act(() => root.render(trail(800)))

		onTestFinished(() => act(() => root.unmount()))

		const box = present(container.querySelector<HTMLElement>('[data-testid=box]'), 'box')

		// The width reaches the trail through a resize observer, and React renders
		// the collapse in a task after that frame. No count of frames waits for
		// that task, so each read polls.
		const resize = (width: number) => {
			box.style.width = `${width}px`
		}

		await expect.poll(() => drawn(container)).toEqual(CRUMBS)

		resize(340)

		await expect.poll(() => drawn(container)).toEqual(['…', 'United States of America', 'Oregon'])

		resize(160)

		await expect.poll(() => drawn(container)).toEqual(['…', '…', 'Oregon'])

		resize(800)

		await expect.poll(() => drawn(container)).toEqual(CRUMBS)
	})
})
