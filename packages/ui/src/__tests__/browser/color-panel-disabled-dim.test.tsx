import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ColorPanel } from '../../components/color'
import { getSlot, renderUI } from '../helpers'

/**
 * The drag surfaces and the preset chips of a disabled ColorPanel dim and refuse the pointer, in
 * each spelling of disabled.
 *
 * The area and the tracks dimmed only from the `disabled` prop. A disabled `<fieldset>`, such as
 * the lock of a Form, locked them but did not dim them. The preset chips did not dim at all.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
describe('the dim of a disabled ColorPanel (real browser)', () => {
	const parts = ['color-area', 'color-slider', 'color-swatch'] as const

	function readLook(ui: ReactElement) {
		const { container } = renderUI(ui)

		return parts.flatMap((slot) =>
			[...container.querySelectorAll(`[data-slot=${slot}]`)].map((element) => {
				const { opacity, cursor } = getComputedStyle(element)

				return { slot, opacity, cursor }
			}),
		)
	}

	const dimmed = (slot: string) => ({ slot, opacity: '0.5', cursor: 'not-allowed' })

	it.each([
		['the disabled prop', <ColorPanel key="prop" alpha swatches={['#ef4444']} disabled />],
		[
			'a disabled fieldset',
			<fieldset key="fieldset" disabled>
				<ColorPanel alpha swatches={['#ef4444']} />
			</fieldset>,
		],
	])('dims each part under %s', (_, ui) => {
		expect(readLook(ui)).toEqual([
			dimmed('color-area'),
			dimmed('color-slider'),
			dimmed('color-slider'),
			dimmed('color-swatch'),
		])
	})

	/**
	 * The first legend of a disabled fieldset keeps its controls enabled, and the area takes the
	 * same rule. A rule that dimmed under each disabled fieldset would fail here.
	 */
	it('keeps each part at full opacity in the legend of a disabled fieldset', () => {
		const look = readLook(
			<fieldset disabled>
				<legend>
					<ColorPanel swatches={['#ef4444']} />
				</legend>
			</fieldset>,
		)

		expect(look.map(({ opacity }) => opacity)).toEqual(['1', '1', '1'])
	})

	/** An enabled chip grows on hover. A disabled chip stays at its size. */
	it.each([
		[false, '1.1'],
		[true, 'none'],
	])('grows a chip on hover only when it is enabled (disabled: %s)', async (disabled, scale) => {
		const { container } = renderUI(<ColorPanel swatches={['#ef4444']} disabled={disabled} />)

		const swatch = getSlot(container, 'color-swatch')

		await userEvent.hover(swatch)

		await expect.poll(() => getComputedStyle(swatch).scale).toBe(scale)
	})
})
