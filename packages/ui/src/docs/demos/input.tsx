import { Check, Command, Hash, Lock, Search, Share } from 'lucide-react'
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
						<Input placeholder="Enter text" />
					</Field>
				`}
			>
				<Field className="max-w-sm">
					<Label htmlFor="input-default">Default</Label>
					<Input id="input-default" placeholder="Enter text" />
				</Field>
			</Example>
			<Example
				title="Outline"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { Input } from 'ui/input'

					<Field className="max-w-sm">
						<Label>Name</Label>
						<Input variant="outline" placeholder="Enter text" />
					</Field>
				`}
			>
				<Field className="max-w-sm">
					<Label htmlFor="input-outline">Outline</Label>
					<Input id="input-outline" variant="outline" placeholder="Enter text" />
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
				<div className="flex flex-col gap-4">
					<div className="flex max-w-xs flex-col gap-4">
						<Field>
							<Label>Small</Label>
							<Input size="sm" placeholder="Small input" />
						</Field>
					</div>
					<div className="flex max-w-sm flex-col gap-4">
						<Field>
							<Label>Medium</Label>
							<Input size="md" placeholder="Medium input" />
						</Field>
					</div>
					<div className="flex max-w-md flex-col gap-4">
						<Field>
							<Label>Large</Label>
							<Input size="lg" placeholder="Large input" />
						</Field>
					</div>
				</div>
			</Example>
			<Example
				title="Prefix"
				code={code`
					import { Search, Lock, Hash } from 'lucide-react'
					import { Icon } from 'ui/icon'
					import { Input } from 'ui/input'

					<Input prefix={<Icon icon={<Search />} />} placeholder="Search" />
					<Input prefix={<Icon icon={<Lock />} />} placeholder="Password" />
					<Input prefix={<Icon icon={<Hash />} />} placeholder="Channel name" />
				`}
			>
				<div className="flex max-w-sm flex-col gap-4">
					<Input prefix={<Icon icon={<Search />} />} placeholder="Search" />
					<Input prefix={<Icon icon={<Lock />} />} placeholder="Password" />
					<Input prefix={<Icon icon={<Hash />} />} placeholder="Channel name" />
				</div>
			</Example>
			<Example
				title="Suffix"
				code={code`
					import { Check, Share } from 'lucide-react'
					import { Icon } from 'ui/icon'
					import { Input } from 'ui/input'

					<Input suffix={<Icon icon={<Check />} />} placeholder="Verified" />
					<Input suffix={<Icon icon={<Share />} />} placeholder="Share" />
				`}
			>
				<div className="flex max-w-sm flex-col gap-4">
					<Input suffix={<Icon icon={<Check />} />} placeholder="Verified" />
					<Input suffix={<Icon icon={<Share />} />} placeholder="Share" />
				</div>
			</Example>
			<Example
				title="Prefix and suffix"
				code={code`
					import { Search, Command } from 'lucide-react'
					import { Icon } from 'ui/icon'
					import { Input } from 'ui/input'

					<Input
						size="sm"
						prefix={<Icon icon={<Search />} />}
						suffix={<Icon icon={<Command />} />}
						placeholder="Small"
					/>
				`}
			>
				<div className="flex flex-col gap-4">
					<div className="flex max-w-xs flex-col gap-4">
						<Input
							size="sm"
							prefix={<Icon icon={<Search />} />}
							suffix={<Icon icon={<Command />} />}
							placeholder="Small"
						/>
					</div>
					<div className="flex max-w-sm flex-col gap-4">
						<Input
							size="md"
							prefix={<Icon icon={<Search />} />}
							suffix={<Icon icon={<Command />} />}
							placeholder="Medium"
						/>
					</div>
					<div className="flex max-w-md flex-col gap-4">
						<Input
							size="lg"
							prefix={<Icon icon={<Search />} />}
							suffix={<Icon icon={<Command />} />}
							placeholder="Large"
						/>
					</div>
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
