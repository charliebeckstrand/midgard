'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../button'
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
}

function VisibilityToggle({ visible, onToggle, showLabel, hideLabel }: ToggleProps) {
	const text = visible ? hideLabel : showLabel

	return (
		<Tooltip>
			<TooltipTrigger>
				<Button variant="plain" aria-label={text} onClick={onToggle}>
					<Icon icon={visible ? <EyeOff /> : <Eye />} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{text}</TooltipContent>
		</Tooltip>
	)
}

export function PasswordInput({ toggleButton, ...props }: PasswordInputProps) {
	const [visible, setVisible] = useState(false)

	const showToggle = toggleButton?.visible ?? true

	return (
		<Input
			{...props}
			type={visible ? 'text' : 'password'}
			suffix={
				showToggle ? (
					<VisibilityToggle
						visible={visible}
						onToggle={() => setVisible((v) => !v)}
						showLabel={toggleButton?.label?.show ?? 'Show password'}
						hideLabel={toggleButton?.label?.hide ?? 'Hide password'}
					/>
				) : undefined
			}
		/>
	)
}
