import { ColorPicker } from 'ui/color'
import { Description, Field, Label } from 'ui/fieldset'

const brandColors = ['#0f172a', '#1d4ed8', '#0ea5e9', '#10b981', '#f59e0b', '#e11d48']

export default function CustomSwatches() {
	return (
		<Field>
			<Label>Brand color</Label>
			<Description>Pick one of the brand colors, or enter a hex value.</Description>
			<ColorPicker swatches={brandColors} defaultValue="#1d4ed8" />
		</Field>
	)
}
