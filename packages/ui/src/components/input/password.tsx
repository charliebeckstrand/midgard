'use client'

import { useState } from 'react'
import { cn } from '../../core'
import { iconSize } from '../../recipes/icon'
import { Input, type InputProps } from './input'

function EyeIcon({ className }: { className?: string }) {
	return (
		<svg
			className={cn(iconSize, className)}
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
			<path
				fillRule="evenodd"
				d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
				clipRule="evenodd"
			/>
		</svg>
	)
}

function EyeSlashIcon({ className }: { className?: string }) {
	return (
		<svg
			className={cn(iconSize, className)}
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				fillRule="evenodd"
				d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.092 1.092a4 4 0 0 0-5.558-5.558Z"
				clipRule="evenodd"
			/>
			<path d="M10.748 13.93l2.523 2.523A9.987 9.987 0 0 1 10 17a10.003 10.003 0 0 1-9.335-6.41 1.651 1.651 0 0 1 0-1.186 10.05 10.05 0 0 1 2.942-4.16l2.14 2.14A4 4 0 0 0 10.748 13.93Z" />
		</svg>
	)
}

export type PasswordInputProps = Omit<InputProps, 'type'>

export function PasswordInput(props: PasswordInputProps) {
	const [visible, setVisible] = useState(false)

	return (
		<div data-slot="control" className="relative">
			<Input {...props} type={visible ? 'text' : 'password'} />
			<button
				type="button"
				onClick={() => setVisible((v) => !v)}
				className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
				aria-label={visible ? 'Hide password' : 'Show password'}
			>
				{visible ? <EyeSlashIcon /> : <EyeIcon />}
			</button>
		</div>
	)
}
