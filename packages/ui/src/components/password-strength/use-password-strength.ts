'use client'

import { type ReactNode, useEffect, useEffectEvent, useMemo } from 'react'

/** A single password requirement: a stable `id`, a display `label`, and a `test` predicate evaluated against the current value. */
export type PasswordRule = {
	id: string
	label: ReactNode
	test: (value: string) => boolean
}

/** The reported strength tier: `empty` (no input), then `weak` → `strong` as the passing-rule ratio rises. */
export type StrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong'

/** Strength snapshot reported on change: rules `passed` count (`score`) out of `max`, the derived `level`, and the passing rule ids. */
export type PasswordStrengthChange = {
	score: number
	max: number
	level: StrengthLevel
	passed: string[]
}

type PasswordRuleResult = {
	rule: PasswordRule
	passed: boolean
}

type PasswordStrengthOptions = {
	value: string
	rules: readonly PasswordRule[]
	onStrengthChange?: (strength: PasswordStrengthChange) => void
}

type PasswordStrengthResult = {
	results: PasswordRuleResult[]
	level: StrengthLevel
	passedCount: number
}

/**
 * Maps a passing-rule ratio to a non-empty strength level.
 *
 * @param passed - Count of rules whose `test` returned true.
 * @param total - Total rule count; `0` yields a `0` ratio (and `'weak'`).
 * @returns The level: `'weak'` (ratio ≤ 0.25), `'fair'` (≤ 0.5), `'good'` (< 1), else `'strong'`.
 * @internal
 */
function deriveLevel(passed: number, total: number): Exclude<StrengthLevel, 'empty'> {
	const ratio = total === 0 ? 0 : passed / total

	if (ratio <= 0.25) return 'weak'
	if (ratio <= 0.5) return 'fair'
	if (ratio < 1) return 'good'

	return 'strong'
}

/**
 * Evaluates a password against a rule set and derives its strength.
 *
 * @returns `results` (each rule paired with its `passed` flag, in rule order),
 * the derived `level`, and `passedCount`.
 * @remarks
 * `onStrengthChange` fires from an effect after commit, including on first
 * render with the initial `value`. Firing is gated on the joined passing-rule
 * ids, count, level, and rule total, so a keystroke that doesn't change which
 * rules pass won't re-fire. Pass a stable `rules` reference; a fresh array
 * identity per render re-runs the evaluation memo.
 */
export function usePasswordStrength({
	value,
	rules,
	onStrengthChange,
}: PasswordStrengthOptions): PasswordStrengthResult {
	const results = useMemo(
		() => rules.map((rule) => ({ rule, passed: rule.test(value) })),
		[rules, value],
	)

	const passedIds = useMemo(
		() => results.filter((result) => result.passed).map((result) => result.rule.id),
		[results],
	)

	const passedCount = passedIds.length

	// The re-fire guard only. `passedIds` changes identity on every keystroke,
	// so the effect keys on the joined ids and the count instead. The count
	// tells apart no passing rule and one passing rule with the id `''`.
	const passedKey = passedIds.join('\u0000')

	const level: StrengthLevel = value.length === 0 ? 'empty' : deriveLevel(passedCount, rules.length)

	// The event reads `passedIds` from the latest render. The effect gives it
	// `passedKey` only so that the key stays a used dependency.
	const reportStrength = useEffectEvent(
		(strength: Omit<PasswordStrengthChange, 'passed'>, _passedKey: string) =>
			onStrengthChange?.({ ...strength, passed: passedIds }),
	)

	useEffect(() => {
		reportStrength({ score: passedCount, max: rules.length, level }, passedKey)
	}, [passedKey, passedCount, rules.length, level])

	return { results, level, passedCount }
}
