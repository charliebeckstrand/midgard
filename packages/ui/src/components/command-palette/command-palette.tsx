'use client'

import { Search, X } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'
import type { KeybindingsMap } from 'tinykeys'
import { useKeybindings } from '../../hooks/use-keybindings'
import { Button } from '../button'
import { Dialog, DialogBody, type DialogPanelVariants } from '../dialog'
import { Flex } from '../flex'
import { Icon } from '../icon'
import { Input } from '../input'
import { CommandPaletteContext } from './context'
import { useCommandPaletteState } from './use-command-palette-state'

export type CommandPaletteProps = Pick<DialogPanelVariants, 'size'> & {
	open: boolean
	onOpenChange: (open: boolean) => void
	placeholder?: string
	icon?: ReactNode
	dismissOnBackdrop?: boolean
	className?: string
	/**
	 * Global shortcut that toggles the palette — tinykeys syntax, e.g.
	 * `'$mod+KeyK'` (⌘K / Ctrl+K). Array for multiple bindings, `false` to
	 * disable. @default '$mod+KeyK'
	 */
	triggerShortcut?: string | string[] | false
	/**
	 * Items to render in the palette. Pass a function to receive the live query
	 * and a deferred copy; filter against `deferredQuery` to keep typing
	 * responsive. CommandPalette does not virtualize — keep the rendered set to
	 * a few hundred items, or wrap children in your own windowed renderer for
	 * larger sets.
	 */
	children: ReactNode | ((query: string, deferredQuery: string) => ReactNode)
}

const DEFAULT_TRIGGER_SHORTCUT = '$mod+KeyK'

/** Searchable command launcher in a modal dialog — children receive the live query for client-side filtering. */
export function CommandPalette({
	open,
	onOpenChange,
	placeholder = 'Type a command or search',
	icon,
	dismissOnBackdrop = true,
	size = '2xl',
	className,
	triggerShortcut = DEFAULT_TRIGGER_SHORTCUT,
	children,
}: CommandPaletteProps) {
	const {
		query,
		deferredQuery,
		setQuery,
		listboxId,
		inputRef,
		listRef,
		onKeyDown,
		close,
		context,
	} = useCommandPaletteState({ open, onOpenChange })

	const triggerBindings = useMemo<KeybindingsMap>(() => {
		if (triggerShortcut === false) return {}

		const keys = Array.isArray(triggerShortcut) ? triggerShortcut : [triggerShortcut]

		const toggle = (e: KeyboardEvent) => {
			e.preventDefault()

			onOpenChange(!open)
		}

		return Object.fromEntries(keys.map((key) => [key, toggle]))
	}, [triggerShortcut, open, onOpenChange])

	// Fire even inside form fields so the shortcut works from any focused input.
	useKeybindings(triggerBindings, { ignore: () => false })

	const rendered = typeof children === 'function' ? children(query, deferredQuery) : children

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
			align="start"
			dismissOnBackdrop={dismissOnBackdrop}
			size={size}
			className={className}
			initialFocus={inputRef}
		>
			<CommandPaletteContext value={context}>
				<Flex gap="sm">
					<Input
						ref={inputRef}
						prefix={icon ?? <Icon icon={<Search />} />}
						role="combobox"
						aria-label={placeholder}
						aria-expanded={open}
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
					<div
						ref={listRef}
						id={listboxId}
						role="listbox"
						aria-label={placeholder}
						data-slot="command-palette-list"
					>
						{rendered}
					</div>
				</DialogBody>
			</CommandPaletteContext>
		</Dialog>
	)
}
