'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../button'
import { useControl } from '../control/context'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

export type PasswordInputProps = Omit<InputProps, 'type' | 'suffix'> & {
	toggleButton?: {
		visible?: boolean
		label?: {
			show?: string
			hide?: string
		}
	}
}

type ToggleProps = {
	visible: boolean
	onToggle: () => void
	showLabel: string
	hideLabel: string
	disabled?: boolean
}

function VisibilityToggle({ visible, onToggle, showLabel, hideLabel, disabled }: ToggleProps) {
	const text = visible ? hideLabel : showLabel

	return (
		<Tooltip>
			<TooltipTrigger>
				{/* Fixed accessible name + aria-pressed (the APG toggle pattern):
				    screen readers do not reliably announce a name swap on the same
				    control. The visible tooltip still swaps. */}
				<Button
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

/** Masked Input with a tooltip-labeled suffix button that toggles plaintext visibility; suppress it via `toggleButton.visible`. */
export function PasswordInput({ toggleButton, ...props }: PasswordInputProps) {
	const [visible, setVisible] = useState(false)

	const control = useControl()

	// Input resolves its own disabled internally; mirror that resolution
	// (useControlProps) so the toggle can't diverge from the field. A disabled
	// field disables the toggle and re-masks — its value is out of play.
	// readOnly does neither: the value stays viewable, just not editable.
	const disabled = props.disabled ?? control?.disabled

	const revealed = visible && !disabled

	const showToggle = toggleButton?.visible ?? true

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
						showLabel={toggleButton?.label?.show ?? 'Show password'}
						hideLabel={toggleButton?.label?.hide ?? 'Hide password'}
						disabled={disabled}
					/>
				) : undefined
			}
		/>
	)
}
