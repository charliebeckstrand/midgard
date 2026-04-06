import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Example } from '../example'

export const meta = { category: 'Forms' }

export default function InputDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={`import { Field, Label } from 'ui/fieldset'
import { Input } from 'ui/input'

<Field className="max-w-sm">
  <Label>Name</Label>
  <Input placeholder="Enter text…" />
</Field>`}
			>
				<Field className="max-w-sm">
					<Label htmlFor="input-default">Default</Label>
					<Input id="input-default" placeholder="Enter text…" />
				</Field>
			</Example>
			<Example
				title="Outline"
				code={`import { Input } from 'ui/input'

<Input variant="outline" placeholder="Enter text…" />`}
			>
				<Field className="max-w-sm">
					<Label htmlFor="input-outline">Outline</Label>
					<Input id="input-outline" variant="outline" placeholder="Enter text…" />
				</Field>
			</Example>
			<Example
				title="Disabled"
				code={`import { Input } from 'ui/input'

<Input disabled placeholder="Disabled" />`}
			>
				<Field className="max-w-sm">
					<Label htmlFor="input-disabled">Disabled</Label>
					<Input id="input-disabled" disabled placeholder="Disabled" />
				</Field>
			</Example>
			<Example
				title="Readonly"
				code={`import { Input } from 'ui/input'

<Input readOnly placeholder="Readonly" />`}
			>
				<Field className="max-w-sm">
					<Label>Readonly</Label>
					<Input readOnly placeholder="Readonly" />
				</Field>
			</Example>
			<Example
				title="Invalid"
				code={`import { Input } from 'ui/input'

<Input data-invalid placeholder="Invalid input" />`}
			>
				<Field className="max-w-sm">
					<Label>Invalid</Label>
					<Input data-invalid placeholder="Invalid input" />
				</Field>
			</Example>
		</div>
	)
}
