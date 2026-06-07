import { describe, expect, it } from 'vitest'
import { Stack } from '../../components/stack'
import { bySlot, renderUI } from '../helpers'

describe('Stack', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Stack id="test">content</Stack>)

		const el = bySlot(container, 'stack')

		expect(el).toHaveAttribute('id', 'test')
	})
})
