'use client'

import type React from 'react'
import { cn, Link } from '../../core'
import { katachi, sawari } from '../../recipes'
import { useDropdown } from './context'

const itemClasses = [
	...sawari.item,
	// Layout
	'text-left',
	'col-span-full grid grid-cols-[auto_1fr_1.5rem_0.5rem_auto] items-center supports-[grid-template-columns:subgrid]:grid-cols-subgrid',
	'group px-3.5 sm:px-3',
	// Focus
	'focus:outline-hidden',
	// Icon slots — sizing from shared recipe, dropdown-specific grid positioning + spacing
	...katachi.iconSlot,
	'*:data-[slot=icon]:col-start-1 *:data-[slot=icon]:row-start-1 *:data-[slot=icon]:mr-2.5 *:data-[slot=icon]:-ml-0.5 sm:*:data-[slot=icon]:mr-2',
	// Icon slots — light
	'*:data-[slot=icon]:text-zinc-500',
	// Icon slots — hover + focus
	'focus:*:data-[slot=icon]:text-white',
	'hover:*:data-[slot=icon]:text-white',
	// Icon slots — dark
	'dark:*:data-[slot=icon]:text-zinc-400',
	// Avatar slots
	'*:data-[slot=avatar]:mr-2.5 *:data-[slot=avatar]:-ml-1 *:data-[slot=avatar]:size-6 sm:*:data-[slot=avatar]:mr-2 sm:*:data-[slot=avatar]:size-5',
]

export function DropdownItem({
	className,
	...props
}: { className?: string } & (
	| ({ href?: never; onClick?: () => void; disabled?: boolean } & Omit<
			React.ComponentPropsWithoutRef<'button'>,
			'className'
	  >)
	| ({ href: string; disabled?: boolean } & Omit<
			React.ComponentPropsWithoutRef<typeof Link>,
			'className'
	  >)
)) {
	const { close } = useDropdown()
	const classes = cn(itemClasses, className)

	if (typeof props.href === 'string') {
		const { disabled, ...linkProps } = props as {
			href: string
			disabled?: boolean
		} & React.ComponentPropsWithoutRef<typeof Link>
		return (
			<Link
				{...linkProps}
				role="menuitem"
				tabIndex={-1}
				data-slot="item"
				data-disabled={disabled ? '' : undefined}
				className={classes}
				onClick={(e) => {
					if (disabled) {
						e.preventDefault()
						return
					}
					close()
					linkProps.onClick?.(e)
				}}
			/>
		)
	}

	const { disabled, onClick, ...buttonProps } = props as {
		disabled?: boolean
		onClick?: () => void
	} & React.ComponentPropsWithoutRef<'button'>
	return (
		<button
			type="button"
			{...buttonProps}
			role="menuitem"
			tabIndex={-1}
			data-slot="item"
			data-disabled={disabled ? '' : undefined}
			className={classes}
			onClick={() => {
				if (disabled) return
				close()
				onClick?.()
			}}
		/>
	)
}

export function DropdownLabel({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div {...props} data-slot="label" className={cn('col-start-2 row-start-1', className)} />
}

export function DropdownDescription({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	return (
		<p
			data-slot="description"
			{...props}
			className={cn(
				'col-span-2 col-start-2 row-start-2 text-sm/5 text-zinc-500 sm:text-xs/5',
				'group-focus:text-white',
				'dark:text-zinc-400',
				'forced-colors:group-focus:text-[HighlightText]',
				className,
			)}
		/>
	)
}

export function DropdownShortcut({
	keys,
	className,
	...props
}: { keys: string | string[]; className?: string } & Omit<
	React.ComponentPropsWithoutRef<'kbd'>,
	'className'
>) {
	return (
		<kbd
			data-slot="shortcut"
			{...props}
			className={cn('col-start-5 row-start-1 flex justify-self-end', className)}
		>
			{(Array.isArray(keys) ? keys : keys.split('')).map((char, index) => (
				<kbd
					// biome-ignore lint/suspicious/noArrayIndexKey: keyboard shortcut characters have no stable unique ID
					key={index}
					className={cn(
						'min-w-[2ch] text-center font-sans text-zinc-400 capitalize',
						'group-focus:text-white',
						'forced-colors:group-focus:text-[HighlightText]',
						index > 0 && char.length > 1 && 'pl-1',
					)}
				>
					{char}
				</kbd>
			))}
		</kbd>
	)
}
