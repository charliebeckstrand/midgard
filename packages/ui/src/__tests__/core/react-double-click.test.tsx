import { act } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { present } from '../helpers'

// The patch of `react-dom` (`pnpm-workspace.yaml`) puts the `dblclick`
// listeners of a root on the document on its root element. The root style of
// `core/touch/base.ts` then stops iOS from joining two quick taps into one
// double-click. Each test makes its own document, so no root of the suite
// shares it.

/** Sends an event of `type` that bubbles from `target`. */
function send(target: EventTarget, type: string) {
	target.dispatchEvent(new MouseEvent(type, { bubbles: true }))
}

/**
 * Runs `mount` while a spy records each listener that is added, and gives the
 * nodes that got a listener for `type`.
 */
async function listen<T>(mount: () => T) {
	const add = vi.spyOn(EventTarget.prototype, 'addEventListener')

	const result = await act(async () => mount())

	const calls = add.mock.calls.map(([type], index) => ({ type, target: add.mock.contexts[index] }))

	add.mockRestore()

	const targets = (type: string) =>
		calls.filter((call) => call.type === type).map((call) => call.target)

	return { result, targets }
}

describe('the patch of react-dom for dblclick', () => {
	it('puts the dblclick listeners of a root on the document on the root element', async () => {
		const doc = document.implementation.createHTMLDocument('')

		doc.documentElement.lang = 'en'

		doc.body.innerHTML = '<button type="button">Day</button>'

		const onClick = vi.fn()

		const onDoubleClick = vi.fn()

		const { result: root, targets } = await listen(() =>
			hydrateRoot(
				doc,
				<html lang="en">
					<head />
					<body>
						<button type="button" onClick={onClick} onDoubleClick={onDoubleClick}>
							Day
						</button>
					</body>
				</html>,
			),
		)

		// Each other event stays on the document.
		expect(targets('click')).toContain(doc)

		expect(targets('dblclick').length).toBeGreaterThan(0)

		expect(targets('dblclick').every((target) => target === doc.documentElement)).toBe(true)

		const button = present(doc.querySelector('button'), 'the button')

		send(button, 'click')

		send(button, 'dblclick')

		expect(onClick).toHaveBeenCalledOnce()

		expect(onDoubleClick).toHaveBeenCalledOnce()

		act(() => root.unmount())
	})

	it('keeps the dblclick listeners of a root on an element on that element', async () => {
		const container = document.createElement('div')

		document.body.append(container)

		const onDoubleClick = vi.fn()

		const { result: root, targets } = await listen(() => {
			const root = createRoot(container)

			root.render(
				<button type="button" onDoubleClick={onDoubleClick}>
					Day
				</button>,
			)

			return root
		})

		expect(targets('dblclick').length).toBeGreaterThan(0)

		expect(targets('dblclick').every((target) => target === container)).toBe(true)

		send(present(container.querySelector('button'), 'the button'), 'dblclick')

		expect(onDoubleClick).toHaveBeenCalledOnce()

		act(() => root.unmount())

		container.remove()
	})
})
