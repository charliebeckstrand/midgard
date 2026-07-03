import { Profiler } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CurrentContent, CurrentContents, CurrentContext } from '../../primitives/current'
import { act, bySlot, renderUI } from '../helpers'

/**
 * The fading current-panel container rests at `height: auto` and reacts to
 * panel resizes only when a height moves on its own — a panel switch or
 * content growing at constant width. Width-coupled resizes (a window drag)
 * must pass through with no morph and, critically, no re-render at all:
 * that silence is what keeps a resize from cascading into every panel's
 * subtree once per `ResizeObserver` frame.
 */

type StubInstance = {
	targets: Element[]
	callback: ResizeObserverCallback
}

function installResizeObserverStub() {
	const original = window.ResizeObserver

	const instances: StubInstance[] = []

	class Stub {
		targets: Element[] = []

		callback: ResizeObserverCallback

		constructor(cb: ResizeObserverCallback) {
			this.callback = cb

			instances.push(this)
		}

		observe(el: Element) {
			this.targets.push(el)
		}

		unobserve(el: Element) {
			this.targets = this.targets.filter((target) => target !== el)
		}

		disconnect() {
			this.targets = []
		}
	}

	window.ResizeObserver = Stub as unknown as typeof ResizeObserver

	return {
		instances,
		restore: () => {
			window.ResizeObserver = original
		},
	}
}

/** Stubs an element's `getBoundingClientRect` box (jsdom always reports 0). */
function mockRect(el: Element, box: { width: number; height: number }) {
	Object.defineProperty(el, 'getBoundingClientRect', {
		value: () => ({ ...box, top: 0, left: 0, right: box.width, bottom: box.height }),
		configurable: true,
	})
}

describe('CurrentContents resize morph', () => {
	let stub: ReturnType<typeof installResizeObserverStub>

	let commits = 0

	beforeEach(() => {
		stub = installResizeObserverStub()

		commits = 0
	})

	afterEach(() => {
		stub.restore()
	})

	function mount(value: string) {
		return renderUI(
			<Profiler
				id="host"
				onRender={() => {
					commits++
				}}
			>
				<CurrentContext value={{ value, onValueChange: undefined }}>
					<CurrentContents slotPrefix="test" fade mount="always">
						<CurrentContent slotPrefix="test" value="a">
							Panel A
						</CurrentContent>
						<CurrentContent slotPrefix="test" value="b">
							Panel B
						</CurrentContent>
					</CurrentContents>
				</CurrentContext>
			</Profiler>,
		)
	}

	/** Delivers one observer frame for every observed panel. */
	function fire(box: { inline: number; block: number }) {
		act(() => {
			for (const observer of stub.instances) {
				const entries = observer.targets.map((target) => ({
					target,
					borderBoxSize: [{ inlineSize: box.inline, blockSize: box.block }],
				})) as unknown as ResizeObserverEntry[]

				observer.callback(entries, observer as unknown as ResizeObserver)
			}
		})
	}

	it('rests at auto height with no inline pin', () => {
		const { container } = mount('a')

		const contents = bySlot(container, 'test-contents')

		expect(contents?.style.height).toBe('')
	})

	it('passes a width-coupled resize burst through with no re-render and no pin', () => {
		const { container } = mount('a')

		const contents = bySlot(container, 'test-contents')

		// Baseline delivery, then a drag: width and height move together.
		fire({ inline: 600, block: 300 })

		const before = commits

		for (let step = 1; step <= 10; step++) {
			fire({ inline: 600 + step * 10, block: 300 + step * 5 })
		}

		expect(commits).toBe(before)

		expect(contents?.style.height).toBe('')
	})

	it('morphs on a height-only change, pinning the outgoing height before paint', () => {
		const { container } = mount('a')

		const contents = bySlot(container, 'test-contents')

		if (!contents) throw new Error('no contents box rendered')

		mockRect(contents, { width: 600, height: 300 })

		fire({ inline: 600, block: 300 })

		// Content grows in place: same width, taller panel.
		fire({ inline: 600, block: 420 })

		expect(contents.style.height).toBe('300px')
	})

	it('lets a width-coupled change cancel a morph, then morphs cleanly again', () => {
		const { container } = mount('a')

		const contents = bySlot(container, 'test-contents')

		if (!contents) throw new Error('no contents box rendered')

		mockRect(contents, { width: 600, height: 300 })

		fire({ inline: 600, block: 300 })

		fire({ inline: 600, block: 420 })

		expect(contents.style.height).toBe('300px')

		// A drag arrives mid-morph: the morph stands down (the pin stays only
		// until the animation runtime hands the height back to layout).
		fire({ inline: 640, block: 440 })

		// The next height-only change morphs from the container's current box.
		mockRect(contents, { width: 640, height: 320 })

		fire({ inline: 640, block: 500 })

		expect(contents.style.height).toBe('320px')
	})

	it('morphs across a panel switch, from the outgoing height toward the incoming panel', async () => {
		const { container, rerender } = mount('a')

		const contents = bySlot(container, 'test-contents')

		if (!contents) throw new Error('no contents box rendered')

		mockRect(contents, { width: 600, height: 300 })

		const [panelA, panelB] = Array.from(container.querySelectorAll('[data-slot="test-content"]'))

		if (!panelA || !panelB) throw new Error('panels not rendered')

		mockRect(panelB, { width: 600, height: 500 })

		// Switching flips `data-current`; the mutation observer re-collects the
		// panels and pins the container at its outgoing height in the same frame.
		await act(async () => {
			rerender(
				<Profiler
					id="host"
					onRender={() => {
						commits++
					}}
				>
					<CurrentContext value={{ value: 'b', onValueChange: undefined }}>
						<CurrentContents slotPrefix="test" fade mount="always">
							<CurrentContent slotPrefix="test" value="a">
								Panel A
							</CurrentContent>
							<CurrentContent slotPrefix="test" value="b">
								Panel B
							</CurrentContent>
						</CurrentContents>
					</CurrentContext>
				</Profiler>,
			)
		})

		expect(contents.style.height).toBe('300px')
	})
})
