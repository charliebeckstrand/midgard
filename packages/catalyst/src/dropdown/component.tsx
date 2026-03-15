'use client'

import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Button } from '../button'
import { Link } from '../link'
import { useOverlay } from '../hooks'
import { useMenuKeyboard } from '../hooks'
import { popoverAnimation } from '../utils/motion'
import { popoverMenu } from '../utils/styles'

interface DropdownContextValue {
	open: boolean
	toggle: () => void
	close: () => void
}

const DropdownContext = createContext<DropdownContextValue>({
	open: false,
	toggle: () => {},
	close: () => {},
})

export function Dropdown({ children, className }: React.PropsWithChildren<{ className?: string }>) {
	const [open, setOpen] = useState(false)
	const toggle = useCallback(() => setOpen((prev) => !prev), [])
	const close = useCallback(() => setOpen(false), [])
	const containerRef = useOverlay(open, close)

	return (
		<DropdownContext.Provider value={{ open, toggle, close }}>
			<div ref={containerRef} className={clsx('relative', className)}>
				{children}
			</div>
		</DropdownContext.Provider>
	)
}

export function DropdownButton<T extends React.ElementType = typeof Button>({
	as,
	...props
}: { as?: T; className?: string } & Omit<React.ComponentPropsWithoutRef<T>, 'className'>) {
	const { toggle, open } = useContext(DropdownContext)
	const Component = (as || Button) as React.ElementType

	return (
		<Component
			{...props}
			aria-expanded={open}
			aria-haspopup="menu"
			onClick={(e: React.MouseEvent) => {
				const onClickProp = (props as { onClick?: (e: React.MouseEvent) => void }).onClick
				onClickProp?.(e)
				toggle()
			}}
		/>
	)
}

const anchorPositionClasses: Record<string, string> = {
	bottom: 'top-full left-0 mt-2',
	'bottom start': 'top-full left-0 mt-2',
	'bottom end': 'top-full right-0 mt-2',
	top: 'bottom-full left-0 mb-2',
	'top start': 'bottom-full left-0 mb-2',
	'top end': 'bottom-full right-0 mb-2',
}

export function DropdownMenu({
	anchor = 'bottom',
	className,
	children,
}: {
	anchor?: string
	className?: string
	children: React.ReactNode
}) {
	const { open, close } = useContext(DropdownContext)
	const menuRef = useRef<HTMLDivElement>(null)
	const handleKeyDown = useMenuKeyboard(menuRef, '[role="menuitem"]:not([data-disabled])')

	useEffect(() => {
		if (open && menuRef.current) menuRef.current.focus()
	}, [open])

	const positionClass = anchorPositionClasses[anchor] ?? anchorPositionClasses.bottom

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					ref={menuRef}
					role="menu"
					tabIndex={-1}
					{...popoverAnimation}
					onKeyDown={handleKeyDown}
					className={clsx(
						className,
						'absolute z-50',
						positionClass,
						'w-max',
						popoverMenu,
						'supports-[grid-template-columns:subgrid]:grid supports-[grid-template-columns:subgrid]:grid-cols-[auto_1fr_1.5rem_0.5rem_auto]',
					)}
				>
					{children}
				</motion.div>
			)}
		</AnimatePresence>
	)
}

export function DropdownItem({
	className,
	...props
}: { className?: string } & (
	| ({ href?: never; onClick?: () => void; disabled?: boolean } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
	| ({ href: string; disabled?: boolean } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
)) {
	const { close } = useContext(DropdownContext)

	const classes = clsx(
		className,
		'group cursor-default rounded-lg px-3.5 py-2.5 focus:outline-hidden sm:px-3 sm:py-1.5',
		'text-left text-base/6 text-zinc-950 sm:text-sm/6 dark:text-white forced-colors:text-[CanvasText]',
		'focus:bg-blue-500 focus:text-white hover:bg-blue-500 hover:text-white',
		'data-disabled:opacity-50',
		'forced-color-adjust-none forced-colors:focus:bg-[Highlight] forced-colors:focus:text-[HighlightText] forced-colors:focus:*:data-[slot=icon]:text-[HighlightText]',
		'col-span-full grid grid-cols-[auto_1fr_1.5rem_0.5rem_auto] items-center supports-[grid-template-columns:subgrid]:grid-cols-subgrid',
		'*:data-[slot=icon]:col-start-1 *:data-[slot=icon]:row-start-1 *:data-[slot=icon]:mr-2.5 *:data-[slot=icon]:-ml-0.5 *:data-[slot=icon]:size-5 sm:*:data-[slot=icon]:mr-2 sm:*:data-[slot=icon]:size-4',
		'*:data-[slot=icon]:text-zinc-500 focus:*:data-[slot=icon]:text-white hover:*:data-[slot=icon]:text-white dark:*:data-[slot=icon]:text-zinc-400',
		'*:data-[slot=avatar]:mr-2.5 *:data-[slot=avatar]:-ml-1 *:data-[slot=avatar]:size-6 sm:*:data-[slot=avatar]:mr-2 sm:*:data-[slot=avatar]:size-5',
	)

	if (typeof props.href === 'string') {
		const { disabled, ...linkProps } = props as { href: string; disabled?: boolean } & React.ComponentPropsWithoutRef<typeof Link>

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
					linkProps.onClick?.(e)
				}}
			/>
		)
	}

	const { disabled, onClick, ...buttonProps } = props as { disabled?: boolean; onClick?: () => void } & React.ComponentPropsWithoutRef<'button'>

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
				onClick?.()
			}}
		/>
	)
}

export function DropdownHeader({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div {...props} className={clsx(className, 'col-span-5 px-3.5 pt-2.5 pb-1 sm:px-3')} />
}

export function DropdownSection({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			{...props}
			className={clsx(
				className,
				'col-span-full supports-[grid-template-columns:subgrid]:grid supports-[grid-template-columns:subgrid]:grid-cols-[auto_1fr_1.5rem_0.5rem_auto]',
			)}
		/>
	)
}

export function DropdownHeading({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			{...props}
			className={clsx(
				className,
				'col-span-full grid grid-cols-[1fr_auto] gap-x-12 px-3.5 pt-2 pb-1 text-sm/5 font-medium text-zinc-500 sm:px-3 sm:text-xs/5 dark:text-zinc-400',
			)}
		/>
	)
}

export function DropdownDivider({ className, ...props }: React.ComponentPropsWithoutRef<'hr'>) {
	return (
		<hr
			{...props}
			role="separator"
			className={clsx(
				className,
				'col-span-full mx-3.5 my-1 h-px border-0 bg-zinc-950/5 sm:mx-3 dark:bg-white/10 forced-colors:bg-[CanvasText]',
			)}
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
}: { keys: string | string[]; className?: string } & Omit<React.ComponentPropsWithoutRef<'kbd'>, 'className'>) {
	return (
		<kbd {...props} className={clsx(className, 'col-start-5 row-start-1 flex justify-self-end')}>
			{(Array.isArray(keys) ? keys : keys.split('')).map((char, index) => (
				<kbd
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
