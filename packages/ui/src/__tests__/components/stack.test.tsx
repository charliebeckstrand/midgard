import { describe, expect, it } from 'vitest'
import { Stack } from '../../components/stack'
import { bySlot, renderUI } from '../helpers'

describe('Stack', () => {
	it('leaves gap unset outside any Density provider, matching Flex', () => {
		const { container } = renderUI(<Stack>content</Stack>)

		const el = bySlot(container, 'stack') as HTMLElement

		// No 'md' fallback: gap stays unset, matching Flex and the documented
		// contract.
		expect(el.className).not.toMatch(/gap-/)
	})

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
