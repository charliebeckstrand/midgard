import { Control, type ControlProps } from 'ui/control'
import { Label } from 'ui/fieldset'
import { Input } from 'ui/input'

export default function ControlPlayground(props: ControlProps) {
	return (
		<Control {...props}>
			<Label>Email</Label>
			<Input type="email" defaultValue="jane@example.com" />
		</Control>
	)
}
