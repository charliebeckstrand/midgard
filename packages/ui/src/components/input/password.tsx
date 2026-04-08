'use client'

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
					variant="ghost"
					size="sm"
					aria-label={visible ? 'Hide password' : 'Show password'}
					onClick={() => setVisible((v) => !v)}
				>
					<Icon name={visible ? 'eye-off' : 'eye'} />
				</Button>
			}
		/>
	)
}
