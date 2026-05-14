'use client'

import { Check, Dot } from 'lucide-react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/password-strength'
import { Icon } from '../icon'
import {
	type PasswordRule,
	type PasswordStrengthChange,
	type StrengthLevel,
	usePasswordStrength,
} from './use-password-strength'

export type { PasswordRule, PasswordStrengthChange } from './use-password-strength'

export const defaultPasswordRules: readonly PasswordRule[] = [
	{ id: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
	{ id: 'uppercase', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
	{ id: 'number', label: 'One number', test: (v) => /\d/.test(v) },
	{ id: 'symbol', label: 'One symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
]

const strengthLevels = [
	{ id: 'weak', label: 'Weak' },
	{ id: 'fair', label: 'Fair' },
	{ id: 'good', label: 'Good' },
	{ id: 'strong', label: 'Strong' },
] as const

export type PasswordStrengthProps = {
	value: string
	rules?: readonly PasswordRule[]
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
	const { results, level } = usePasswordStrength({ value, rules, onStrengthChange })

	const activeCount = level === 'empty' ? 0 : strengthLevels.findIndex((l) => l.id === level) + 1

	const label =
		labels?.[level] ??
		(activeCount === 0 ? 'Empty' : (strengthLevels[activeCount - 1]?.label ?? ''))

	const levelClass = level === 'empty' ? undefined : k.level[level]

	const labelLevelClass = k.labelLevel[level]

	return (
		<div data-slot="password-strength" className={cn(k.root, className)}>
			<div
				role="progressbar"
				aria-valuenow={activeCount}
				aria-valuemin={0}
				aria-valuemax={strengthLevels.length}
				aria-label={`Password strength: ${label}`}
				className={cn(k.meter)}
			>
				{strengthLevels.map((strengthLevel, i) => (
					<div
						key={strengthLevel.id}
						data-slot="password-strength-segment"
						data-active={i < activeCount || undefined}
						className={cn(k.segment, i < activeCount && levelClass)}
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
								icon={passed ? <Check /> : <Dot />}
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
