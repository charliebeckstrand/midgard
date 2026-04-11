'use client'

import { Search } from 'lucide-react'
import { motion } from 'motion/react'
import type React from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '../../core'
import { useIsDesktop } from '../../hooks'
import { Overlay } from '../../primitives'
import { katachi, ugoki } from '../../recipes'
import { Icon } from '../icon'
import { CommandPaletteProvider } from './context'
import { type CommandPalettePanelVariants, commandPalettePanelVariants } from './variants'

const k = katachi.commandPalette

const ITEM_SELECTOR = '[data-slot="command-palette-item"]:not([data-disabled])'

export type CommandPaletteProps = CommandPalettePanelVariants & {
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
	placeholder = 'Type a command or search…',
	icon,
	outsideClick = true,
	size,
	className,
	children,
}: CommandPaletteProps) {
	const isDesktop = useIsDesktop()

	const [query, setQuery] = useState('')

	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)

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

	function getItems(): HTMLElement[] {
		return Array.from(listRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [])
	}

	function setActive(index: number, scroll = true) {
		const items = getItems()

		if (!items.length) return

		const clamped = (index + items.length) % items.length

		for (const [i, el] of items.entries()) {
			if (i === clamped) el.setAttribute('data-active', '')
			else el.removeAttribute('data-active')
		}

		if (scroll) items[clamped]?.scrollIntoView({ block: 'nearest' })
	}

	// Reset active to first item whenever the query changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: DOM-driven
	useLayoutEffect(() => {
		if (!open) return

		setActive(0, false)
	}, [query, open])

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		const items = getItems()

		if (!items.length) return

		const activeIndex = items.findIndex((el) => el.dataset.active !== undefined)
		const current = activeIndex === -1 ? 0 : activeIndex

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				setActive(current + 1)
				break
			case 'ArrowUp':
				e.preventDefault()
				setActive(current - 1)
				break
			case 'Home':
				e.preventDefault()
				setActive(0)
				break
			case 'End':
				e.preventDefault()
				setActive(items.length - 1)
				break
			case 'Enter': {
				e.preventDefault()

				items[current]?.click()
				break
			}
		}
	}

	const rendered = typeof children === 'function' ? children(query) : children

	return (
		<Overlay open={open} onClose={onClose} outsideClick={outsideClick}>
			<div className="pointer-events-none fixed inset-0 flex min-h-full items-end sm:items-start sm:justify-center sm:p-4 sm:pt-[10vh]">
				<motion.div
					{...(isDesktop ? ugoki.popover : ugoki.panel.bottom)}
					role="dialog"
					aria-modal="true"
					data-slot="command-palette"
					className={cn('pointer-events-auto', commandPalettePanelVariants({ size }), className)}
				>
					<CommandPaletteProvider value={{ close: onClose, query }}>
						<div data-slot="command-palette-input-row" className={cn(k.inputRow)}>
							<span className={cn(k.inputIcon)} aria-hidden="true">
								{icon ?? <Icon icon={<Search />} />}
							</span>
							<input
								ref={inputRef}
								type="text"
								role="combobox"
								aria-expanded="true"
								aria-autocomplete="list"
								data-slot="command-palette-input"
								placeholder={placeholder}
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onKeyDown={onKeyDown}
								className={cn(k.input)}
							/>
						</div>
						<div
							ref={listRef}
							role="listbox"
							data-slot="command-palette-list"
							className={cn(k.list)}
						>
							{rendered}
						</div>
					</CommandPaletteProvider>
				</motion.div>
			</div>
		</Overlay>
	)
}
