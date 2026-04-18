'use client'

import { Search, X } from 'lucide-react'
import type React from 'react'
import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRoving } from '../../hooks/use-keyboard'
import { Button } from '../button'
import { Dialog, DialogBody, type DialogPanelVariants } from '../dialog'
import { Flex } from '../flex'
import { Icon } from '../icon'
import { Input } from '../input'
import { CommandPaletteProvider } from './context'

export type CommandPaletteProps = Pick<DialogPanelVariants, 'size'> & {
	open: boolean
	onOpenChange: (open: boolean) => void
	placeholder?: string
	icon?: React.ReactNode
	outsideClick?: boolean
	className?: string
	children: React.ReactNode | ((query: string) => React.ReactNode)
}

export function CommandPalette({
	open,
	onOpenChange,
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

	const listRef = useRef<HTMLDivElement>(null)

	const onKeyDown = useRoving(listRef, {
		mode: 'virtual',
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

	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	const ctx = useMemo(() => ({ close, query }), [close, query])

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
			align="start"
			outsideClick={outsideClick}
			size={size}
			className={className}
		>
			<CommandPaletteProvider value={ctx}>
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
					<Button variant="plain" aria-label="Close" onClick={close}>
						<Icon icon={<X />} />
					</Button>
				</Flex>
				<DialogBody>
					<div ref={listRef} id={listboxId} role="listbox" data-slot="command-palette-list">
						{rendered}
					</div>
				</DialogBody>
			</CommandPaletteProvider>
		</Dialog>
	)
}
