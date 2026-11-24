import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { Input } from '../../components/input'
import { Textarea } from '../../components/textarea'
import { Wysiwyg } from '../../modules/wysiwyg'
import { present, renderUI } from '../helpers'
import { acrossHover } from './helpers/across-hover'
import { holdRootClass } from './helpers/root-state'

/**
 * A framed control keeps its validation ring under the pointer, in both modes.
 *
 * The neutral hover ring of `kasane.layers` has a dark twin. Tailwind emits a `dark:` class
 * after the `has-[[data-invalid]]:hover:` class, and the two have the same specificity. So in
 * dark mode the gray hover ring replaced the red ring of an invalid control. The neutral hover
 * now skips each validation state, like the focus ring.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
describe('the ring of a framed control under the pointer (real browser)', () => {
	async function ringBeforeAndAfterHover(dark: boolean) {
		if (dark) holdRootClass('dark')

		const { container } = renderUI(<Input aria-label="Email" invalid />)

		const frame = present(container.querySelector('[data-slot="control-frame"]'), 'control frame')

		return acrossHover(frame, 'boxShadow')
	}

	it.for([
		['light', false],
		['dark', true],
	] as const)('keeps the red ring on hover in %s mode', async ([, dark]) => {
		const { before, after } = await ringBeforeAndAfterHover(dark)

		expect(after).toBe(before)
	})

	/** The neutral hover still exists. A guard that suppressed it everywhere would pass the two above. */
	it('still darkens the ring of a control with no validation state', async () => {
		const { container } = renderUI(<Input aria-label="Email" />)

		const frame = present(container.querySelector('[data-slot="control-frame"]'), 'control frame')

		const { before, after } = await acrossHover(frame, 'boxShadow')

		expect(after).not.toBe(before)
	})

	/**
	 * A control that takes no edit keeps its ring under the pointer. The field of
	 * a Wysiwyg is not a native control, so its frame carries `data-disabled`,
	 * and its field carries `aria-readonly`.
	 */
	it.for([
		['a disabled Input', <Input key="i" aria-label="Email" disabled />],
		['a read-only Input', <Input key="i" aria-label="Email" readOnly />],
		['a read-only Textarea', <Textarea key="t" aria-label="Notes" readOnly />],
		['a disabled Wysiwyg', <Wysiwyg key="w" aria-label="Notes" disabled />],
		['a read-only Wysiwyg', <Wysiwyg key="w" aria-label="Notes" readOnly />],
	] as [string, ReactElement][])('keeps the ring of %s on hover', async ([, control]) => {
		const { container } = renderUI(control)

		const frame = present(container.querySelector('[data-slot="control-frame"]'), 'control frame')

		const { before, after } = await acrossHover(frame, 'boxShadow')

		expect(after).toBe(before)
	})
})
