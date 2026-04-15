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
})
