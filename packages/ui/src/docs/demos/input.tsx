import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
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
				title="Sizes"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { Input } from 'ui/input'

					<Field className="max-w-sm">
						<Label>Small</Label>
						<Input size="sm" placeholder="Small input" />
					</Field>
					<Field className="max-w-sm">
						<Label>Medium</Label>
						<Input size="md" placeholder="Medium input" />
					</Field>
					<Field className="max-w-sm">
						<Label>Large</Label>
						<Input size="lg" placeholder="Large input" />
					</Field>
				`}
			>
				<div className="flex max-w-sm flex-col gap-4">
					<Field>
						<Label>Small</Label>
						<Input size="sm" placeholder="Small input" />
					</Field>
					<Field>
						<Label>Medium</Label>
						<Input size="md" placeholder="Medium input" />
					</Field>
					<Field>
						<Label>Large</Label>
						<Input size="lg" placeholder="Large input" />
					</Field>
				</div>
			</Example>
			<Example
				title="Prefix"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { Icon } from 'ui/icon'
					import { Input } from 'ui/input'

					<Input prefix={<Icon name="search" />} placeholder="Search" />
					<Input prefix={<Icon name="lock" />} placeholder="Password" />
					<Input prefix={<Icon name="hash" />} placeholder="Channel name" />
				`}
			>
				<div className="flex max-w-sm flex-col gap-4">
					<Input prefix={<Icon name="search" />} placeholder="Search" />
					<Input prefix={<Icon name="lock" />} placeholder="Password" />
					<Input prefix={<Icon name="hash" />} placeholder="Channel name" />
				</div>
			</Example>
			<Example
				title="Suffix"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { Icon } from 'ui/icon'
					import { Input } from 'ui/input'

					<Input suffix={<Icon name="check" />} placeholder="Verified" />
					<Input suffix={<Icon name="share" />} placeholder="Share" />
				`}
			>
				<div className="flex max-w-sm flex-col gap-4">
					<Input suffix={<Icon name="check" />} placeholder="Verified" />
					<Input suffix={<Icon name="share" />} placeholder="Share" />
				</div>
			</Example>
			<Example
				title="Prefix and suffix"
				code={code`
					import { Icon } from 'ui/icon'
					import { Input } from 'ui/input'

					<Input
						size="sm"
						prefix={<Icon name="search" />}
						suffix={<Icon name="command" />}
						placeholder="Small"
					/>
					<Input
						size="md"
						prefix={<Icon name="search" />}
						suffix={<Icon name="command" />}
						placeholder="Medium"
					/>
					<Input
						size="lg"
						prefix={<Icon name="search" />}
						suffix={<Icon name="command" />}
						placeholder="Large"
					/>
				`}
			>
				<div className="flex max-w-sm flex-col gap-4">
					<Input
						size="sm"
						prefix={<Icon name="search" />}
						suffix={<Icon name="command" />}
						placeholder="Small"
					/>
					<Input
						size="md"
						prefix={<Icon name="search" />}
						suffix={<Icon name="command" />}
						placeholder="Medium"
					/>
					<Input
						size="lg"
						prefix={<Icon name="search" />}
						suffix={<Icon name="command" />}
						placeholder="Large"
					/>
				</div>
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
