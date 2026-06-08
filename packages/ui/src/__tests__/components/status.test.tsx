import { describe, expect, it } from 'vitest'
import { StatusDot } from '../../components/status'
import { bySlot, renderUI } from '../helpers'

describe('StatusDot', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<StatusDot id="test" />)

		const el = bySlot(container, 'status-dot')

		expect(el).toHaveAttribute('id', 'test')
	})

	it('is decorative (no role or name) by default', () => {
		const { container } = renderUI(<StatusDot status="error" />)

		const el = bySlot(container, 'status-dot')

		// Status conveyed by colour alone — a bare dot exposes no role or name.
		expect(el).not.toHaveAttribute('role')

		expect(el).not.toHaveAttribute('aria-label')
	})

	it('exposes a text alternative as role="img" when given a label', () => {
		const { container } = renderUI(<StatusDot status="error" label="Error" />)

		const el = bySlot(container, 'status-dot')

		expect(el).toHaveAttribute('role', 'img')

		expect(el).toHaveAccessibleName('Error')
	})
})
