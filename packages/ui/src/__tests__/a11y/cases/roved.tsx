import { Button } from '../../../components/button'
import {
	CommandPalette,
	CommandPaletteDescription,
	CommandPaletteGroup,
	CommandPaletteItem,
	CommandPaletteLabel,
} from '../../../components/command-palette'
import { Field, Label } from '../../../components/fieldset'
import {
	Listbox,
	ListboxDescription,
	ListboxLabel,
	ListboxOption,
} from '../../../components/listbox'
import {
	Menu,
	MenuContent,
	MenuDescription,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuTrigger,
} from '../../../components/menu'
import { noop } from '../../helpers'
import type { RovedCase } from './types'

/**
 * Roved items whose description ink lands on the item wash (#592).
 *
 * `hannou.item`'s hover/focus wash and `hannou.active`'s `data-active` wash are
 * the same `bg-zinc-950/5` ground, and every other corpus case renders its
 * popover at rest — so neither wash is painted where a gate can see it, which is
 * why `zinc-500` descriptions sat at 4.34:1 unnoticed.
 *
 * Each case opens declaratively: the ground under test is the wash, not the open
 * transition. One item per case, because a recipe's `description` slot carries no
 * per-item modifier — a second row would paint the identical class list on the
 * identical ground and cost another full axe pass.
 */
export const roved: readonly RovedCase[] = [
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
		'listbox-description',
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
		'menu-description',
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
		'command-palette-description',
	],
]
