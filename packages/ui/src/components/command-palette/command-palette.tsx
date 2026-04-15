'use client'

import { Search, X } from 'lucide-react'
import type React from 'react'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import { useRovingActive } from '../../hooks/use-keyboard'
import { Button } from '../button'
import { Dialog, DialogBody, type DialogPanelVariants } from '../dialog'
import { Flex } from '../flex'
import { Icon } from '../icon'
import { Input } from '../input'
import { CommandPaletteProvider } from './context'

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

	const listboxId = useId()

	const inputRef = useRef<HTMLInputElement>(null)

	const { listRef, onKeyDown } = useRovingActive<HTMLDivElement>({
		itemSelector: '[data-slot="command-palette-item"]:not([data-disabled])',
	})

	// Reset query when closed (adjust during render to avoid extra cycle)
	const prevOpenRef = useRef(open)

	if (open !== prevOpenRef.current) {
		prevOpenRef.current = open

		if (!open) setQuery('')
	}

	// Focus input on open
	useLayoutEffect(() => {
		if (open) inputRef.current?.focus()
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
				<Flex gap={2}>
					<Input
						ref={inputRef}
						prefix={icon ?? <Icon icon={<Search />} />}
						role="combobox"
						aria-expanded={true}
						aria-haspopup="listbox"
						aria-controls={listboxId}
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
				</Flex>
				<DialogBody className="mt-2">
					<div ref={listRef} id={listboxId} role="listbox" data-slot="command-palette-list">
						{rendered}
					</div>
				</DialogBody>
			</CommandPaletteProvider>
		</Dialog>
	)
}
