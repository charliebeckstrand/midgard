'use client'

import clsx from 'clsx'
import type React from 'react'
import { useContext } from 'react'
import { Link } from '../../core'
import { menuItemBase } from '../../recipes/item'
import { MobileSidebarContext } from '../layouts/context'
import { useDropdown } from './context'

const itemClasses = [
	...menuItemBase,
	'group px-3.5 focus:outline-hidden sm:px-3',
	'text-left',
	'col-span-full grid grid-cols-[auto_1fr_1.5rem_0.5rem_auto] items-center supports-[grid-template-columns:subgrid]:grid-cols-subgrid',
	'*:data-[slot=icon]:col-start-1 *:data-[slot=icon]:row-start-1 *:data-[slot=icon]:mr-2.5 *:data-[slot=icon]:-ml-0.5 *:data-[slot=icon]:size-5 sm:*:data-[slot=icon]:mr-2 sm:*:data-[slot=icon]:size-4',
	'*:data-[slot=icon]:text-zinc-500 focus:*:data-[slot=icon]:text-white hover:*:data-[slot=icon]:text-white dark:*:data-[slot=icon]:text-zinc-400',
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
	const closeSidebar = useContext(MobileSidebarContext)
	const classes = clsx(className, itemClasses)

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
				data-disabled={disabled ? '' : undefined}
				className={classes}
				onClick={(e) => {
					if (disabled) {
						e.preventDefault()
						return
					}
					close()
					closeSidebar?.()
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
			data-disabled={disabled ? '' : undefined}
			className={classes}
			onClick={() => {
				if (disabled) return
				close()
				closeSidebar?.()
				onClick?.()
			}}
		/>
	)
}

export function DropdownLabel({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div {...props} data-slot="label" className={clsx(className, 'col-start-2 row-start-1')} />
}

export function DropdownDescription({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	return (
		<p
			data-slot="description"
			{...props}
			className={clsx(
				className,
				'col-span-2 col-start-2 row-start-2 text-sm/5 text-zinc-500 group-focus:text-white sm:text-xs/5 dark:text-zinc-400 forced-colors:group-focus:text-[HighlightText]',
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
		<kbd {...props} className={clsx(className, 'col-start-5 row-start-1 flex justify-self-end')}>
			{(Array.isArray(keys) ? keys : keys.split('')).map((char, index) => (
				<kbd
					// biome-ignore lint/suspicious/noArrayIndexKey: keyboard shortcut characters have no stable unique ID
					key={index}
					className={clsx(
						'min-w-[2ch] text-center font-sans text-zinc-400 capitalize group-focus:text-white forced-colors:group-focus:text-[HighlightText]',
						index > 0 && char.length > 1 && 'pl-1',
					)}
				>
					{char}
				</kbd>
			))}
		</kbd>
	)
}
