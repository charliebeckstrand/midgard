import { describe, expect, it } from 'vitest'
import { defineSlots } from '../../core/recipe'

describe('defineSlots', () => {
	it('joins a class array into one string', () => {
		expect(defineSlots({ hr: ['border-0', 'border-t', 'my-6'] })).toEqual({
			hr: 'border-0 border-t my-6',
		})
	})

	it('passes a string leaf through', () => {
		expect(defineSlots({ paragraph: 'my-3' })).toEqual({ paragraph: 'my-3' })
	})

	it('collapses an empty array to an empty string', () => {
		expect(defineSlots({ inline: [] })).toEqual({ inline: '' })
	})

	it('keeps the tree shape, collapsing leaves at every depth', () => {
		expect(
			defineSlots({
				root: ['flex'],
				heading: { 1: ['font-semibold', 'text-xl'], 2: 'text-lg' },
			}),
		).toEqual({ root: 'flex', heading: { 1: 'font-semibold text-xl', 2: 'text-lg' } })
	})

	it('resolves conflicting utilities last-wins, as defineRecipe does for its slots', () => {
		// The collapse runs through `tailwind-merge`, so a later class in the same
		// group drops the earlier one rather than shipping both.
		expect(defineSlots({ cell: ['px-3 py-2', 'px-6'] })).toEqual({ cell: 'py-2 px-6' })
	})

	it('leaves every slot in the shape cn can memoise', () => {
		const k = defineSlots({ th: ['font-semibold', 'border-b'], heading: { 1: ['text-xl'] } })

		// `cn` keys its memo on string arguments only, so the collapse is what lets
		// a per-element call hit it; an array argument fails `keyable` and takes the
		// plain merge every time (`core/cn.ts`). Asserted as the shape rather than
		// as a rise in `cnMemoNodes()`: the memo is module-level and shared across
		// files, and `core/cn.test.ts` deliberately drives it past `MEMO_CAP`, after
		// which no call records a node.
		expect(typeof k.th).toBe('string')

		expect(typeof k.heading[1]).toBe('string')
	})
})
