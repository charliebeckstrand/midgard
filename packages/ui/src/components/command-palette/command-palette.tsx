'use client'

import { Search } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'
import {
	defaultKeybindingsHandlerIgnore,
	type KeybindingFilter,
	type KeybindingsMap,
} from 'tinykeys'
import { cn } from '../../core'
import { useControllableFlag } from '../../hooks/use-controllable'
import { useKeybindings } from '../../hooks/use-keybindings'
import { DeferredQueryContext, QueryContext, useQueryValue } from '../../primitives/query'
import { VirtualItemSourceContext } from '../../primitives/virtual-options/context'
import { k } from '../../recipes/kata/command-palette'
import {
	Dialog,
	DialogBody,
	DialogFooter,
	DialogPanel,
	type DialogPanelProps,
	type DialogPanelVariants,
	type DialogProps,
} from '../dialog'
import { Icon } from '../icon'
import { Input } from '../input'
import { CommandPaletteClose } from './command-palette-close'
import { CommandPaletteContext } from './context'
import { useCommandPaletteState } from './use-command-palette-state'

// The filters of the shortcut. Each palette skips a press that an earlier handler
// took, so that one press toggles one palette. A closed palette also skips a
// press in a form field, as the other keybindings do, so the key stays with the
// field. An open palette holds the focus, so it takes the press from its own
// search field and closes.
const IGNORE_TAKEN: KeybindingFilter = (event) => event.defaultPrevented

const IGNORE_TAKEN_OR_FIELD: KeybindingFilter = (event) =>
	event.defaultPrevented || defaultKeybindingsHandlerIgnore(event)

/**
 * Props for {@link CommandPalette}. The open state (`open` or `defaultOpen`) comes
 * from {@link DialogProps}, and `glass` comes from {@link DialogPanelProps}.
 */
export type CommandPaletteProps = Pick<DialogProps, 'open' | 'defaultOpen'> &
	Pick<DialogPanelProps, 'glass'> & {
		/** The maximum width of the panel. @defaultValue '2xl' */
		width?: DialogPanelVariants['width']
		/**
		 * Fires with the open state that the palette asks for: `true` from
		 * `triggerShortcut` while closed, and `false` from `triggerShortcut`, Escape, a
		 * backdrop click, the Close button, or a chosen item while open.
		 */
		onOpenChange?: (open: boolean) => void
		/**
		 * Fires with the id of the option the keyboard highlight sits on, or `null`
		 * when nothing is highlighted.
		 *
		 * Focus stays in the search field and the highlight moves by
		 * `aria-activedescendant`, so the only readout was that attribute. Use it to
		 * preview the highlighted command beside the palette, or to prefetch what it
		 * will need. An arrow key, a filter change that reseats the highlight on the
		 * top result, and the close that clears it all report. On a device with no
		 * hover, a filter change clears the highlight and reports `null`. The id is
		 * the one the option renders with — `getOptionId` mints it for a windowed list.
		 */
		onActiveChange?: (optionId: string | null) => void
		/**
		 * Search-input placeholder text; also names the combobox input and the
		 * listbox via `aria-label`, since the palette has no visible heading.
		 *
		 * @defaultValue 'Type a command or search'
		 */
		placeholder?: string
		/** Close the palette when the backdrop is clicked. @defaultValue true */
		dismissOnBackdrop?: boolean
		/**
		 * Content of the footer row under the results. Set it to replace the
		 * default Close button with your own actions. Put a
		 * {@link CommandPaletteClose} in it to keep the close action. Set `null` to
		 * remove the footer row.
		 *
		 * @defaultValue `<CommandPaletteClose />`
		 */
		footer?: ReactNode
		className?: string
		/**
		 * Global shortcut that toggles the palette; tinykeys syntax, e.g.
		 * `'$mod+KeyK'` (⌘K / Ctrl+K). Array for multiple bindings, `false` to
		 * disable.
		 *
		 * @defaultValue '$mod+KeyK'
		 * @remarks Bound document-wide. A closed palette does not open from a form
		 * field or a contenteditable element, so the key stays with what the reader
		 * types in. An open palette closes from its own search field. One press
		 * toggles one palette: an open palette takes the press first, and a press
		 * that an earlier handler took (`preventDefault`) toggles no palette.
		 */
		triggerShortcut?: string | string[] | false
		/**
		 * Items to render in the palette. Read the deferred query with
		 * {@link useCommandPaletteDeferredQuery}, and filter against it to keep
		 * typing responsive. {@link useCommandPaletteQuery} also gives the live
		 * query, but its consumer renders again for each keystroke. Wrap the filtered items in `VirtualOptions` with
		 * `getOptionId` for large lists: arrow then navigates the full set by
		 * index, reaching items outside the rendered window. Unlike
		 * `Combobox`/`Listbox`, whose panel already carries a fixed max-height,
		 * `DialogBody` sizes to its content. Give `VirtualOptions` a wrapper with
		 * an explicit, definite height (not just `max-height`) and `overflow-y:
		 * auto`, e.g. `<div style={{ height: 320, overflow: 'auto' }}>`.
		 */
		children: ReactNode
	}

const DEFAULT_TRIGGER_SHORTCUT = '$mod+KeyK'

/**
 * Searchable command launcher in a modal dialog; items read the query via
 * {@link useCommandPaletteQuery} for client-side filtering. Drives open state
 * controlled (`open`/`onOpenChange`) or uncontrolled (`defaultOpen`), as
 * {@link Dialog} does. An uncontrolled palette opens from `triggerShortcut` alone.
 *
 * @remarks Focus moves into the search input on open via the Dialog
 * `initialFocus`. Arrow keys drive a virtual roving highlight via
 * `aria-activedescendant` while focus stays on the input. A filter change
 * moves the highlight to the top result, so Enter runs it. On a device with no
 * hover, such as a phone, a filter change clears the highlight, and only an
 * arrow key sets it. The listbox owns only options (`aria-required-children`),
 * so the no-results message lives in a sibling live `<output>` that announces
 * when the filtered set empties. A
 * `VirtualOptions` inside `children` registers its windowed item source
 * automatically, so the highlight reaches items outside the rendered window.
 * Roving type-ahead stays off: the search input owns every printable key.
 */
export function CommandPalette({
	open: openProp,
	defaultOpen,
	onOpenChange,
	glass,
	onActiveChange,
	placeholder = 'Type a command or search',
	dismissOnBackdrop = true,
	footer,
	width = '2xl',
	className,
	triggerShortcut = DEFAULT_TRIGGER_SHORTCUT,
	children,
}: CommandPaletteProps) {
	// Controlled when `open` is passed; otherwise uncontrolled from `defaultOpen`,
	// as in Dialog. The shortcut, the items, and the dialog share this one setter.
	const [open, setOpen] = useControllableFlag({
		value: openProp,
		defaultValue: defaultOpen,
		onValueChange: onOpenChange,
	})

	const {
		query,
		deferredQuery,
		setQuery,
		listboxId,
		inputRef,
		listRef,
		onKeyDown,
		context,
		virtualSourceRef,
	} = useCommandPaletteState({ open, onOpenChange: setOpen, onActiveChange })

	const triggerBindings = useMemo<KeybindingsMap>(() => {
		if (triggerShortcut === false) return {}

		const keys = Array.isArray(triggerShortcut) ? triggerShortcut : [triggerShortcut]

		const toggle = (event: KeyboardEvent) => {
			event.preventDefault()

			setOpen(!open)
		}

		return Object.fromEntries(keys.map((key) => [key, toggle]))
	}, [triggerShortcut, open, setOpen])

	// An open palette listens in the capture phase, so it takes the press before
	// a closed palette on the page can open over it.
	useKeybindings(triggerBindings, {
		ignore: open ? IGNORE_TAKEN : IGNORE_TAKEN_OR_FIELD,
		capture: open,
	})

	const queryValue = useQueryValue(query, deferredQuery)

	// `undefined` takes the default Close button; `null` or `false` removes the row.
	const footerContent = footer === undefined ? <CommandPaletteClose /> : footer

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogPanel
				align="top"
				dismissOnBackdrop={dismissOnBackdrop}
				width={width}
				glass={glass}
				className={className}
				initialFocus={inputRef}
				// Names the dialog directly; the palette has no visible heading.
				aria-label="Command palette"
				// The palette renders its own footer from `footer`, inside the query
				// context, so the dialog adds none.
				footer={null}
			>
				<CommandPaletteContext value={context}>
					<QueryContext value={queryValue}>
						{/* A filtering consumer reads the deferred query alone, so a keystroke
					    renders it one time and not also on the pass of the live query. */}
						<DeferredQueryContext value={deferredQuery}>
							<Input
								ref={inputRef}
								prefix={<Icon icon={<Search />} />}
								role="combobox"
								aria-label={placeholder}
								aria-expanded={open}
								aria-haspopup="listbox"
								aria-controls={listboxId}
								aria-autocomplete="list"
								data-slot="command-palette-input"
								placeholder={placeholder}
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								onKeyDown={onKeyDown}
							/>
							<DialogBody>
								<div
									ref={listRef}
									id={listboxId}
									role="listbox"
									aria-label={placeholder}
									data-slot="command-palette-list"
									className={cn(k.list)}
								>
									<VirtualItemSourceContext value={virtualSourceRef}>
										{children}
									</VirtualItemSourceContext>
								</div>
								{/* The listbox owns only options (`aria-required-children`). The
					    no-results status is a sibling `<output>` that announces when the
					    listbox filters down to empty. */}
								<output data-slot="command-palette-no-results" className={cn(k.empty)}>
									No results
								</output>
							</DialogBody>
							{footerContent === null || footerContent === false ? null : (
								<DialogFooter data-slot="command-palette-footer">{footerContent}</DialogFooter>
							)}
						</DeferredQueryContext>
					</QueryContext>
				</CommandPaletteContext>
			</DialogPanel>
		</Dialog>
	)
}
