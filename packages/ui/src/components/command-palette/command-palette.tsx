'use client'

import { Search, X } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'
import type { KeybindingsMap } from 'tinykeys'
import { cn } from '../../core'
import { useKeybindings } from '../../hooks/use-keybindings'
import { QueryContext, useQueryValue } from '../../primitives/query'
import { k } from '../../recipes/kata/command-palette'
import { Button } from '../button'
import { Dialog, DialogBody, type DialogPanelVariants } from '../dialog'
import { Flex } from '../flex'
import { Icon } from '../icon'
import { Input } from '../input'
import { CommandPaletteContext } from './context'
import { useCommandPaletteState } from './use-command-palette-state'

// Stable filter for `useKeybindings`; the shortcut fires even inside form fields.
const IGNORE_NOTHING = () => false

/** Props for {@link CommandPalette}; inherits the Dialog `size` variant. */
export type CommandPaletteProps = Pick<DialogPanelVariants, 'size'> & {
	open: boolean
	onOpenChange: (open: boolean) => void
	/**
	 * Search-input placeholder text; also names the combobox input and the
	 * listbox via `aria-label`, since the palette has no visible heading.
	 *
	 * @defaultValue 'Type a command or search'
	 */
	placeholder?: string
	icon?: ReactNode
	/** Close the palette when the backdrop is clicked. @defaultValue true */
	dismissOnBackdrop?: boolean
	className?: string
	/**
	 * Global shortcut that toggles the palette; tinykeys syntax, e.g.
	 * `'$mod+KeyK'` (⌘K / Ctrl+K). Array for multiple bindings, `false` to
	 * disable.
	 *
	 * @defaultValue '$mod+KeyK'
	 * @remarks Bound document-wide and fires even while focus is inside a form
	 * field, so the palette opens regardless of where the user is typing.
	 */
	triggerShortcut?: string | string[] | false
	/**
	 * Items to render in the palette. Read the live and deferred query with
	 * {@link useCommandPaletteQuery}; filter against `deferredQuery` to keep
	 * typing responsive. CommandPalette does not virtualize; keep the rendered
	 * set to a few hundred items, or wrap children in your own windowed renderer
	 * for larger sets.
	 */
	children: ReactNode
}

const DEFAULT_TRIGGER_SHORTCUT = '$mod+KeyK'

/**
 * Searchable command launcher in a modal dialog; items read the query via
 * {@link useCommandPaletteQuery} for client-side filtering.
 *
 * @remarks Focus moves into the search input on open via the Dialog
 * `initialFocus`; arrow keys drive a virtual roving highlight via
 * `aria-activedescendant` while focus stays on the input. The listbox owns only
 * options (`aria-required-children`), so the no-results message lives in a
 * sibling live `<output>` that announces when the filtered set empties.
 */
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

	useKeybindings(triggerBindings, { ignore: IGNORE_NOTHING })

	const queryValue = useQueryValue(query, deferredQuery)

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
			placement="top"
			dismissOnBackdrop={dismissOnBackdrop}
			size={size}
			className={className}
			initialFocus={inputRef}
			// Names the dialog directly; the palette has no visible heading.
			aria-label="Command palette"
		>
			<CommandPaletteContext value={context}>
				<QueryContext value={queryValue}>
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
							className={cn(k.list)}
						>
							{children}
						</div>
						{/* The listbox owns only options (`aria-required-children`). The
					    no-results status is a sibling `<output>` that announces when the
					    listbox filters down to empty. */}
						<output data-slot="command-palette-no-results" className={cn(k.empty)}>
							No results
						</output>
					</DialogBody>
				</QueryContext>
			</CommandPaletteContext>
		</Dialog>
	)
}
