'use client'

import { Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../button'
import { Dialog, DialogBody, type DialogPanelVariants } from '../dialog'
import { Flex } from '../flex'
import { Icon } from '../icon'
import { Input } from '../input'
import { CommandPaletteProvider } from './context'
import { useCommandPaletteState } from './use-command-palette-state'

export type CommandPaletteProps = Pick<DialogPanelVariants, 'size'> & {
	open: boolean
	onOpenChange: (open: boolean) => void
	placeholder?: string
	icon?: ReactNode
	dismissOnBackdrop?: boolean
	className?: string
	/**
	 * Items to render in the palette. Pass a function to receive the live query
	 * string and filter inline. CommandPalette does not virtualize its result
	 * list — keep the rendered set to a few hundred items at most, or wrap the
	 * children in your own windowed renderer for larger result sets.
	 */
	children: ReactNode | ((query: string) => ReactNode)
}

/** Searchable command launcher in a modal dialog — children receive the live query for client-side filtering. */
export function CommandPalette({
	open,
	onOpenChange,
	placeholder = 'Type a command or search',
	icon,
	dismissOnBackdrop = true,
	size = '2xl',
	className,
	children,
}: CommandPaletteProps) {
	const { query, setQuery, listboxId, inputRef, listRef, onKeyDown, close, context } =
		useCommandPaletteState({ open, onOpenChange })

	const rendered = typeof children === 'function' ? children(query) : children

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
			align="start"
			dismissOnBackdrop={dismissOnBackdrop}
			size={size}
			className={className}
		>
			<CommandPaletteProvider value={context}>
				<Flex gap="sm">
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
