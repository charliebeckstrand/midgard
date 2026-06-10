'use client'

import { Check } from 'lucide-react'
import { type ComponentPropsWithoutRef, type ReactNode, useId } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/option'
import { useDensity } from '../density'

// Mirrors `<Icon>`'s size scale for the Density steps an option row can carry.
// Local to this primitive; does not import `<Icon>` from `components/`.
const checkIconSize: Record<Step, string> = {
	sm: 'size-4',
	md: 'size-5',
	lg: 'size-6',
}

type BaseOptionProps = {
	className?: string
	icon?: ReactNode
	selected: boolean
	disabled?: boolean
	onSelect: () => void
	/**
	 * Stamps a stable `id` the owning combobox/textbox points its
	 * `aria-activedescendant` at, and blocks mousedown from pulling focus off
	 * that input. Off for focus-roving lists (listbox/select), which move real
	 * focus to the option.
	 */
	activeDescendant?: boolean
} & Omit<
	ComponentPropsWithoutRef<'div'>,
	| 'className'
	| 'onSelect'
	| 'onClick'
	| 'onKeyDown'
	| 'onMouseDown'
	| 'role'
	| 'aria-selected'
	| 'aria-disabled'
	| 'tabIndex'
>

/** Shared option row for select-like components. */
export function BaseOption({
	children,
	className,
	icon,
	selected,
	disabled,
	onSelect,
	activeDescendant = false,
	id,
	...props
}: BaseOptionProps) {
	const { size } = useDensity()

	const autoId = useId()

	// Only mint an id for active-descendant lists; an explicit id always wins.
	const optionId = id ?? (activeDescendant ? autoId : undefined)

	const sharedClasses = cn(k.content)

	const checkIcon = icon ?? (
		<Check
			aria-hidden="true"
			data-slot="icon"
			className={cn(
				'relative hidden shrink-0 self-center text-green-600 group-data-selected/option:inline',
				checkIconSize[size],
			)}
		/>
	)

	return (
		<div
			id={optionId}
			role="option"
			aria-selected={selected}
			aria-disabled={disabled || undefined}
			data-selected={selected || undefined}
			data-disabled={disabled || undefined}
			tabIndex={-1}
			// Active-descendant lists keep DOM focus on the owning input;
			// `preventDefault` stops mousedown from transferring focus.
			onMouseDown={activeDescendant ? (event) => event.preventDefault() : undefined}
			onClick={() => !disabled && onSelect()}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()

					if (!disabled) onSelect()
				}
			}}
			className={cn(k.base, k.size[size])}
			{...props}
		>
			<span className={cn(sharedClasses, className)}>{children}</span>
			{checkIcon}
		</div>
	)
}

/** Primary label for a select-like option. */
export function OptionLabel({ className, ...props }: ComponentPropsWithoutRef<'span'>) {
	return <span {...props} className={cn(k.label, className)} />
}

/** Secondary description for a select-like option. */
export function OptionDescription({
	className,
	children,
	...props
}: ComponentPropsWithoutRef<'span'>) {
	return (
		<span {...props} className={cn(k.description, className)}>
			<span className="flex-1 truncate">{children}</span>
		</span>
	)
}

export type OptionProps<TValue = unknown> = {
	value: TValue
	disabled?: boolean
	icon?: ReactNode
	className?: string
	children?: ReactNode
}

export type OptionLabelProps = ComponentPropsWithoutRef<'span'>

export type OptionDescriptionProps = ComponentPropsWithoutRef<'span'>

/**
 * Factory for select-like option components. Consumers supply the data-slot
 * prefix and the context hook.
 *
 * `BaseOption` owns the selected-state check icon and sizes it from the
 * ambient Density. Per-option `icon` overrides it.
 */
export function createSelectOption<TValue = unknown>(config: {
	slotPrefix: string
	/**
	 * Pass for active-descendant lists (combobox); each option gets a stable
	 * `id` the owning input references. Omit for focus-roving lists.
	 */
	activeDescendant?: boolean
	useContext: () => {
		value: TValue | TValue[] | undefined
		multiple?: boolean
		onSelect: (value: TValue) => void
	}
}) {
	function Option({ value, disabled, icon, className, children }: OptionProps<TValue>) {
		const { value: selectedValue, multiple, onSelect } = config.useContext()

		const selected =
			multiple && Array.isArray(selectedValue)
				? selectedValue.includes(value)
				: selectedValue === value

		return (
			<BaseOption
				selected={selected}
				disabled={disabled}
				icon={icon}
				onSelect={() => onSelect(value)}
				data-slot={`${config.slotPrefix}-option`}
				className={className}
				activeDescendant={config.activeDescendant}
			>
				{children}
			</BaseOption>
		)
	}

	function Label({ className, ...props }: OptionLabelProps) {
		return <OptionLabel data-slot={`${config.slotPrefix}-label`} className={className} {...props} />
	}

	function Description({ className, ...props }: OptionDescriptionProps) {
		return (
			<OptionDescription
				data-slot={`${config.slotPrefix}-description`}
				className={className}
				{...props}
			/>
		)
	}

	return { Option, Label, Description }
}
