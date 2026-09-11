import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../components/button'
import { renderUI } from '../helpers'

/**
 * A disabled control must not answer the pointer, however its disabledness is spelled.
 *
 * There are two spellings, and the second is not a shortcut — it is what a control uses when it
 * has to stay focusable in order to explain itself. `Tooltip` suppresses itself over a natively
 * `disabled` reference (`use-tooltip-state`'s `isReferenceDisabled` matches `:disabled` on the
 * trigger or any descendant), so a button whose whole job is to say *why* it cannot be pressed
 * sets `aria-disabled` plus `data-disabled` and keeps the native attribute off. The carrier
 * record's gated "Delete Carrier" is exactly that, and `MenuItem` and the loading-anchor branch
 * are the same pattern.
 *
 * Every hover wash in `kiso/iro` was gated on `not-disabled:` alone — `:not(:disabled)` — which
 * that element still matches. So it lit up under the pointer while refusing the press, which is
 * the one thing a disabled control must not do.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet, so
 * `getComputedStyle` there reports nothing whatever the class list says, and `:hover` is not a
 * state it can enter at all.
 */
describe('a disabled button under the pointer (real browser)', () => {
	async function backgroundBeforeAndAfterHover(props: Record<string, unknown>) {
		const { container } = renderUI(
			<Button variant="soft" color="red" {...props}>
				Delete Carrier
			</Button>,
		)

		const button = container.querySelector('button') as HTMLElement

		const before = getComputedStyle(button).backgroundColor

		await userEvent.hover(button)

		return { before, after: getComputedStyle(button).backgroundColor }
	}

	/** The `aria-disabled` pattern — focusable, so its tooltip can still open. */
	it('takes no hover wash when disabled through data-disabled', async () => {
		const { before, after } = await backgroundBeforeAndAfterHover({
			'aria-disabled': true,
			'data-disabled': true,
		})

		expect(after).toBe(before)
	})

	/** And the native attribute, which was already right — kept so a fix cannot trade one for the other. */
	it('takes no hover wash when natively disabled', async () => {
		const { before, after } = await backgroundBeforeAndAfterHover({ disabled: true })

		expect(after).toBe(before)
	})

	/** The wash still exists. A guard that suppressed it everywhere would pass the two above. */
	it('still washes an enabled button', async () => {
		const { before, after } = await backgroundBeforeAndAfterHover({})

		expect(after).not.toBe(before)
	})
})
