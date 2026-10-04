'use client'

import { Search } from 'lucide-react'
import { type PointerEvent, useId, useRef, useState } from 'react'
import { Button } from 'ui/button'
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
import { useTimeout } from 'ui/hooks'
import { Icon } from 'ui/icon'
import {
	matchCommands,
	type PaletteCommand,
	type PaletteSource,
} from '../../utilities/places-palette'

/**
 * How long, in milliseconds, the highlight must stay on a row before the
 * palette calls its `preload`. A reader who moves through the list with the
 * arrow keys passes each row in less time, so only the row that they stop on
 * starts work.
 */
const PRELOAD_DWELL_MS = 150

/** Props for {@link PlacePalette}. */
export type PlacePaletteProps = {
	/** The groups, in the order that they show. */
	sources: readonly PaletteSource[]
	/** Whether the palette can open. Until it can, the button is disabled and the shortcut does nothing. */
	ready: boolean
}

/**
 * The option id of a command. It holds the indexes of the source and of the
 * command, so the palette can read the command back from an id.
 */
function optionId(prefix: string, source: number, command: number): string {
	return `${prefix}${source}-${command}`
}

/** The groups that match the query. Only this part renders again on a keystroke. */
function PaletteGroups({ sources, prefix }: { sources: readonly PaletteSource[]; prefix: string }) {
	const query = useCommandPaletteDeferredQuery()

	return sources.map((source, sourceIndex) => {
		const matches = matchCommands(source, query)

		if (matches.length === 0) return null

		return (
			<CommandPaletteGroup key={source.heading}>
				<CommandPaletteHeading>{source.heading}</CommandPaletteHeading>

				{matches.map((command) => (
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
				))}
			</CommandPaletteGroup>
		)
	})
}

/**
 * The search of the app: an icon button that opens a command palette over the
 * sources that it gets. The palette knows nothing of places. Each source gives
 * its commands, and a pick runs the command.
 *
 * ⌘K or Ctrl+K also opens the palette. The page does not show the shortcut.
 *
 * A row is active when the pointer is on it, or when the arrow keys highlight
 * it. On a device with hover, a filter change also makes the top result active.
 * When a row stays active for {@link PRELOAD_DWELL_MS}, the palette calls the
 * `preload` of its command, if it has one.
 */
export function PlacePalette({ sources, ready }: PlacePaletteProps) {
	const [open, setOpen] = useState(false)

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
			<Button variant="plain" aria-label="Search" disabled={!ready} onClick={() => setOpen(true)}>
				<Icon icon={<Search />} />
			</Button>

			<CommandPalette
				open={open}
				onOpenChange={setOpen}
				onActiveChange={activate}
				placeholder="Search places, countries, and actions"
				triggerShortcut={ready ? undefined : false}
			>
				<PaletteGroups sources={sources} prefix={prefix} />
			</CommandPalette>
		</div>
	)
}
