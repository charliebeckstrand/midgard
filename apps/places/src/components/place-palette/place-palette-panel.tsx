'use client'

import { type PointerEvent, useId, useRef } from 'react'
import {
	CommandPalette,
	CommandPaletteDescription,
	CommandPaletteGroup,
	CommandPaletteHeading,
	CommandPaletteItem,
	CommandPaletteLabel,
	CommandPaletteText,
	useCommandPaletteDeferredQuery,
} from 'ui/command-palette'
import type { ContextMenuEntry } from 'ui/context-menu'
import { useTimeout } from 'ui/hooks'
import {
	matchCommands,
	type PaletteCommand,
	type PaletteSource,
} from '../../utilities/places-palette'
import { PlaceMenu } from '../place-menu'

/**
 * How long, in milliseconds, the highlight must stay on a row before the
 * palette calls its `preload`. A reader who moves through the list with the
 * arrow keys passes each row in less time, so only the row that they stop on
 * starts work.
 */
const PRELOAD_DWELL_MS = 150

/** Props for {@link PlacePalettePanel}. */
export type PlacePalettePanelProps = {
	/** The groups, in the order that they show. */
	sources: readonly PaletteSource[]
	open: boolean
	onOpenChange: (open: boolean) => void
}

/**
 * The option id of a command. It holds the indexes of the source and of the
 * command, so the palette can read the command back from an id.
 */
function optionId(prefix: string, source: number, command: number): string {
	return `${prefix}${source}-${command}`
}

/**
 * The rows of a command menu, each of which closes the palette before it acts.
 * A row opens a panel or a confirmation, which the open palette would cover.
 */
function closingEntries(entries: ContextMenuEntry[], close: () => void): ContextMenuEntry[] {
	return entries.map((entry) =>
		'onAction' in entry
			? {
					...entry,
					onAction: () => {
						close()

						entry.onAction?.()
					},
				}
			: entry,
	)
}

/** The groups that match the query. Only this part renders again on a keystroke. */
function PaletteGroups({
	sources,
	prefix,
	close,
}: {
	sources: readonly PaletteSource[]
	prefix: string
	close: () => void
}) {
	const query = useCommandPaletteDeferredQuery()

	return sources.map((source, sourceIndex) => {
		const matches = matchCommands(source, query)

		if (matches.length === 0) return null

		return (
			<CommandPaletteGroup key={source.heading}>
				<CommandPaletteHeading>{source.heading}</CommandPaletteHeading>

				{matches.map((command) => {
					const item = (
						<CommandPaletteItem
							key={command.id}
							id={optionId(prefix, sourceIndex, source.commands.indexOf(command))}
							onAction={command.run}
						>
							{command.icon}
							<CommandPaletteText>
								<CommandPaletteLabel>{command.label}</CommandPaletteLabel>
								{command.description === undefined ? null : (
									<CommandPaletteDescription>{command.description}</CommandPaletteDescription>
								)}
							</CommandPaletteText>
						</CommandPaletteItem>
					)

					return command.menu === undefined ? (
						item
					) : (
						<PlaceMenu
							key={command.id}
							items={closingEntries(command.menu, close)}
							aria-label={`Actions for ${command.label}`}
						>
							{item}
						</PlaceMenu>
					)
				})}
			</CommandPaletteGroup>
		)
	})
}

/**
 * The command palette of the search, over the sources that it gets. The palette
 * knows nothing of places. Each source gives its commands, and a pick runs the
 * command. `PlacePalette` loads this module on the first open, and the open
 * state is its own.
 *
 * ⌘K or Ctrl+K toggles the palette. The page does not show the shortcut.
 *
 * A row is active when the pointer is on it, or when the arrow keys highlight
 * it. On a device with hover, a filter change also makes the top result active.
 * When a row stays active for {@link PRELOAD_DWELL_MS}, the palette calls the
 * `preload` of its command, if it has one.
 */
export function PlacePalettePanel({ sources, open, onOpenChange }: PlacePalettePanelProps) {
	const prefix = `${useId()}-command-`

	const dwell = useTimeout()

	const commandOf = (id: string | null): PaletteCommand | undefined => {
		if (id === null || !id.startsWith(prefix)) return undefined

		const [source, command] = id.slice(prefix.length).split('-').map(Number)

		return sources[source ?? -1]?.commands[command ?? -1]
	}

	// The id of the active row, and the timer that waits for it to stay.
	const active = useRef<string | null>(null)

	const activate = (id: string | null) => {
		if (id === active.current) return

		active.current = id

		dwell.clear()

		const preload = commandOf(id)?.preload

		if (preload !== undefined) dwell.set(preload, PRELOAD_DWELL_MS)
	}

	const optionOf = (target: EventTarget | null): string | null =>
		target instanceof Element ? (target.closest('[role=option]')?.id ?? null) : null

	// The pointer. The palette is in a portal, and React sends the events of a
	// portal to its React parents, so this wrapper gets them.
	const onPointerOver = (event: PointerEvent) => activate(optionOf(event.target))

	const onPointerOut = (event: PointerEvent) => activate(optionOf(event.relatedTarget))

	return (
		<div className="contents" onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
			<CommandPalette
				open={open}
				onOpenChange={onOpenChange}
				onActiveChange={activate}
				placeholder="Search places, countries, and actions"
			>
				<PaletteGroups sources={sources} prefix={prefix} close={() => onOpenChange(false)} />
			</CommandPalette>
		</div>
	)
}
