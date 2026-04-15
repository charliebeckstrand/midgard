import { Check } from 'lucide-react'
import type React from 'react'
import { Icon } from '../components/icon'
import { cn } from '../core'
import { katachi } from '../recipes'

const k = katachi.option

export type BaseOptionProps = {
	className?: string
	icon?: React.ReactNode
	selected: boolean
	disabled?: boolean
	onSelect: () => void
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'onSelect'>

/** Shared option row for select-like components. */
export function BaseOption({
	children,
	className,
	icon,
	selected,
	disabled,
	onSelect,
	...props
}: BaseOptionProps) {
	const sharedClasses = cn(k.content)

	const checkIcon = icon ?? (
		<Icon
			icon={<Check />}
			className="relative hidden self-center text-green-600 group-data-selected/option:inline"
		/>
	)

	return (
		<div
			role="option"
			aria-selected={selected}
			aria-disabled={disabled || undefined}
			data-selected={selected ? '' : undefined}
			data-disabled={disabled ? '' : undefined}
			tabIndex={-1}
			onClick={() => !disabled && onSelect()}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()

					if (!disabled) onSelect()
				}
			}}
			className={cn(k.base, k.check)}
			{...props}
		>
			<span className={cn(className, sharedClasses)}>{children}</span>
			{checkIcon}
		</div>
	)
}

/** Primary label for a select-like option. */
export function OptionLabel({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return (
		<span {...props} className={cn(k.label, 'group-data-selected/option:font-bold', className)} />
	)
}

/** Secondary description for a select-like option. */
export function OptionDescription({
	className,
	children,
	...props
}: React.ComponentPropsWithoutRef<'span'>) {
	return (
		<span {...props} className={cn(k.description, className)}>
			<span className="flex-1 truncate">{children}</span>
		</span>
	)
}
