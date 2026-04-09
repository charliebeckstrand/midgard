'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../button'
import { Icon } from '../icon'
import { Input, type InputProps } from './component'

export type PasswordInputProps = Omit<InputProps, 'type' | 'suffix'>

export function PasswordInput(props: PasswordInputProps) {
	const [visible, setVisible] = useState(false)

	return (
		<Input
			{...props}
			type={visible ? 'text' : 'password'}
			suffix={
				<Button
					variant="plain"
					size="sm"
					aria-label={visible ? 'Hide password' : 'Show password'}
					onClick={() => setVisible((v) => !v)}
				>
					<Icon icon={visible ? <EyeOff /> : <Eye />} />
				</Button>
			}
		/>
	)
}
