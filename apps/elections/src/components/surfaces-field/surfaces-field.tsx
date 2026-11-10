'use client'

import { Field, Label } from 'ui/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { type SurfaceMode, useAppearance } from 'ui/providers/appearance'

/** The options of the field, in the order of the list. */
const OPTIONS: readonly { value: SurfaceMode; label: string }[] = [
	{ value: 'glass', label: 'Glass' },
	{ value: 'solid', label: 'Solid' },
]

/** The label of `value`. */
function labelFor(value: SurfaceMode): string {
	return OPTIONS.find((option) => option.value === value)?.label ?? value
}

/**
 * The Surfaces field of the settings dialog, a Listbox in the form of the
 * appearance pickers above it. With `Glass`, the panel of a result is glass:
 * the page shows through it, with a blur. With `Solid`, the panel is opaque.
 * The field writes the Surfaces setting of `AppearanceProvider`, which has a
 * copy in a cookie. Thus the server paints a panel that is open on a reload
 * with the surface that the reader chose.
 */
export function SurfacesField() {
	const { surfaces, setSurfaces } = useAppearance()

	return (
		<Field>
			<Label>Surfaces</Label>
			<Listbox<SurfaceMode>
				value={surfaces}
				displayValue={labelFor}
				placement="bottom-start"
				onValueChange={(next) => next && setSurfaces(next)}
			>
				{OPTIONS.map((option) => (
					<ListboxOption key={option.value} value={option.value}>
						<ListboxLabel>{option.label}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		</Field>
	)
}
