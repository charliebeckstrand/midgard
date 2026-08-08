import { describe, expect, it } from 'vitest'
import { cn, cnMemoNodes } from '../../core/cn'
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

	it('yields slots cn can memoise, which an array leaf would not', () => {
		const k = defineSlots({ th: ['font-semibold', 'border-b'] })

		// A cold keyable call records one memo node per argument; an array fails
		// `keyable` and returns from the plain merge without recording anything.
		const before = cnMemoNodes()

		cn(k.th)

		expect(cnMemoNodes()).toBeGreaterThan(before)
	})
})
