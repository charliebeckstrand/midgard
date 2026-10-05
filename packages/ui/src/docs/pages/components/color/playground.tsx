import { ColorPicker, type ColorPickerProps } from 'ui/color'
import { Field, Label } from 'ui/fieldset'

export default function ColorPlayground(props: ColorPickerProps & { format?: 'hex' }) {
	return (
		<Field>
			<Label>Accent color</Label>
			<ColorPicker {...props} defaultValue="#8b5cf6" />
		</Field>
	)
}
