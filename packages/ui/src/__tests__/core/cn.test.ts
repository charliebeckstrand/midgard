// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { cn, cnMemoNodes } from '../../core/cn'
import { utilityTable } from '../../core/density/utility-table'

describe('cn', () => {
	it('merges multiple class strings', () => {
		const result = cn('foo', 'bar')

		expect(result).toBe('foo bar')
	})

	it('filters falsy values', () => {
		const result = cn('foo', false, null, undefined, 0, '', 'bar')

		expect(result).toBe('foo bar')
	})

	it('resolves tailwind conflicts with later class winning', () => {
		const result = cn('px-4', 'px-2')

		expect(result).toContain('px-2')

		expect(result).not.toContain('px-4')
	})

	it('handles arrays and objects', () => {
		const result = cn(['foo', 'bar'], { baz: true, qux: false })

		expect(result).toContain('foo')

		expect(result).toContain('bar')

		expect(result).toContain('baz')

		expect(result).not.toContain('qux')
	})

	it('returns empty string for no arguments', () => {
		const result = cn()

		expect(result).toBe('')
	})

	// The argument memo (`core/cn.ts`) answers a repeat call without merging, so
	// these pin the cases where keying on arguments could diverge from merging
	// them. Each asserts the memoized answer against the same call made cold, so
	// a regression shows as a wrong string rather than a slow one.
	describe('memoized on its arguments', () => {
		it('repeats an answer for the same arguments', () => {
			expect(cn('px-4', 'px-2')).toBe(cn('px-4', 'px-2'))
		})

		it('holds distinct answers per argument, not per merged output', () => {
			expect(cn('px-4', 'px-2')).toBe('px-2')

			expect(cn('px-4', 'px-8')).toBe('px-8')
		})

		it('separates arities that share a prefix', () => {
			expect(cn('flex')).toBe('flex')

			expect(cn('flex', 'p-2')).toBe('flex p-2')

			expect(cn('flex', 'p-2', 'p-4')).toBe('flex p-4')

			// Re-read the shorter calls: a trie that stored the longer answer on a
			// shared prefix node would now return it for the shorter call too.
			expect(cn('flex')).toBe('flex')

			expect(cn('flex', 'p-2')).toBe('flex p-2')
		})

		it('treats every argument clsx renders as nothing as the same key', () => {
			const expected = cn('flex', 'p-2')

			expect(cn('flex', false, 'p-2')).toBe(expected)

			expect(cn('flex', null, 'p-2')).toBe(expected)

			expect(cn('flex', undefined, 'p-2')).toBe(expected)

			expect(cn('flex', '', 'p-2')).toBe(expected)
		})

		it('keeps merging arguments it cannot key on', () => {
			// Objects and numbers bypass the memo; the result must still be the
			// merge, including conflict resolution across the bypassed argument.
			expect(cn('px-4', { 'px-2': true, 'px-8': false })).toBe('px-2')

			expect(cn('px-4', ['px-2', { 'px-8': true }])).toBe('px-8')

			expect(cn('px-4', 0, 'px-2')).toBe('px-2')
		})

		it('keys an array of strings as its items, as the merge flattens it', () => {
			// A recipe keeps many class lists as arrays of strings. The memo walks
			// each item, so a repeat call records nothing new.
			const list = ['gap-md', ['p-4', false], 'p-2']

			expect(cn('flex', list)).toBe('flex gap-md p-2')

			const before = cnMemoNodes()

			expect(cn('flex', list)).toBe('flex gap-md p-2')

			expect(cn('flex', ['gap-md', 'p-4', false, 'p-2'])).toBe('flex gap-md p-2')

			expect(cnMemoNodes()).toBe(before)
		})

		it('records nothing for a call it cannot key', () => {
			// The memo must decide it cannot key the call *before* it branches on any
			// leading argument. Branching as it walked would strand nodes on a path
			// no call can ever complete, so a call site pairing a dynamic class with
			// an object would grow the memo for every distinct class it renders.
			const before = cnMemoNodes()

			for (let index = 0; index < 500; index++) {
				expect(cn(`w-[${index}px]`, { active: true })).toContain(`w-[${index}px]`)
			}

			expect(cnMemoNodes()).toBe(before)
		})

		it('stops growing at the cap and keeps answering', () => {
			// A call site interpolating a value renders unboundedly many distinct
			// class lists. The memo has to stop recording rather than clear — every
			// answer stays correct past the cap, and the node count settles.
			for (let index = 0; index < 12_000; index++) cn(`h-[${index}px]`, 'shrink-0')

			const settled = cnMemoNodes()

			for (let index = 12_000; index < 24_000; index++) cn(`h-[${index}px]`, 'shrink-0')

			expect(cnMemoNodes()).toBe(settled)

			// Past the cap the merge still resolves conflicts, memo or no memo.
			expect(cn('px-4', 'px-2')).toBe('px-2')

			expect(cn(`h-[99999px]`, 'shrink-0')).toBe('h-[99999px] shrink-0')
		})

		it('answers a string built fresh at the call site', () => {
			// A dynamic class has no stable identity, but `Map` keys strings by
			// value, so an equal string still resolves to the recorded answer.
			const width = 2

			expect(cn('px-4', `px-${width}`)).toBe('px-2')

			expect(cn('px-4', `px-${width}`)).toBe('px-2')
		})
	})

	describe('stepped density classes', () => {
		it('replaces a plain class of the same property with a later stepped class', () => {
			expect(cn('text-xl', 'density-text-[base,lg,xl]')).toBe('density-text-[base,lg,xl]')

			expect(cn('px-2', 'density-px-[2,3,4]')).toBe('density-px-[2,3,4]')
		})

		it('replaces a stepped class with a later plain class of the same property', () => {
			expect(cn('density-max-h-[48,52,56]', 'max-h-64')).toBe('max-h-64')

			expect(cn('density-p-[2,3,4]', 'p-0')).toBe('p-0')

			expect(cn('density-min-w-[16,24,32]', 'min-w-0')).toBe('min-w-0')

			expect(cn('density-my-[3,4,5]', 'my-0')).toBe('my-0')
		})

		it('replaces a stepped side margin with a later stepped block margin', () => {
			expect(cn('density-mb-[3,4,5]', 'density-my-[1,2,3]')).toBe('density-my-[1,2,3]')
		})

		it('keeps a stepped class beside a plain class of a different property', () => {
			expect(cn('density-px-[2,3,4]', 'py-1')).toBe('density-px-[2,3,4] py-1')
		})

		it('replaces an earlier plain class of a property that a later stepped class covers', () => {
			expect(cn('h-4', 'density-size-[4,5,6]')).toBe('density-size-[4,5,6]')

			expect(cn('ps-4', 'density-px-[2,3,4]')).toBe('density-px-[2,3,4]')

			expect(cn('rounded-tl-md', 'density-rounded-[sm,md,lg]')).toBe('density-rounded-[sm,md,lg]')

			expect(cn('px-ring-2', 'density-p-ring-[2,3,4]')).toBe('density-p-ring-[2,3,4]')
		})

		it('replaces an earlier stepped class of a property that a later plain class covers', () => {
			expect(cn('density-h-[4,5,6]', 'size-4')).toBe('size-4')

			expect(cn('density-px-[2,3,4]', 'p-4')).toBe('p-4')

			expect(cn('density-left-[1,2,3]', 'inset-x-2')).toBe('inset-x-2')
		})

		it('keeps an earlier leading class, which the stepped text class reads', () => {
			expect(cn('leading-none', 'density-text-[base,lg,xl]')).toBe(
				'leading-none density-text-[base,lg,xl]',
			)
		})

		// Each utility of the table merges with its plain class in each order, so a
		// new entry merges with no other change.
		it.each(Object.keys(utilityTable))('merges density-%s with its plain class', (name) => {
			const [plain, stepped] =
				name === 'text'
					? ['text-sm', 'density-text-[sm,base,lg]']
					: name === 'rounded'
						? ['rounded-sm', 'density-rounded-[sm,md,lg]']
						: [`${name}-1`, `density-${name}-[1,2,3]`]

			expect(cn(plain, stepped)).toBe(stepped)

			expect(cn(stepped, plain)).toBe(plain)
		})
	})
})
