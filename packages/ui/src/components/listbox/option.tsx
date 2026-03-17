'use client'

import type React from 'react'
import { cn } from '../../core'
import { CheckIcon } from '../../primitives'
import { narabi, sawari } from '../../recipes'
import { useListbox, useSelectedOption } from './context'

export function ListboxOption<T>({
	children,
	className,
	value,
	disabled,
	...props
}: {
	className?: string
	children?: React.ReactNode
	value: T
	disabled?: boolean
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>) {
	const { value: selectedValue, onChange } = useListbox()
	const { isSelectedOption } = useSelectedOption()
	const selected = selectedValue === value

	const sharedClasses = cn('flex min-w-0 items-center', narabi.item)

	if (isSelectedOption) {
		if (!selected) return null
		return <span className={cn(className, sharedClasses)}>{children}</span>
	}

	return (
		<div
			role="option"
			aria-selected={selected}
			data-selected={selected ? '' : undefined}
			data-disabled={disabled ? '' : undefined}
			tabIndex={-1}
			onClick={() => !disabled && onChange(value)}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					if (!disabled) onChange(value)
				}
			}}
			className={cn(
				'group/option grid cursor-default grid-cols-[--spacing(5)_1fr] items-baseline gap-x-2 rounded-lg pr-3.5 pl-2 sm:grid-cols-[--spacing(4)_1fr] sm:pr-3 sm:pl-1.5',
				sawari.item,
			)}
			{...props}
		>
			<CheckIcon className="relative hidden self-center group-data-selected/option:inline" />
			<span className={cn(className, sharedClasses, 'col-start-2')}>{children}</span>
		</div>
	)
}

export {
	OptionDescription as ListboxDescription,
	OptionLabel as ListboxLabel,
} from '../../primitives/option-parts'
