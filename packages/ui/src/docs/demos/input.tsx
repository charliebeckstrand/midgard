import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Forms' }

export default function InputDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { Input } from 'ui/input'

					<Field className="max-w-sm">
						<Label>Name</Label>
						<Input placeholder="Enter text…" />
					</Field>
				`}
			>
				<Field className="max-w-sm">
					<Label htmlFor="input-default">Default</Label>
					<Input id="input-default" placeholder="Enter text…" />
				</Field>
			</Example>
			<Example
				title="Outline"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { Input } from 'ui/input'

					<Field className="max-w-sm">
						<Label>Name</Label>
						<Input variant="outline" placeholder="Enter text…" />
					</Field>
				`}
			>
				<Field className="max-w-sm">
					<Label htmlFor="input-outline">Outline</Label>
					<Input id="input-outline" variant="outline" placeholder="Enter text…" />
				</Field>
			</Example>
			<Example
				title="Disabled"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { Input } from 'ui/input'

					<Field className="max-w-sm">
						<Label htmlFor="input-disabled">Disabled</Label>
						<Input id="input-disabled" disabled placeholder="Disabled" />
					</Field>
				`}
			>
				<Field className="max-w-sm">
					<Label htmlFor="input-disabled">Disabled</Label>
					<Input id="input-disabled" disabled placeholder="Disabled" />
				</Field>
			</Example>
			<Example
				title="Readonly"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { Input } from 'ui/input'

					<Field className="max-w-sm">
						<Label htmlFor="input-readonly">Readonly</Label>
						<Input id="input-readonly" readOnly placeholder="Readonly" />
					</Field>
				`}
			>
				<Field className="max-w-sm">
					<Label>Readonly</Label>
					<Input readOnly placeholder="Readonly" />
				</Field>
			</Example>
			<Example
				title="Invalid"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { Input } from 'ui/input'

					<Field className="max-w-sm">
						<Label htmlFor="input-invalid">Invalid</Label>
						<Input id="input-invalid" data-invalid placeholder="Invalid input" />
					</Field>
				`}
			>
				<Field className="max-w-sm">
					<Label>Invalid</Label>
					<Input data-invalid placeholder="Invalid input" />
				</Field>
			</Example>
		</div>
	)
}
