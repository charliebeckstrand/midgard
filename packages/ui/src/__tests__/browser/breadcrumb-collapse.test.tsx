import { Fragment } from 'react'
import { createRoot, hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '../../components/breadcrumb'
import { act, attach, present } from '../helpers'

const CRUMBS = ['Places', 'United States of America', 'Oregon']

/** A collapsing trail in a box `width` pixels wide. */
function trail(width: number) {
	return (
		<div data-testid="box" style={{ width }}>
			<Breadcrumb collapse>
				<BreadcrumbList>
					{CRUMBS.map((crumb, index) => (
						<Fragment key={crumb}>
							{index > 0 && <BreadcrumbSeparator />}
							<BreadcrumbItem>
								<BreadcrumbLink href={`/${crumb}`} current={index === CRUMBS.length - 1}>
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

/** Waits for two frames, so a `ResizeObserver` report and its layout have run. */
function frames() {
	return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
}

/**
 * Puts the server markup of a narrow trail in the page and runs its pre-paint
 * step, as a browser does while it parses the page.
 */
async function paintServerMarkup() {
	const container = attach(document.createElement('div'))

	container.innerHTML = renderToString(trail(260))

	// A script set through `innerHTML` does not run. A copy in its place does, and
	// it finds the `<nav>` just before it as the parser would.
	const inert = present(container.querySelector('script'), 'script')

	const script = document.createElement('script')

	script.textContent = inert.textContent

	inert.replaceWith(script)

	await frames()

	return container
}

describe('a collapsing breadcrumb (real browser)', () => {
	it('settles the server markup before the first paint, and hydrates it unchanged', async ({
		signal,
	}) => {
		const container = await paintServerMarkup()

		signal.throwIfAborted()

		expect(drawn(container)).toEqual(['…', '…', 'Oregon'])

		expect(document.head.querySelector('style[data-breadcrumb-fit]')).not.toBeNull()

		const error = vi.spyOn(console, 'error')

		onTestFinished(() => error.mockRestore())

		let root: Root | undefined

		act(() => {
			root = hydrateRoot(container, trail(260))
		})

		onTestFinished(() => act(() => root?.unmount()))

		expect(error).not.toHaveBeenCalled()

		// React's own rule holds the fit, and the rule of the pre-paint step is gone.
		expect(drawn(container)).toEqual(['…', '…', 'Oregon'])

		expect(document.head.querySelector('style[data-breadcrumb-fit]')).toBeNull()

		expect(container.querySelector('script')).toBeNull()
	})

	it('gives way from the left as the row narrows, and comes back as it grows', async () => {
		const container = attach(document.createElement('div'))

		const root = createRoot(container)

		act(() => root.render(trail(800)))

		onTestFinished(() => act(() => root.unmount()))

		const box = present(container.querySelector<HTMLElement>('[data-testid=box]'), 'box')

		const resize = async (width: number) => {
			box.style.width = `${width}px`

			await frames()
		}

		await frames()

		expect(drawn(container)).toEqual(CRUMBS)

		await resize(340)

		expect(drawn(container)).toEqual(['…', 'United States of America', 'Oregon'])

		await resize(160)

		expect(drawn(container)).toEqual(['…', '…', 'Oregon'])

		await resize(800)

		expect(drawn(container)).toEqual(CRUMBS)
	})
})
