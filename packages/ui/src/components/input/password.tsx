'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../button'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { Input, type InputProps } from './component'
import { useInputSize } from './context'

export type PasswordInputProps = Omit<InputProps, 'type' | 'suffix'>

type ToggleProps = {
	visible: boolean
	onToggle: () => void
}

function VisibilityToggle({ visible, onToggle }: ToggleProps) {
	const size = useInputSize()

	return (
		<Tooltip>
			<TooltipTrigger>
				<Button
					variant="plain"
					size={size}
					className="pointer-events-auto"
					aria-label={visible ? 'Hide password' : 'Show password'}
					onClick={onToggle}
				>
					<Icon icon={visible ? <EyeOff /> : <Eye />} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{visible ? 'Hide password' : 'Show password'}</TooltipContent>
		</Tooltip>
	)
}

export function PasswordInput(props: PasswordInputProps) {
	const [visible, setVisible] = useState(false)

	return (
		<Input
			{...props}
			type={visible ? 'text' : 'password'}
			suffix={<VisibilityToggle visible={visible} onToggle={() => setVisible((v) => !v)} />}
		/>
	)
}
