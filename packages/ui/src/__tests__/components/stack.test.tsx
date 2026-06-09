import { describe, expect, it } from 'vitest'
import { Stack } from '../../components/stack'
import { bySlot, renderUI } from '../helpers'

describe('Stack', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Stack id="test">content</Stack>)

		const el = bySlot(container, 'stack')

		expect(el).toHaveAttribute('id', 'test')
	})

	it('stretches children across the inline axis by default so blocks span full width', () => {
		const { container } = renderUI(<Stack>content</Stack>)

		expect(bySlot(container, 'stack')).toHaveClass('items-stretch')
	})
})
