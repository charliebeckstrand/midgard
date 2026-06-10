'use client'

import { Check, Dot } from 'lucide-react'
import { cn } from '../../core'
import { useA11yLiveRegion } from '../../hooks'
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

/** Password strength meter and rule checklist driven by a `value` against a set of `rules`. Renders a four-segment `progressbar` and reports the level via `onStrengthChange`. */
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

	const liveLabel = useA11yLiveRegion({ className: k.label({ level }) })

	const activeCount = level === 'empty' ? 0 : strengthLevels.findIndex((l) => l.id === level) + 1

	const label =
		labels?.[level] ??
		(activeCount === 0 ? 'Empty' : (strengthLevels[activeCount - 1]?.label ?? ''))

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
						className={k.segment({
							level: i < activeCount ? level : 'empty',
						})}
					/>
				))}
			</div>
			{showLabel && <div {...liveLabel}>{label}</div>}
			{showRules && (
				<ul className={cn(k.rules)}>
					{results.map(({ rule, passed }) => (
						<li
							key={rule.id}
							data-slot="password-strength-rule"
							data-passed={passed || undefined}
							className={cn(k.rule.base)}
						>
							<Icon
								icon={passed ? <Check /> : <Dot />}
								className={cn(k.rule.icon, passed ? k.rule.iconPass : k.rule.iconFail)}
							/>
							<span className={cn(passed ? k.rule.textPass : k.rule.text)}>{rule.label}</span>
							{/* Otherwise only the (decorative) icon and color convey pass/fail. */}
							<span className="sr-only">{passed ? ' — met' : ' — not met'}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
