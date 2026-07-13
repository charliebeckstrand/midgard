'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../button'
import { useControl } from '../control/context'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

/** Props for {@link PasswordInput}: {@link InputProps} (less `type`/`suffix`) plus the visibility-toggle switch. */
export type PasswordInputProps = Omit<InputProps, 'type' | 'suffix'> & {
	/** Renders the suffix show/hide toggle. Pass `false` to suppress it. @defaultValue true */
	toggleButton?: boolean
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
 * `aria-pressed`, per the APG toggle-button pattern: screen readers don't
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

/** Masked Input with a tooltip-labeled suffix button that toggles plaintext visibility; suppress it via `toggleButton={false}`. */
export function PasswordInput({ toggleButton = true, ...props }: PasswordInputProps) {
	const [visible, setVisible] = useState(false)

	const control = useControl()

	// Input resolves its own disabled internally; mirror that resolution
	// (useControlProps) so the toggle can't diverge from the field. A disabled
	// field disables the toggle and re-masks: its value is out of play.
	// readOnly does neither; the value stays viewable but not editable.
	const disabled = props.disabled ?? control?.disabled

	const revealed = visible && !disabled

	return (
		<Input
			data-slot="password-input"
			{...props}
			type={revealed ? 'text' : 'password'}
			suffix={
				toggleButton ? (
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
