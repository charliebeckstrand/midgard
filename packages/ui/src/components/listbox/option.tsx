'use client'

import type React from 'react'
import { cn } from '../../core'
import { BaseOption } from '../../primitives'
import { narabi } from '../../recipes'
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
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'onSelect'>) {
	const { value: selectedValue, onChange } = useListbox()
	const { isSelectedOption } = useSelectedOption()
	const selected = selectedValue === value

	const sharedClasses = cn('flex min-w-0 items-center', narabi.item)

	if (isSelectedOption) {
		if (!selected) return null
		return <span className={cn(className, sharedClasses)}>{children}</span>
	}

	return (
		<BaseOption
			selected={selected}
			disabled={disabled}
			checkPosition="start"
			onSelect={() => onChange(value)}
			className={className}
			{...props}
		>
			{children}
		</BaseOption>
	)
}

export {
	OptionDescription as ListboxDescription,
	OptionLabel as ListboxLabel,
} from '../../primitives/option'
