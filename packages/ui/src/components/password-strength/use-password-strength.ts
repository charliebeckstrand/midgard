'use client'

import { type ReactNode, useEffect, useMemo, useRef } from 'react'

export type PasswordRule = {
	id: string
	label: ReactNode
	test: (value: string) => boolean
}

export type StrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong'

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

function deriveLevel(passed: number, total: number): Exclude<StrengthLevel, 'empty'> {
	const ratio = total === 0 ? 0 : passed / total

	if (ratio <= 0.25) return 'weak'
	if (ratio <= 0.5) return 'fair'
	if (ratio < 1) return 'good'

	return 'strong'
}

export function usePasswordStrength({
	value,
	rules,
	onStrengthChange,
}: PasswordStrengthOptions): PasswordStrengthResult {
	const results = useMemo(
		() => rules.map((rule) => ({ rule, passed: rule.test(value) })),
		[rules, value],
	)

	const passedIds = useMemo(() => results.filter((r) => r.passed).map((r) => r.rule.id), [results])

	const passedCount = passedIds.length

	const level: StrengthLevel = value.length === 0 ? 'empty' : deriveLevel(passedCount, rules.length)

	const onChangeRef = useRef(onStrengthChange)

	onChangeRef.current = onStrengthChange

	useEffect(() => {
		onChangeRef.current?.({
			score: passedCount,
			max: rules.length,
			level,
			passed: passedIds,
		})
	}, [passedCount, rules.length, level, passedIds])

	return { results, level, passedCount }
}
