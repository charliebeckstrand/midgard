import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { ScrollArea, type ScrollAreaProps } from '../../components/scroll-area'

/**
 * With `scrollbar="visible"`, the thumb is part of the layout that the first
 * paint shows. The browser can paint between two tasks, so the task that
 * commits the scroll area must also hold the thumb.
 *
 * `flushSync` commits in this task. A measurement in the commit adds the thumb
 * before `flushSync` returns. A measurement in a passive effect schedules its
 * update for a later task, and the browser can paint before that task.
 */
describe('ScrollArea thumb on the first paint', () => {
	let root: Root | null = null

	let host: HTMLElement | null = null

	afterEach(() => {
		root?.unmount()

		host?.remove()

		root = null

		host = null
	})

	/** Commits the area in this task, with content four times its height. */
	function commit(scrollbar: ScrollAreaProps['scrollbar']): HTMLElement {
		host ??= document.body.appendChild(document.createElement('div'))

		root ??= createRoot(host)

		flushSync(() =>
			root?.render(
				<div style={{ height: 100, width: 200 }}>
					<ScrollArea scrollbar={scrollbar} bare className="h-full">
						<div style={{ height: 400 }}>content</div>
					</ScrollArea>
				</div>,
			),
		)

		return host
	}

	function thumb(container: HTMLElement): HTMLElement | null {
		return container.querySelector<HTMLElement>('[data-slot="scroll-area-thumb"]')
	}

	it('holds the thumb in the task that mounts the area', () => {
		const container = commit('visible')

		const viewport = container.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')

		expect(viewport?.scrollHeight).toBeGreaterThan(viewport?.clientHeight ?? 0)

		// The viewport is 100px of 400px, so the thumb is a quarter of the track.
		expect(thumb(container)?.style.height).toBe('25px')
	})

	it('holds the thumb in the task that shows a hidden scrollbar', () => {
		const container = commit('hidden')

		expect(thumb(container)).toBeNull()

		// Nothing scrolls or resizes. The track that mounts is the only change.
		commit('visible')

		expect(thumb(container)?.style.height).toBe('25px')
	})
})
