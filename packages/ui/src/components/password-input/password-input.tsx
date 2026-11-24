'use client'

import { useState } from 'react'
import { useReportedChange } from '../../hooks/use-reported-change'
import { Eye, EyeOff } from '../../primitives/icons/icons'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { Button } from '../button'
import { useControlProps } from '../control/use-control-props'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

const messages = defineMessages({
	show: {
		id: 'ui.passwordInput.show',
		defaultMessage: 'Show password',
		description:
			'The fixed name and tooltip of the toggle button that shows or hides the text of a password field. The pressed state tells if the text shows.',
	},
})

/** Props for {@link PasswordInput}: {@link InputProps} (less `type`/`suffix`) plus the visibility-toggle switch. */
export type PasswordInputProps = Omit<InputProps, 'type' | 'suffix'> & {
	/** Renders the suffix show/hide toggle. Pass `false` to suppress it. @defaultValue true */
	showToggle?: boolean
	/**
	 * Fires when the plaintext goes on or off screen.
	 *
	 * The field owns the reveal and the button that flips it. Both `type` and
	 * `suffix` are omitted from the props, so a caller has no channel to read it
	 * through. Use it to log the reveal, or to hide something else beside the
	 * field while the password shows. It reports what is actually on screen: a
	 * disabled field re-masks, and that re-mask reports `false`.
	 */
	onVisibleChange?: (visible: boolean) => void
}

type ToggleProps = {
	visible: boolean
	onToggle: () => void
	label: string
	disabled?: boolean
}

/**
 * Suffix button for {@link PasswordInput} that toggles plaintext visibility.
 *
 * @remarks
 * Keeps a fixed `aria-label` and signals the state through `aria-pressed`, as
 * the APG toggle-button pattern tells. Screen readers do not reliably announce
 * a name change on the same control. The tooltip is the visible label of the
 * icon button, so it shows the same fixed text (WCAG 2.5.3). The icon shows
 * the state.
 * @internal
 */
function VisibilityToggle({ visible, onToggle, label, disabled }: ToggleProps) {
	return (
		<Tooltip>
			<TooltipTrigger>
				{/* Fixed accessible name and aria-pressed (the APG toggle pattern).
				    The tooltip shows the same text, so the visible label and the
				    name agree. */}
				<Button
					type="button"
					variant="bare"
					aria-label={label}
					aria-pressed={visible}
					disabled={disabled}
					onClick={onToggle}
				>
					<Icon icon={visible ? <EyeOff /> : <Eye />} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}

/**
 * A password field with a button that shows or hides the password. A tooltip
 * labels the button. Suppress the button via `showToggle={false}`.
 */
export function PasswordInput({
	showToggle = true,
	onVisibleChange,
	...props
}: PasswordInputProps) {
	const intl = useIntl()

	const [visible, setVisible] = useState(false)

	// The toggle reads the resolution of the Input, so the two cannot diverge. A
	// disabled field disables the toggle and masks the value again, because the
	// value is out of play. A read-only field does neither: the value stays
	// visible but the user cannot edit it.
	const { disabled } = useControlProps({ disabled: props.disabled })

	const revealed = visible && !disabled

	// The flag is derived from the toggle and the resolved disabled state, so the
	// report watches the committed value rather than the toggle's own call site.
	useReportedChange(revealed, onVisibleChange)

	return (
		<Input
			{...props}
			// The events read the slot to mask the value while it shows as text, so
			// it comes after the spread (CONVENTIONS.md §3.9).
			data-slot="password-input"
			type={revealed ? 'text' : 'password'}
			suffix={
				showToggle ? (
					<VisibilityToggle
						visible={revealed}
						onToggle={() => setVisible((prev) => !prev)}
						label={intl.formatMessage(messages.show)}
						disabled={disabled}
					/>
				) : undefined
			}
		/>
	)
}
