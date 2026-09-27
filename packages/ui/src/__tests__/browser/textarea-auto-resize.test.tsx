import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Textarea } from '../../components/textarea'
import { getSlot, renderUI, userEvent } from '../helpers'

/**
 * An `autoResize` textarea keeps the height of its content, and `rows` sets the
 * minimum height.
 *
 * Rides the real browser because the claim is a layout one: jsdom has no
 * `scrollHeight` and loads no stylesheet.
 */
function height(el: HTMLElement): number {
	return el.getBoundingClientRect().height
}

function Controlled({ initial }: { initial: string }) {
	const [value, setValue] = useState(initial)

	return (
		<>
			<Textarea autoResize rows={3} value={value} onChange={(e) => setValue(e.target.value)} />
			<button type="button" onClick={() => setValue('')}>
				Clear
			</button>
		</>
	)
}

describe('Textarea autoResize (real browser)', () => {
	it('keeps the rows height as the minimum', () => {
		const { container: fixed } = renderUI(<Textarea rows={3} />)
		const { container: auto } = renderUI(<Textarea autoResize rows={3} />)

		expect(height(getSlot(auto, 'textarea'))).toBe(height(getSlot(fixed, 'textarea')))
	})

	it('grows as the user types past the rows height, with no scroll', async () => {
		const { container } = renderUI(<Textarea autoResize rows={1} />)

		const el = getSlot<HTMLTextAreaElement>(container, 'textarea')

		const start = height(el)

		const user = userEvent.setup({ delay: null })

		await user.type(el, 'one{Enter}two{Enter}three{Enter}four')

		expect(height(el)).toBeGreaterThan(start)

		expect(el.scrollHeight).toBe(el.clientHeight)
	})

	it('shrinks back to the rows height when a controlled value clears', async () => {
		const { container, getByRole } = renderUI(<Controlled initial={'a\nb\nc\nd\ne\nf'} />)

		const el = getSlot<HTMLTextAreaElement>(container, 'textarea')

		const { container: fixed } = renderUI(<Textarea rows={3} />)

		const floor = height(getSlot(fixed, 'textarea'))

		expect(height(el)).toBeGreaterThan(floor)

		await userEvent.setup({ delay: null }).click(getByRole('button', { name: 'Clear' }))

		expect(height(el)).toBe(floor)
	})

	it('stops at a max-height class and scrolls', async () => {
		const { container } = renderUI(<Textarea autoResize rows={1} className="max-h-20" />)

		const el = getSlot<HTMLTextAreaElement>(container, 'textarea')

		await userEvent
			.setup({ delay: null })
			.type(el, 'a{Enter}b{Enter}c{Enter}d{Enter}e{Enter}f{Enter}g')

		expect(height(el)).toBe(80)

		expect(el.scrollHeight).toBeGreaterThan(el.clientHeight)
	})
})
