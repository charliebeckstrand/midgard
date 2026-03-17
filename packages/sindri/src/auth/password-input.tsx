'use client'

import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { type ComponentPropsWithoutRef, useState } from 'react'
import { useArrowAction } from 'ui/hooks'
import { Input } from 'ui/input'

type PasswordInputProps = Omit<ComponentPropsWithoutRef<typeof Input>, 'type'>

export function PasswordInput({ value, onKeyDown, ...props }: PasswordInputProps) {
	const [visible, setVisible] = useState(false)

	const { actionRef, onPrimaryKeyDown, onActionKeyDown } = useArrowAction<HTMLButtonElement>()

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		onPrimaryKeyDown(e)
		onKeyDown?.(e)
	}

	return (
		<div data-slot="control" className="relative">
			<Input
				{...props}
				type={visible ? 'text' : 'password'}
				value={value}
				onKeyDown={handleKeyDown}
			/>
			<button
				ref={actionRef}
				type="button"
				tabIndex={-1}
				onKeyDown={onActionKeyDown}
				onClick={() => setVisible(!visible)}
				className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
				aria-label={visible ? 'Hide password' : 'Show password'}
			>
				{visible ? (
					<EyeSlashIcon className="sm:size-4 size-5" />
				) : (
					<EyeIcon className="sm:size-4 size-5" />
				)}
			</button>
		</div>
	)
}
