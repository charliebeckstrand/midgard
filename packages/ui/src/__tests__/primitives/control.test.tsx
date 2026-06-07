import { describe, expect, it } from 'vitest'
import { ControlFrame } from '../../primitives/control'
import { bySlot, renderUI } from '../helpers'

describe('ControlFrame', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<ControlFrame id="ctrl">content</ControlFrame>)

		const frame = bySlot(container, 'control-frame')

		expect(frame).toHaveAttribute('id', 'ctrl')
	})
})
