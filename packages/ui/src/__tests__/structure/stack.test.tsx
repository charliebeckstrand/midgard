import { describe, expect, it } from 'vitest'
import { Stack } from '../../structure/stack'
import { bySlot, getSlot, renderUI } from '../helpers'

describe('Stack', () => {
	it('leaves gap unset outside any Density provider, matching Flex', () => {
		const { container } = renderUI(<Stack>content</Stack>)

		const stack = getSlot(container, 'stack')

		// No 'md' fallback: gap stays unset, matching Flex and the documented
		// contract.
		expect(stack.className).not.toMatch(/gap-/)
	})

	it('stretches children across the inline axis by default so blocks span full width', () => {
		const { container } = renderUI(<Stack>content</Stack>)

		expect(bySlot(container, 'stack')).toHaveClass('items-stretch')
	})
})
