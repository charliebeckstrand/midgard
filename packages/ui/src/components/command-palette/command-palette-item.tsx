'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/command-palette'
import { Link } from '../link'
import { useCommandPaletteContext } from './context'

type CommandPaletteItemBaseProps = {
	disabled?: boolean
	className?: string
	children?: ReactNode
	onAction?: () => void
	/** Closes the palette after the action. Defaults to true. */
	closeOnAction?: boolean
}

export type CommandPaletteItemProps = CommandPaletteItemBaseProps &
	(
		| ({ href: string } & Omit<
				ComponentPropsWithoutRef<typeof Link>,
				keyof CommandPaletteItemBaseProps
		  >)
		| ({ href?: never } & Omit<
				ComponentPropsWithoutRef<'button'>,
				keyof CommandPaletteItemBaseProps
		  >)
	)

export function CommandPaletteItem(props: CommandPaletteItemProps) {
	const { close } = useCommandPaletteContext()

	const { disabled, className, children, onAction, closeOnAction = true } = props

	function handleSelect() {
		if (disabled) return

		onAction?.()

		if (closeOnAction) close()
	}

	const classes = cn(k.item, className)

	if (props.href !== undefined) {
		const {
			disabled: _disabled,
			className: _className,
			children: _children,
			onAction: _onAction,
			closeOnAction: _closeOnAction,
			...rest
		} = props

		return (
			<Link
				role="option"
				tabIndex={-1}
				data-slot="command-palette-item"
				data-disabled={disabled ? '' : undefined}
				className={classes}
				onClick={handleSelect}
				{...rest}
			>
				{children}
			</Link>
		)
	}

	const {
		disabled: _disabled,
		className: _className,
		children: _children,
		onAction: _onAction,
		closeOnAction: _closeOnAction,
		...rest
	} = props

	return (
		<button
			type="button"
			role="option"
			tabIndex={-1}
			data-slot="command-palette-item"
			data-disabled={disabled ? '' : undefined}
			className={classes}
			onClick={handleSelect}
			{...rest}
		>
			{children}
		</button>
	)
}
