'use client'

import { Search, X } from 'lucide-react'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../button'
import { Dialog, DialogBody, type DialogPanelVariants } from '../dialog'
import { Icon } from '../icon'
import { Input } from '../input'
import { CommandPaletteProvider } from './context'
import { useKeyboard } from './use-keyboard'

export type CommandPaletteProps = Pick<DialogPanelVariants, 'size'> & {
	open: boolean
	onClose: () => void
	placeholder?: string
	icon?: React.ReactNode
	outsideClick?: boolean
	className?: string
	children: React.ReactNode | ((query: string) => React.ReactNode)
}

export function CommandPalette({
	open,
	onClose,
	placeholder = 'Type a command or search',
	icon,
	outsideClick = true,
	size = '2xl',
	className,
	children,
}: CommandPaletteProps) {
	const [query, setQuery] = useState('')

	const inputRef = useRef<HTMLInputElement>(null)

	const { listRef, onKeyDown } = useKeyboard()

	// Reset query when closed
	useEffect(() => {
		if (!open) setQuery('')
	}, [open])

	// Focus input on open
	useEffect(() => {
		if (!open) return

		const timer = setTimeout(() => inputRef.current?.focus(), 0)

		return () => clearTimeout(timer)
	}, [open])

	const rendered = typeof children === 'function' ? children(query) : children

	return (
		<Dialog
			open={open}
			onClose={onClose}
			align="start"
			outsideClick={outsideClick}
			size={size}
			className={className}
		>
			<CommandPaletteProvider value={{ close: onClose, query }}>
				<div className="flex items-center gap-2">
					<Input
						ref={inputRef}
						prefix={icon ?? <Icon icon={<Search />} />}
						role="combobox"
						aria-expanded="true"
						aria-autocomplete="list"
						data-slot="command-palette-input"
						placeholder={placeholder}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={onKeyDown}
					/>
					<Button variant="plain" aria-label="Close" onClick={onClose}>
						<Icon icon={<X />} />
					</Button>
				</div>
				<DialogBody className="mt-2">
					<div ref={listRef} role="listbox" data-slot="command-palette-list">
						{rendered}
					</div>
				</DialogBody>
			</CommandPaletteProvider>
		</Dialog>
	)
}
