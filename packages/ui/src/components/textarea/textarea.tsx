'use client'

import clsx from 'clsx'
import type React from 'react'
import { controlInput, controlWrapper } from '../../recipes/control'

type TextareaProps = {
	className?: string
	resizable?: boolean
	disabled?: boolean
	invalid?: boolean
} & Omit<React.ComponentPropsWithoutRef<'textarea'>, 'className'>

export function Textarea({
	className,
	resizable = true,
	disabled,
	invalid,
	...props
}: TextareaProps) {
	return (
		<span data-slot="control" className={clsx(className, controlWrapper)}>
			<textarea
				disabled={disabled}
				data-invalid={invalid ? '' : undefined}
				{...props}
				className={clsx(
					'relative block h-full w-full appearance-none rounded-lg px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
					controlInput,
					resizable ? 'resize-y' : 'resize-none',
				)}
			/>
		</span>
	)
}
