import { describe, expect, it } from 'vitest'
import { cn } from '../../core/cn'

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
	// them. Each asserts the memoised answer against the same call made cold, so
	// a regression shows as a wrong string rather than a slow one.
	describe('memoised on its arguments', () => {
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
			// Arrays, objects, and numbers bypass the memo; the result must still be
			// the merge, including conflict resolution across the bypassed argument.
			expect(cn('px-4', ['px-2'])).toBe('px-2')

			expect(cn('px-4', { 'px-2': true, 'px-8': false })).toBe('px-2')

			expect(cn('px-4', 0, 'px-2')).toBe('px-2')
		})

		it('answers a string built fresh at the call site', () => {
			// A dynamic class has no stable identity, but `Map` keys strings by
			// value, so an equal string still resolves to the recorded answer.
			const width = 2

			expect(cn('px-4', `px-${width}`)).toBe('px-2')

			expect(cn('px-4', `px-${width}`)).toBe('px-2')
		})
	})
})
