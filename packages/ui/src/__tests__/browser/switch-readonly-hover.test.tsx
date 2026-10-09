import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Switch } from '../../components/switch'
import { present, renderUI } from '../helpers'

/**
 * A read-only Switch keeps the resting colors of its track on hover. The pointer does not change
 * the state, so a hover wash would give a false signal. The file runs in the real browser, because
 * jsdom loads no stylesheet and does not match `:hover`.
 */
describe('read-only switch hover (real browser)', () => {
	async function trackStyle(props: { readOnly?: boolean; checked: boolean }) {
		const { container } = renderUI(
			<Switch aria-label="Notifications" onChange={() => {}} {...props} />,
		)
		const track = present(container.querySelector('label[data-slot="control"]'), 'switch track')
		const rest = getComputedStyle(track)
		const before = { background: rest.backgroundColor, opacity: rest.opacity }

		await userEvent.hover(track)

		const hover = getComputedStyle(track)

		return { before, after: { background: hover.backgroundColor, opacity: hover.opacity } }
	}

	it('washes the track of an editable off switch on hover (control)', async () => {
		const { before, after } = await trackStyle({ checked: false })
		expect(after.background).not.toBe(before.background)
	})

	it('keeps the track of a read-only off switch on hover', async () => {
		const { before, after } = await trackStyle({ checked: false, readOnly: true })
		expect(after).toEqual(before)
	})

	it('dims the track of an editable on switch on hover (control)', async () => {
		const { before, after } = await trackStyle({ checked: true })
		expect(after.opacity).not.toBe(before.opacity)
	})

	it('keeps the track of a read-only on switch on hover', async () => {
		const { before, after } = await trackStyle({ checked: true, readOnly: true })
		expect(after).toEqual(before)
	})
})
