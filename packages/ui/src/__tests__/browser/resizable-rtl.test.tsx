import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ResizableGroup, ResizableHandle, ResizablePanel } from '../../components/resizable'
import { fireEvent, getSlot, renderUI } from '../helpers'

/**
 * In a right-to-left group the first panel is on the right. A move of the
 * handle to the left therefore grows it, from the keyboard (B08-C06) and from
 * the pointer (B08-C05). Before, both kept the left-to-right sign, so the
 * handle moved away from the key and from the pointer.
 *
 * Rides the real browser because the direction comes from the computed
 * `direction`, which jsdom does not resolve from a `dir` attribute.
 */
describe('Resizable in RTL (real browser)', () => {
	afterEach(() => {
		document.documentElement.removeAttribute('dir')
	})

	function renderGroup(dir: 'ltr' | 'rtl') {
		document.documentElement.dir = dir

		const onSizesChange = vi.fn()

		const { container } = renderUI(
			<div style={{ width: 400, height: 100 }}>
				<ResizableGroup onSizesChange={onSizesChange}>
					<ResizablePanel defaultSize={50}>A</ResizablePanel>
					<ResizableHandle />
					<ResizablePanel defaultSize={50}>B</ResizablePanel>
				</ResizableGroup>
			</div>,
		)

		const handle = getSlot(container, 'resizable-handle')

		const lastSizes = () => onSizesChange.mock.calls.at(-1)?.[0] as number[] | undefined

		return { handle, lastSizes }
	}

	for (const dir of ['ltr', 'rtl'] as const) {
		/** The first panel grows when the handle moves away from it. */
		const grow = dir === 'ltr' ? '{ArrowRight}' : '{ArrowLeft}'

		it(`grows the first panel with the arrow that points away from it (${dir})`, async () => {
			const { handle, lastSizes } = renderGroup(dir)

			handle.focus()

			await userEvent.keyboard(grow)

			expect(lastSizes()).toEqual([55, 45])
		})

		it(`grows the first panel with a drag away from it (${dir})`, () => {
			const { handle, lastSizes } = renderGroup(dir)

			const box = handle.getBoundingClientRect()

			const x = box.left + box.width / 2

			const away = dir === 'ltr' ? 40 : -40

			fireEvent.pointerDown(handle, {
				isPrimary: true,
				button: 0,
				pointerId: 1,
				clientX: x,
				clientY: 50,
			})

			fireEvent.pointerMove(document, { pointerId: 1, clientX: x + away, clientY: 50 })

			fireEvent.pointerUp(document, { pointerId: 1 })

			expect(lastSizes()?.[0]).toBeGreaterThan(50)
		})
	}
})
