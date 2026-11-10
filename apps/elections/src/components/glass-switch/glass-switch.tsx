'use client'

import { Description, Label } from 'ui/fieldset'
import { useAppearance } from 'ui/providers/appearance'
import { Switch, SwitchField } from 'ui/switch'

/**
 * The Glass surfaces switch of the settings dialog. While it is on, the panel
 * of a result is glass: the page shows through it, with a blur. While it is
 * off, the panel is opaque. The switch writes the Glass setting of
 * `AppearanceProvider`, which has a copy in a cookie. Thus the server paints a
 * panel that is open on a reload with the surface that the reader chose.
 */
export function GlassSwitch() {
	const { glass, setGlass } = useAppearance()

	return (
		<SwitchField>
			<Switch
				checked={glass === 'on'}
				onChange={(event) => setGlass(event.target.checked ? 'on' : 'off')}
			/>
			<Label>Glass surfaces</Label>
			<Description>Show the page through the results panel, with a blur.</Description>
		</SwitchField>
	)
}
