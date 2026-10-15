import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
	type PasswordRule,
	usePasswordStrength,
} from '../../components/password-strength/use-password-strength'

const rules: PasswordRule[] = [
	{ id: 'length', label: '8+ chars', test: (v) => v.length >= 8 },
	{ id: 'upper', label: 'uppercase', test: (v) => /[A-Z]/.test(v) },
	{ id: 'digit', label: 'digit', test: (v) => /\d/.test(v) },
	{ id: 'symbol', label: 'symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
]

describe('usePasswordStrength', () => {
	it('returns level "empty" for an empty value regardless of rule outcomes', () => {
		const { result } = renderHook(() => usePasswordStrength({ value: '', rules }))

		expect(result.current.level).toBe('empty')

		expect(result.current.passedCount).toBe(0)
	})

	it.each([
		['a', 'weak', 0],
		['abcdefgh', 'weak', 1],
		['Abcdefgh', 'fair', 2],
		['Abcdefg1', 'good', 3],
		['Abcdefg1!', 'strong', 4],
	])('maps %s to level "%s" with %i rules passed', (value, level, passedCount) => {
		const { result } = renderHook(() => usePasswordStrength({ value, rules }))

		expect(result.current.level).toBe(level)

		expect(result.current.passedCount).toBe(passedCount)
	})

	it('does not re-fire onStrengthChange for keystrokes that leave strength unchanged', () => {
		const onStrengthChange = vi.fn()

		const { rerender } = renderHook(
			({ value }) => usePasswordStrength({ value, rules, onStrengthChange }),
			{ initialProps: { value: 'abcdefgh' } },
		)

		expect(onStrengthChange).toHaveBeenCalledTimes(1)

		// Same rules pass; a fresh passed-array identity must not re-fire.
		rerender({ value: 'abcdefghi' })

		expect(onStrengthChange).toHaveBeenCalledTimes(1)
	})

	it('preserves rule order and identity in results', () => {
		const { result } = renderHook(() => usePasswordStrength({ value: 'Ab1!', rules }))

		expect(result.current.results.map((r) => r.rule.id)).toEqual([
			'length',
			'upper',
			'digit',
			'symbol',
		])

		expect(result.current.results[0]?.rule).toBe(rules[0])
	})

	it('reports passed booleans matching each rule test', () => {
		const { result } = renderHook(() => usePasswordStrength({ value: 'Aa', rules }))

		expect(result.current.results.map((r) => r.passed)).toEqual([false, true, false, false])
	})

	it('fires onStrengthChange on mount with the initial scoring', () => {
		const onStrengthChange = vi.fn()

		renderHook(() => usePasswordStrength({ value: 'Ab1!', rules, onStrengthChange }))

		expect(onStrengthChange).toHaveBeenCalledTimes(1)

		expect(onStrengthChange).toHaveBeenLastCalledWith({
			score: 3,
			max: 4,
			level: 'good',
			passed: ['upper', 'digit', 'symbol'],
		})
	})

	it('re-fires onStrengthChange when the value changes the score', () => {
		const onStrengthChange = vi.fn()

		const { rerender } = renderHook(
			({ value }: { value: string }) => usePasswordStrength({ value, rules, onStrengthChange }),
			{ initialProps: { value: 'Ab1!' } },
		)

		onStrengthChange.mockClear()

		rerender({ value: 'Ab1!extra' })

		expect(onStrengthChange).toHaveBeenCalledTimes(1)

		expect(onStrengthChange.mock.calls[0]?.[0]).toMatchObject({
			score: 4,
			level: 'strong',
		})
	})

	it('fires neither callback when only the callback identity changes', () => {
		const first = vi.fn()

		const second = vi.fn()

		const { rerender } = renderHook(
			({ onStrengthChange }: { onStrengthChange: typeof first }) =>
				usePasswordStrength({ value: 'Ab1!', rules, onStrengthChange }),
			{ initialProps: { onStrengthChange: first } },
		)

		first.mockClear()

		rerender({ onStrengthChange: second })

		// Effect dependencies (score/level/passedIds) didn't change, so neither callback fires.
		expect(first).not.toHaveBeenCalled()

		expect(second).not.toHaveBeenCalled()
	})

	it('uses the latest callback when the score changes after callback identity changes', () => {
		const first = vi.fn()

		const second = vi.fn()

		const { rerender } = renderHook(
			({ value, onStrengthChange }: { value: string; onStrengthChange: typeof first }) =>
				usePasswordStrength({ value, rules, onStrengthChange }),
			{ initialProps: { value: 'a', onStrengthChange: first } },
		)

		first.mockClear()

		rerender({ value: 'Ab1!', onStrengthChange: second })

		expect(first).not.toHaveBeenCalled()

		expect(second).toHaveBeenCalledTimes(1)

		expect(second.mock.calls[0]?.[0]).toMatchObject({ score: 3, level: 'good' })
	})

	describe('counts passing rules from the results, not from the joined ids', () => {
		const notEmpty: PasswordRule = { id: '', label: 'Not empty', test: (v) => v.length > 0 }

		const twoChars: PasswordRule = { id: 'two', label: '2+ chars', test: (v) => v.length >= 2 }

		it.each([
			['no rule passes', [twoChars], 'x', 0, 'weak', []],
			['one rule with an empty id passes', [notEmpty], 'x', 1, 'strong', ['']],
			['two rules pass', [notEmpty, twoChars], 'xy', 2, 'strong', ['', 'two']],
		])('when %s', (_, ruleSet, value, score, level, passed) => {
			const onStrengthChange = vi.fn()

			const { result } = renderHook(() =>
				usePasswordStrength({ value, rules: ruleSet, onStrengthChange }),
			)

			expect(result.current.passedCount).toBe(score)

			expect(result.current.level).toBe(level)

			expect(onStrengthChange).toHaveBeenCalledTimes(1)

			expect(onStrengthChange).toHaveBeenLastCalledWith({
				score,
				max: ruleSet.length,
				level,
				passed,
			})
		})
	})

	it('handles an empty rules array without dividing by zero', () => {
		const onStrengthChange = vi.fn()

		const { result } = renderHook(() =>
			usePasswordStrength({ value: 'anything', rules: [], onStrengthChange }),
		)

		expect(result.current.results).toEqual([])

		expect(result.current.passedCount).toBe(0)

		expect(result.current.level).toBe('weak')

		expect(onStrengthChange).toHaveBeenCalledWith({
			score: 0,
			max: 0,
			level: 'weak',
			passed: [],
		})
	})
})
