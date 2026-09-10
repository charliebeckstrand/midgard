import { describe, expect, it } from 'vitest'
import { Button } from '../../components/button'
import {
	CommandPalette,
	CommandPaletteDescription,
	CommandPaletteGroup,
	CommandPaletteItem,
	CommandPaletteLabel,
} from '../../components/command-palette'
import { Field, Label } from '../../components/fieldset'
import { Listbox, ListboxDescription, ListboxLabel, ListboxOption } from '../../components/listbox'
import {
	Menu,
	MenuContent,
	MenuDescription,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuTrigger,
} from '../../components/menu'
import { type Case, interactive } from '../a11y/cases'
import { noop, present, renderUI, userEvent } from '../helpers'
import { axeGeometry } from './helpers/axe-geometry'

/**
 * Open-state geometry gate (real browser). Drives each `interactive` corpus
 * case open and runs `color-contrast` / `target-size` against the live surface.
 *
 * Select and Listbox are deferred (`GEOMETRY_DEFERRED`): their shared open step
 * resolves the trigger via `getByRole('combobox')`, which is ambiguous against a
 * real DOM (the Select trigger structurally exposes two `role="combobox"` nodes).
 * Driving those popovers open needs a browser-specific helper.
 */
const GEOMETRY_DEFERRED = new Set(['select', 'listbox'])

const interactiveGeometry = interactive.filter(([name]) => !GEOMETRY_DEFERRED.has(name))

describe('a11y geometry (axe): interactive', () => {
	it.each(
		interactiveGeometry,
	)('%s meets contrast and target-size when open', async (_name, element, open) => {
		const user = userEvent.setup()

		renderUI(element)

		await open(user)

		expect(await axeGeometry(document.body)).toHaveNoViolations()
	})
})

/**
 * Item-description ink on the item wash (#592). `hannou.item`'s hover/focus
 * wash and `hannou.active`'s `data-active` wash are the same `bg-zinc-950/5`
 * ground, and every corpus case above renders its popover at rest, so neither
 * wash is painted where a gate can see it — which is why `zinc-500` descriptions
 * sat at 4.34:1 unnoticed.
 *
 * Each case opens declaratively: the ground under test is the wash, not the open
 * transition. The roved state is stamped rather than driven, since `data-active`
 * is an attribute the roving cursor sets — deterministic where a pointer hover is
 * not, and a listbox roves its first option on open anyway.
 *
 * One item per case: a recipe's `description` slot carries no per-item modifier,
 * so a second row would paint the identical class list on the identical ground
 * and cost another full axe pass (each rebuilds the document's flat tree, so
 * scoping a run does not make it cheap).
 */
const ROVED_ITEMS: readonly Case[] = [
	[
		// `kata/option` — the row shared by Listbox / Select / Combobox.
		'listbox option',
		<Field key="rlb">
			<Label>Status</Label>
			<Listbox<string> open nullable displayValue={(value) => value} placeholder="Select status">
				<ListboxOption value="active">
					<ListboxLabel>Active</ListboxLabel>
					<ListboxDescription>Currently moving freight</ListboxDescription>
				</ListboxOption>
			</Listbox>
		</Field>,
	],
	[
		// `kata/menu` — its `group-focus/option:text-white` override covers the
		// focus case only, so a `data-active` row still inks with the muted rung.
		'menu item',
		<Menu key="rmn" defaultOpen>
			<MenuTrigger>
				<Button variant="outline">Options</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuSection>
					<MenuItem>
						<MenuLabel>Edit</MenuLabel>
						<MenuDescription>Change this record</MenuDescription>
					</MenuItem>
				</MenuSection>
			</MenuContent>
		</Menu>,
	],
	[
		// `kata/command-palette` — the same wash. Its `data-active:hover` deepening
		// to `/10` is a stronger ground than this case paints, so the `/5` measured
		// here is the binding one.
		'command palette item',
		<CommandPalette key="rcp" open onOpenChange={noop}>
			<CommandPaletteGroup title="Files">
				<CommandPaletteItem>
					<CommandPaletteLabel>New file</CommandPaletteLabel>
					<CommandPaletteDescription>Start from an empty document</CommandPaletteDescription>
				</CommandPaletteItem>
			</CommandPaletteGroup>
		</CommandPalette>,
	],
]

/** The description slots the three recipes above ink, named exactly rather than matched by suffix. */
const DESCRIPTION_SLOTS = ['listbox-description', 'menu-description', 'command-palette-description']

const DESCRIPTION_SELECTOR = DESCRIPTION_SLOTS.map((slot) => `[data-slot="${slot}"]`).join(',')

/**
 * Scoped to the description slot rather than the document: a palette item's
 * *label* also misses AA on this wash, but by a different mechanism — it carries
 * no ink of its own and inherits `panel.layout.body`'s `text.muted` through
 * `DialogBody`. That is a separate defect in a shared panel slot, out of #592's
 * scope, and asserting the whole document here would couple this regression case
 * to it.
 */
describe('a11y geometry (axe): roved item descriptions', () => {
	it.each(ROVED_ITEMS)('%s description meets contrast while roved', async (_name, element) => {
		renderUI(element)

		const item = present(document.querySelector('[role="option"], [role="menuitem"]'), 'an item')

		item.setAttribute('data-active', 'true')

		const description = present(item.querySelector(DESCRIPTION_SELECTOR), "the item's description")

		expect(await axeGeometry(description)).toHaveNoViolations()
	})
})
