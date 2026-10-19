'use client'

import { Check, Dot } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn, dataAttr } from '../../core'
import { useA11yLiveRegion } from '../../hooks'
import { IntlMessage } from '../../primitives/intl/intl-message'
import { defineMessages } from '../../primitives/intl/intl-messages'
import type { MessageDescriptor } from '../../primitives/intl/types'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/password-strength'
import { Icon } from '../icon'
import {
	type PasswordRule,
	type PasswordStrengthChange,
	type StrengthLevel,
	usePasswordStrength,
} from './use-password-strength'

export type { PasswordRule, PasswordStrengthChange, StrengthLevel } from './use-password-strength'

const messages = defineMessages({
	ruleLength: {
		id: 'ui.passwordStrength.ruleLength',
		defaultMessage: 'At least 8 characters',
		description: 'A password rule: the password has 8 characters or more.',
	},
	ruleUppercase: {
		id: 'ui.passwordStrength.ruleUppercase',
		defaultMessage: 'One uppercase letter',
		description: 'A password rule: the password has an uppercase letter.',
	},
	ruleNumber: {
		id: 'ui.passwordStrength.ruleNumber',
		defaultMessage: 'One number',
		description: 'A password rule: the password has a digit.',
	},
	ruleSymbol: {
		id: 'ui.passwordStrength.ruleSymbol',
		defaultMessage: 'One symbol',
		description: 'A password rule: the password has a character that is not a letter or a digit.',
	},
	empty: {
		id: 'ui.passwordStrength.empty',
		defaultMessage: 'Empty',
		description: 'The strength of a password field with no text.',
	},
	weak: {
		id: 'ui.passwordStrength.weak',
		defaultMessage: 'Weak',
		description: 'The lowest strength of a password.',
	},
	fair: {
		id: 'ui.passwordStrength.fair',
		defaultMessage: 'Fair',
		description: 'The second strength of a password, of four.',
	},
	good: {
		id: 'ui.passwordStrength.good',
		defaultMessage: 'Good',
		description: 'The third strength of a password, of four.',
	},
	strong: {
		id: 'ui.passwordStrength.strong',
		defaultMessage: 'Strong',
		description: 'The highest strength of a password.',
	},
	meter: {
		id: 'ui.passwordStrength.meter',
		defaultMessage: 'Password strength',
		description: 'The name of the meter that shows the strength of a password.',
	},
	met: {
		id: 'ui.passwordStrength.met',
		defaultMessage: 'met',
		description: 'Read after a password rule that the password passes.',
	},
	notMet: {
		id: 'ui.passwordStrength.notMet',
		defaultMessage: 'not met',
		description: 'Read after a password rule that the password does not pass.',
	},
})

/**
 * Default rule set: at least 8 characters and at least one uppercase letter,
 * digit, and symbol. The label of each rule shows in the language of the
 * reader.
 */
export const defaultPasswordRules: readonly PasswordRule[] = [
	{
		id: 'length',
		label: <IntlMessage message={messages.ruleLength} />,
		test: (value) => value.length >= 8,
	},
	{
		id: 'uppercase',
		label: <IntlMessage message={messages.ruleUppercase} />,
		test: (value) => /[A-Z]/.test(value),
	},
	{
		id: 'number',
		label: <IntlMessage message={messages.ruleNumber} />,
		test: (value) => /\d/.test(value),
	},
	{
		id: 'symbol',
		label: <IntlMessage message={messages.ruleSymbol} />,
		test: (value) => /[^A-Za-z0-9]/.test(value),
	},
]

/** The levels of the meter, from weak to strong. */
const strengthLevels = ['weak', 'fair', 'good', 'strong'] as const

/** The name of each level. */
const levelMessages = {
	empty: messages.empty,
	weak: messages.weak,
	fair: messages.fair,
	good: messages.good,
	strong: messages.strong,
} satisfies Record<StrengthLevel, MessageDescriptor>

/**
 * Props for {@link PasswordStrength}. The root `<div>` takes the rest. The meter
 * renders its own content, so it takes no children.
 */
export type PasswordStrengthProps = Omit<ComponentProps<'div'>, 'children'> & {
	/** Password evaluated against `rules`; read-only, the meter never writes back. */
	value: string
	/**
	 * Rules evaluated against `value`; their pass ratio sets the level.
	 * @defaultValue {@link defaultPasswordRules}
	 */
	rules?: readonly PasswordRule[]
	/**
	 * Renders the per-rule checklist below the meter.
	 * @defaultValue true
	 */
	showRules?: boolean
	/**
	 * Fires when the strength changes, and on the first render. See
	 * {@link PasswordStrengthChange} for the payload.
	 *
	 * @remarks
	 * Fired from an effect after commit, gated so an unchanged level doesn't
	 * re-fire; see {@link usePasswordStrength}.
	 */
	onStrengthChange?: (strength: PasswordStrengthChange) => void
}

/** Password strength meter and rule checklist driven by a `value` against a set of `rules`. Renders a native `meter` with the level as its value text, beside a decorative four-segment bar, and reports the level via `onStrengthChange`. */
export function PasswordStrength({
	value,
	rules = defaultPasswordRules,
	showRules = true,
	onStrengthChange,
	className,
	...props
}: PasswordStrengthProps) {
	const intl = useIntl()

	const { results, level } = usePasswordStrength({ value, rules, onStrengthChange })

	const liveLabel = useA11yLiveRegion({ className: k.label({ level }) })

	const activeCount = level === 'empty' ? 0 : strengthLevels.indexOf(level) + 1

	const label = intl.formatMessage(levelMessages[level])

	return (
		<div data-slot="password-strength" {...props} className={cn(k.base, className)}>
			{/* A native meter cannot draw the segments, so it carries the value for AT, and the segment row is decorative. */}
			<meter
				value={activeCount}
				min={0}
				max={strengthLevels.length}
				aria-valuetext={label}
				aria-label={intl.formatMessage(messages.meter)}
				className="sr-only"
			/>
			<div aria-hidden="true" className={cn(k.meter)}>
				{strengthLevels.map((strengthLevel, index) => (
					<div
						key={strengthLevel}
						data-slot="password-strength-segment"
						data-active={dataAttr(index < activeCount)}
						className={k.segment({
							level: index < activeCount ? level : 'empty',
						})}
					/>
				))}
			</div>
			<div {...liveLabel}>{label}</div>
			{showRules && (
				<ul className={cn(k.rules)}>
					{results.map(({ rule, passed }) => (
						<li
							key={rule.id}
							data-slot="password-strength-rule"
							data-passed={dataAttr(passed)}
							className={cn(k.rule.base)}
						>
							<Icon
								icon={passed ? <Check /> : <Dot />}
								className={cn(k.rule.icon.base, passed ? k.rule.icon.pass : k.rule.icon.fail)}
							/>
							<span className={cn(passed ? k.rule.text.pass : k.rule.text.base)}>{rule.label}</span>
							{/* Otherwise only the (decorative) icon and color convey pass/fail. */}
							<span className="sr-only">
								{' — '}
								{intl.formatMessage(passed ? messages.met : messages.notMet)}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
