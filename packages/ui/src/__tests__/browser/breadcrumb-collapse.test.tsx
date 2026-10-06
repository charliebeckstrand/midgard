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

/** The style sheet of the pre-paint step in the head, if any. */
function fitStyle() {
	return document.head.querySelector('style[data-breadcrumb-fit]')
}

/**
 * Puts the server markup of a narrow trail into `parent` and runs its pre-paint
 * step, as a browser does while it parses the page.
 */
function parseServerMarkup(parent: HTMLElement) {
	parent.innerHTML = renderToString(trail(260))

	onTestFinished(() => fitStyle()?.remove())

	// A script set through `innerHTML` does not run. A copy in its place does, and
	// it finds the `<nav>` just before it as the parser would.
	const inert = present(parent.querySelector('script'), 'script')

	const script = document.createElement('script')

	script.textContent = inert.textContent

	inert.replaceWith(script)
}

describe('a collapsing breadcrumb (real browser)', () => {
	it('settles the server markup before the first paint, and hydrates it unchanged', async ({
		signal,
	}) => {
		const container = attach(document.createElement('div'))

		parseServerMarkup(container)

		// The style sheet is in the head before any frame. In WebKit, a new style
		// sheet inside the first frame removes the effect of the scroll-driven
		// animations in that paint.
		const style = present(fitStyle(), 'style')

		await frames()

		signal.throwIfAborted()

		expect(drawn(container)).toEqual(['…', '…', 'Oregon'])

		// The frame set the answer on the same style, and added no style sheet.
		expect(fitStyle()).toBe(style)

		expect(style.getAttribute('data-collapsed')).toBe('2')

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

		expect(fitStyle()).toBeNull()

		expect(container.querySelector('script')).toBeNull()
	})

	it('settles a streamed trail when React reveals it, with the style sheet from the parse', async ({
		signal,
	}) => {
		const container = attach(document.createElement('div'))

		// A Suspense boundary streams its content in a hidden segment.
		const segment = attach(document.createElement('div'))

		segment.hidden = true

		parseServerMarkup(segment)

		const style = present(fitStyle(), 'style')

		await frames()

		signal.throwIfAborted()

		expect(style.hasAttribute('data-collapsed')).toBe(false)

		// React moves the content of the segment into the page.
		container.append(...segment.childNodes)

		await frames()

		signal.throwIfAborted()

		expect(drawn(container)).toEqual(['…', '…', 'Oregon'])

		expect(fitStyle()).toBe(style)
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
