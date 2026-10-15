import { type ComponentProps, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Textarea } from '../../../components/textarea'
import { getSlot, renderUI, setupUser, userEvent } from '../../helpers'

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

/** The height of a fixed textarea with the same props: the floor of an `autoResize` one. */
function floor(props: ComponentProps<typeof Textarea>, scope?: string): number {
	const { container } = renderUI(
		<div data-density={scope}>
			<Textarea {...props} />
		</div>,
	)

	return height(getSlot(container, 'textarea'))
}

function Controlled({ initial }: { initial: string }) {
	const [value, setValue] = useState(initial)

	return (
		<>
			<Textarea
				autoResize
				rows={3}
				value={value}
				onChange={(event) => setValue(event.target.value)}
			/>
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

		const textarea = getSlot<HTMLTextAreaElement>(container, 'textarea')

		const start = height(textarea)

		const user = setupUser()

		await user.type(textarea, 'one{Enter}two{Enter}three{Enter}four')

		expect(height(textarea)).toBeGreaterThan(start)

		expect(textarea.scrollHeight).toBe(textarea.clientHeight)
	})

	it('shrinks back to the rows height when a controlled value clears', async () => {
		const { container, getByRole } = renderUI(<Controlled initial={'a\nb\nc\nd\ne\nf'} />)

		const textarea = getSlot<HTMLTextAreaElement>(container, 'textarea')

		const { container: fixed } = renderUI(<Textarea rows={3} />)

		const floor = height(getSlot(fixed, 'textarea'))

		expect(height(textarea)).toBeGreaterThan(floor)

		await setupUser().click(getByRole('button', { name: 'Clear' }))

		expect(height(textarea)).toBe(floor)
	})

	it('stops at a max-height class and scrolls', async () => {
		const { container } = renderUI(<Textarea autoResize rows={1} className="max-h-20" />)

		const textarea = getSlot<HTMLTextAreaElement>(container, 'textarea')

		await userEvent
			.setup({ delay: null })
			.type(textarea, 'a{Enter}b{Enter}c{Enter}d{Enter}e{Enter}f{Enter}g')

		expect(height(textarea)).toBe(80)

		expect(textarea.scrollHeight).toBeGreaterThan(textarea.clientHeight)
	})

	it('refits to the new floor when rows changes with the same text', () => {
		const { container, rerender } = renderUI(<Textarea autoResize rows={3} />)

		const textarea = getSlot<HTMLTextAreaElement>(container, 'textarea')

		rerender(<Textarea autoResize rows={8} />)

		expect(height(textarea)).toBe(floor({ rows: 8 }))

		rerender(<Textarea autoResize rows={3} />)

		expect(height(textarea)).toBe(floor({ rows: 3 }))
	})

	it('refits when size changes the padding and the text size', async () => {
		const { container, rerender } = renderUI(<Textarea autoResize rows={3} size="sm" />)

		const textarea = getSlot<HTMLTextAreaElement>(container, 'textarea')

		const xl = floor({ rows: 3, size: 'xl' })

		expect(height(textarea)).not.toBe(xl)

		rerender(<Textarea autoResize rows={3} size="xl" />)

		await expect.poll(() => height(textarea)).toBe(xl)
	})

	it('refits when an ancestor density scope changes, with no render', async () => {
		const { container } = renderUI(
			<div data-density="sm">
				<Textarea autoResize rows={3} />
			</div>,
		)

		const textarea = getSlot<HTMLTextAreaElement>(container, 'textarea')

		const xl = floor({ rows: 3 }, 'xl')

		expect(height(textarea)).not.toBe(xl)

		textarea.closest('[data-density="sm"]')?.setAttribute('data-density', 'xl')

		await expect.poll(() => height(textarea)).toBe(xl)
	})

	it('shrinks back to the rows height on a native reset of its form', async () => {
		const { container } = renderUI(
			<form>
				<Textarea autoResize rows={3} />
			</form>,
		)

		const textarea = getSlot<HTMLTextAreaElement>(container, 'textarea')

		const min = floor({ rows: 3 })

		await userEvent
			.setup({ delay: null })
			.type(textarea, 'a{Enter}b{Enter}c{Enter}d{Enter}e{Enter}f')

		expect(height(textarea)).toBeGreaterThan(min)

		textarea.form?.reset()

		await expect.poll(() => height(textarea)).toBe(min)
	})
})
