/**
 * What an open command palette pays for a keystroke, and for a render of its
 * parent.
 *
 * The palette holds the search of the Places app: four groups (actions, places,
 * regions, and trips), more than 750 commands, and at most eight results for
 * each group, so a query shows up to 32 rows. Each row of the places and the
 * regions can carry its own menu, which opens on a right-click or a long press
 * over the row. A closed menu renders no panel, but each row pays its shell.
 *
 * The rows read the live query (`useCommandPaletteQuery`), so the commit that
 * the input event drives holds the new rows. An app that reads the deferred
 * query does the same work in a later commit. The filter is a plain
 * `includes` over labels that the module folds once, so the timed region is the
 * work of the palette and its rows, not the work of a sort by score.
 *
 * The keystroke scenario alternates two queries that each fill every group,
 * and that share few rows, so each keystroke mounts and unmounts rows. Read the
 * gap: `plain rows` is the palette, and the step to `rows in menus` is what the
 * menu shells add.
 *
 * The parent scenario renders the palette again with the same query and new
 * command objects, as a parent does when the commands of its groups rebuild.
 * The rows do not change, but each one renders again.
 */

import type { ReactNode } from 'react'
import { flushSync } from 'react-dom'
import {
	CommandPalette,
	CommandPaletteGroup,
	CommandPaletteHeading,
	CommandPaletteItem,
	CommandPaletteLabel,
	CommandPaletteText,
	useCommandPaletteQuery,
} from '../../components/command-palette'
import { ContextMenuList } from '../../components/context-menu'
import { Menu, MenuContent } from '../../components/menu'
import { compareBenches } from '../compare'
import { reactHost, settle, WINDOW } from './harness'

/** One row of the palette. */
type Command = { id: string; label: string; folded: string }

/** One group of the palette. */
type Source = { heading: string; commands: Command[]; menus: boolean }

/** The results that show for each group, at most. */
const LIMIT = 8

/** Syllables that the made-up names join, so that a two-letter query finds many rows in each group. */
const SYLLABLES = ['san', 'ta', 'ri', 'mon', 'el', 'ca', 'po', 'ver', 'la', 'do', 'ne', 'su']

/** A made-up name from three syllables, from a fixed seed. */
function name(seed: number): string {
	const at = (step: number) => SYLLABLES[(seed * 7 + step * 5) % SYLLABLES.length] ?? ''

	const word = `${at(1)}${at(2)}${at(3 + (seed % 3))}`

	return `${word.charAt(0).toUpperCase()}${word.slice(1)} ${seed}`
}

/** The commands of one group, with new objects on each call. */
function commands(prefix: string, count: number, offset: number): Command[] {
	return Array.from({ length: count }, (_, index) => {
		const label = name(index + offset)

		return { id: `${prefix}-${index}`, label, folded: label.toLowerCase() }
	})
}

/** The groups of the palette, with new command objects on each call, as a parent rebuilds them. */
function sources(): Source[] {
	return [
		{ heading: 'Actions', commands: commands('action', 6, 0), menus: false },
		{ heading: 'Places', commands: commands('place', 500, 100), menus: true },
		{ heading: 'Regions', commands: commands('region', 230, 700), menus: true },
		{ heading: 'Trips', commands: commands('trip', 20, 1000), menus: false },
	]
}

/** The menu of a row, as the Places app gives it. */
const MENU = [
	{ label: 'Edit', onAction: () => {} },
	{ label: 'Add visit', onAction: () => {} },
	{ label: 'Delete', onAction: () => {} },
]

/** The groups that match the live query. */
function Results({ groups, menus }: { groups: Source[]; menus: boolean }) {
	const query = useCommandPaletteQuery().query.trim().toLowerCase()

	return groups.map((group) => {
		const matches =
			query === ''
				? []
				: group.commands.filter((command) => command.folded.includes(query)).slice(0, LIMIT)

		if (matches.length === 0) return null

		return (
			<CommandPaletteGroup key={group.heading}>
				<CommandPaletteHeading>{group.heading}</CommandPaletteHeading>

				{matches.map((command) => {
					const item = (
						<CommandPaletteItem key={command.id} id={command.id} onAction={() => {}}>
							<CommandPaletteText>
								<CommandPaletteLabel>{command.label}</CommandPaletteLabel>
							</CommandPaletteText>
						</CommandPaletteItem>
					)

					return menus && group.menus ? (
						<Menu key={command.id}>
							{item}

							<MenuContent aria-label={`Actions for ${command.label}`}>
								<ContextMenuList entries={MENU} />
							</MenuContent>
						</Menu>
					) : (
						item
					)
				})}
			</CommandPaletteGroup>
		)
	})
}

/** The open palette of one row. */
function Palette({ groups, menus }: { groups: Source[]; menus: boolean }): ReactNode {
	return (
		<CommandPalette open onOpenChange={() => {}} triggerShortcut={false}>
			<Results groups={groups} menus={menus} />
		</CommandPalette>
	)
}

/** Two queries that fill each group and share few rows. */
const QUERIES = ['an', 'el'] as const

/** Types `value` into the search field, under `flushSync`, as the browser sends an input event. */
function type(input: HTMLInputElement, value: string) {
	const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set

	flushSync(() => {
		setValue?.call(input, value)

		input.dispatchEvent(new Event('input', { bubbles: true }))
	})
}

/** One open palette for one row, with the first query typed and the panel settled. */
async function openPalette(menus: boolean) {
	const mounted = reactHost()

	const render = () => mounted.render(<Palette groups={sources()} menus={menus} />)

	render()

	await settle(3)

	const input = document.querySelector<HTMLInputElement>(
		'[role="dialog"] input',
	) as HTMLInputElement

	type(input, QUERIES[0])

	await settle(2)

	let flip = false

	return {
		keystroke: () => {
			flip = !flip

			type(input, flip ? QUERIES[1] : QUERIES[0])
		},
		rerender: render,
		rows: () => document.querySelectorAll('[role="dialog"] [role="option"]').length,
		destroy: mounted.destroy,
	}
}

/** The rows of each scenario: the palette, and the palette with a menu on each row. */
const ROWS: [string, boolean][] = [
	['plain rows', false],
	['rows in menus', true],
]

/**
 * Registers one bench for each row. A row opens its palette before its samples
 * and closes it after them, so one palette is open at a time: a palette is
 * modal, and a second one would cover the first one.
 */
function paletteBenches(
	bench: Parameters<Parameters<typeof compareBenches>[1]>[0],
	drive: (palette: Awaited<ReturnType<typeof openPalette>>) => void,
) {
	for (const [name, menus] of ROWS) {
		let palette: Awaited<ReturnType<typeof openPalette>> | undefined

		bench(
			name,
			{
				beforeAll: async () => {
					palette = await openPalette(menus)

					// Sanity, logged once: each query must fill the groups, or the bench
					// scores an empty list.
					console.log(`palette sanity (${name}): ${palette.rows()} rows`)
				},
				afterAll: () => palette?.destroy(),
			},
			() => {
				if (palette) drive(palette)
			},
		)
	}
}

compareBenches(
	`command palette · one keystroke · up to ${LIMIT * 4} rows`,
	(bench) => {
		paletteBenches(bench, (palette) => palette.keystroke())
	},
	WINDOW.slow,
)

compareBenches(
	'command palette · parent render, new commands',
	(bench) => {
		paletteBenches(bench, (palette) => palette.rerender())
	},
	WINDOW.slow,
)
