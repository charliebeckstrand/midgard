'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useOpenChange } from '../../hooks/use-open-change'
import { Button } from '../button'
import { useControl } from '../control/context'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

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
	showLabel: string
	hideLabel: string
	disabled?: boolean
}

/**
 * Suffix button for {@link PasswordInput} that toggles plaintext visibility.
 *
 * @remarks
 * Keeps a fixed `aria-label` (the show label) and signals state via
 * `aria-pressed`, per the APG toggle-button pattern. Screen readers don't
 * reliably announce a name swap on the same control. The visible tooltip text
 * still swaps between show/hide.
 * @internal
 */
function VisibilityToggle({ visible, onToggle, showLabel, hideLabel, disabled }: ToggleProps) {
	const text = visible ? hideLabel : showLabel

	return (
		<Tooltip>
			<TooltipTrigger>
				{/* Fixed accessible name + aria-pressed (the APG toggle pattern):
				    screen readers do not reliably announce a name swap on the same
				    control. The visible tooltip still swaps. */}
				<Button
					type="button"
					variant="bare"
					aria-label={showLabel}
					aria-pressed={visible}
					disabled={disabled}
					onClick={onToggle}
				>
					<Icon icon={visible ? <EyeOff /> : <Eye />} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{text}</TooltipContent>
		</Tooltip>
	)
}

/** Masked Input with a tooltip-labeled suffix button that toggles plaintext visibility; suppress it via `showToggle={false}`. */
export function PasswordInput({
	showToggle = true,
	onVisibleChange,
	...props
}: PasswordInputProps) {
	const [visible, setVisible] = useState(false)

	const control = useControl()

	// Input resolves its own disabled internally; mirror that resolution
	// (useControlProps) so the toggle can't diverge from the field. A disabled
	// field disables the toggle and re-masks: its value is out of play.
	// readOnly does neither; the value stays viewable but not editable.
	const disabled = props.disabled ?? control?.disabled

	const revealed = visible && !disabled

	// The flag is derived from the toggle and the resolved disabled state, so the
	// report watches the committed value rather than the toggle's own call site.
	useOpenChange(revealed, onVisibleChange)

	return (
		<Input
			data-slot="password-input"
			{...props}
			type={revealed ? 'text' : 'password'}
			suffix={
				showToggle ? (
					<VisibilityToggle
						visible={revealed}
						onToggle={() => setVisible((v) => !v)}
						showLabel="Show password"
						hideLabel="Hide password"
						disabled={disabled}
					/>
				) : undefined
			}
		/>
	)
}
