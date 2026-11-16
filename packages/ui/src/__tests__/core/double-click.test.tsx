import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { moveDoubleClickToRoot } from '../../core/touch/double-click'
import { present } from '../helpers'

// Each test makes its own document. The suite shares one document between the
// files, and the helper replaces methods of the document that it gets.

/** A new document whose `dblclick` listeners go on its root element. */
function makeDocument(): Document {
	const doc = document.implementation.createHTMLDocument('')

	moveDoubleClickToRoot(doc)

	return doc
}

/** Sends an event of `type` that bubbles from `target`. */
function send(target: EventTarget, type: string) {
	target.dispatchEvent(new MouseEvent(type, { bubbles: true }))
}

describe('moveDoubleClickToRoot', () => {
	it('puts a dblclick listener of the document on the root element', () => {
		const doc = makeDocument()

		const listener = vi.fn()

		doc.addEventListener('dblclick', listener)

		// An event sent to the document itself does not reach the root element.
		send(doc, 'dblclick')

		expect(listener).not.toHaveBeenCalled()

		send(doc.body, 'dblclick')

		expect(listener).toHaveBeenCalledOnce()

		expect(listener.mock.contexts[0]).toBe(doc.documentElement)
	})

	it('removes a dblclick listener from the root element', () => {
		const doc = makeDocument()

		const listener = vi.fn()

		doc.addEventListener('dblclick', listener, true)

		doc.removeEventListener('dblclick', listener, true)

		send(doc.body, 'dblclick')

		expect(listener).not.toHaveBeenCalled()
	})

	it('keeps each other event type on the document', () => {
		const doc = makeDocument()

		const listener = vi.fn()

		doc.addEventListener('click', listener)

		send(doc, 'click')

		expect(listener).toHaveBeenCalledOnce()

		expect(listener.mock.contexts[0]).toBe(doc)
	})

	it('moves each listener one time when it runs two times for one document', () => {
		const doc = makeDocument()

		moveDoubleClickToRoot(doc)

		const listener = vi.fn()

		doc.addEventListener('dblclick', listener)

		send(doc.body, 'dblclick')

		expect(listener).toHaveBeenCalledOnce()
	})

	it('keeps the double-click handlers of a React root on the document', async () => {
		// The spy goes first, so the replaced method of the document calls it.
		const add = vi.spyOn(EventTarget.prototype, 'addEventListener')

		const doc = makeDocument()

		doc.documentElement.lang = 'en'

		doc.body.innerHTML = '<button type="button">Day</button>'

		const onDoubleClick = vi.fn()

		const onClick = vi.fn()

		const root = await act(async () =>
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

		const targets = (type: string) =>
			add.mock.calls.flatMap(([name], index) => (name === type ? [add.mock.contexts[index]] : []))

		const clicks = targets('click')

		const doubleClicks = targets('dblclick')

		add.mockRestore()

		// React puts its listeners on the container of the root, the document.
		// Its `dblclick` listeners go on the root element instead.
		expect(clicks).toContain(doc)

		expect(doubleClicks.length).toBeGreaterThan(0)

		expect(doubleClicks.every((target) => target === doc.documentElement)).toBe(true)

		const button = present(doc.querySelector('button'), 'the button')

		send(button, 'click')

		send(button, 'dblclick')

		expect(onClick).toHaveBeenCalledOnce()

		expect(onDoubleClick).toHaveBeenCalledOnce()

		act(() => root.unmount())
	})
})
