'use client'

import { Check, X } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { Icon } from '../icon'
import { k } from './variants'

export type PasswordRule = {
	id: string
	label: ReactNode
	test: (value: string) => boolean
}

export const defaultPasswordRules: PasswordRule[] = [
	{ id: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
	{ id: 'uppercase', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
	{ id: 'number', label: 'One number', test: (v) => /\d/.test(v) },
	{ id: 'symbol', label: 'One symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
]

type StrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong'

const SEGMENT_COUNT = 4

const levelLabels: Record<StrengthLevel, string> = {
	empty: 'Empty',
	weak: 'Weak',
	fair: 'Fair',
	good: 'Good',
	strong: 'Strong',
}

function deriveLevel(passed: number, total: number): StrengthLevel {
	if (total === 0) return 'empty'

	const ratio = passed / total

	if (ratio <= 0.25) return 'weak'
	if (ratio <= 0.5) return 'fair'
	if (ratio < 1) return 'good'
	return 'strong'
}

function levelToSegments(level: StrengthLevel): number {
	switch (level) {
		case 'empty':
			return 0
		case 'weak':
			return 1
		case 'fair':
			return 2
		case 'good':
			return 3
		case 'strong':
			return SEGMENT_COUNT
	}
}

export type PasswordStrengthChange = {
	score: number
	max: number
	level: StrengthLevel
	passed: string[]
}

export type PasswordStrengthProps = {
	value: string
	rules?: PasswordRule[]
	showRules?: boolean
	showLabel?: boolean
	labels?: Partial<Record<StrengthLevel, string>>
	onStrengthChange?: (strength: PasswordStrengthChange) => void
	className?: string
}

export function PasswordStrength({
	value,
	rules = defaultPasswordRules,
	showRules = true,
	showLabel = true,
	labels,
	onStrengthChange,
	className,
}: PasswordStrengthProps) {
	const results = useMemo(
		() => rules.map((rule) => ({ rule, passed: rule.test(value) })),
		[rules, value],
	)

	const passedIds = useMemo(() => results.filter((r) => r.passed).map((r) => r.rule.id), [results])

	const passedCount = passedIds.length

	const level: StrengthLevel = value.length === 0 ? 'empty' : deriveLevel(passedCount, rules.length)

	const segments = levelToSegments(level)

	const label = labels?.[level] ?? levelLabels[level]

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

	const levelClass = level === 'empty' ? undefined : k.level[level]

	const labelLevelClass = k.labelLevel[level]

	return (
		<div data-slot="password-strength" className={cn(k.root, className)}>
			<div
				className={cn(k.meter)}
				role="progressbar"
				aria-valuenow={segments}
				aria-valuemin={0}
				aria-valuemax={SEGMENT_COUNT}
				aria-label={`Password strength: ${label}`}
			>
				{Array.from({ length: SEGMENT_COUNT }).map((_, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length segmented meter
						key={i}
						data-slot="password-strength-segment"
						data-active={i < segments || undefined}
						className={cn(k.segment, i < segments && levelClass)}
					/>
				))}
			</div>
			{showLabel && (
				<div aria-live="polite" className={cn(k.label, labelLevelClass)}>
					{label}
				</div>
			)}
			{showRules && (
				<ul className={cn(k.rules)}>
					{results.map(({ rule, passed }) => (
						<li
							key={rule.id}
							data-slot="password-strength-rule"
							data-passed={passed || undefined}
							className={cn(k.rule)}
						>
							<Icon
								icon={passed ? <Check /> : <X />}
								className={cn(k.ruleIcon, passed ? k.ruleIconPass : k.ruleIconFail)}
							/>
							<span className={cn(passed ? k.ruleTextPass : k.ruleText)}>{rule.label}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
