import { Check, Command, Hash, Lock, Search, Share } from 'lucide-react'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { Input } from '../../components/input'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function InputDemo() {
	return (
		<div className="space-y-8">
			<Example title="Default">
				<Field className="lg:max-w-sm">
					<Label htmlFor="input-default">Default</Label>
					<Input id="input-default" placeholder="Enter text" />
				</Field>
			</Example>
			<Example title="Outline">
				<Field className="lg:max-w-sm">
					<Label htmlFor="input-outline">Outline</Label>
					<Input id="input-outline" variant="outline" placeholder="Enter text" />
				</Field>
			</Example>
			<Example title="Sizes">
				<div className="flex flex-col gap-4">
					<div className="flex lg:max-w-xs flex-col gap-4">
						<Field>
							<Label>Small</Label>
							<Input size="sm" placeholder="Small input" />
						</Field>
					</div>
					<div className="flex lg:max-w-sm flex-col gap-4">
						<Field>
							<Label>Medium</Label>
							<Input size="md" placeholder="Medium input" />
						</Field>
					</div>
					<div className="flex lg:max-w-md flex-col gap-4">
						<Field>
							<Label>Large</Label>
							<Input size="lg" placeholder="Large input" />
						</Field>
					</div>
				</div>
			</Example>
			<Example title="Prefix">
				<div className="flex lg:max-w-sm flex-col gap-4">
					<Input prefix={<Icon icon={<Search />} />} placeholder="Search" />
					<Input prefix={<Icon icon={<Lock />} />} placeholder="Password" />
					<Input prefix={<Icon icon={<Hash />} />} placeholder="Channel name" />
				</div>
			</Example>
			<Example title="Suffix">
				<div className="flex lg:max-w-sm flex-col gap-4">
					<Input suffix={<Icon icon={<Check />} />} placeholder="Verified" />
					<Input suffix={<Icon icon={<Share />} />} placeholder="Share" />
				</div>
			</Example>
			<Example title="Prefix and suffix">
				<div className="flex flex-col gap-4">
					<div className="flex lg:max-w-xs flex-col gap-4">
						<Input
							size="sm"
							prefix={<Icon icon={<Search />} />}
							suffix={<Icon icon={<Command />} />}
							placeholder="Small"
						/>
					</div>
					<div className="flex lg:max-w-sm flex-col gap-4">
						<Input
							size="md"
							prefix={<Icon icon={<Search />} />}
							suffix={<Icon icon={<Command />} />}
							placeholder="Medium"
						/>
					</div>
					<div className="flex lg:max-w-md flex-col gap-4">
						<Input
							size="lg"
							prefix={<Icon icon={<Search />} />}
							suffix={<Icon icon={<Command />} />}
							placeholder="Large"
						/>
					</div>
				</div>
			</Example>
			<Example title="Disabled">
				<Field className="lg:max-w-sm">
					<Label htmlFor="input-disabled">Disabled</Label>
					<Input id="input-disabled" disabled placeholder="Disabled" />
				</Field>
			</Example>
			<Example title="Readonly">
				<Field className="lg:max-w-sm">
					<Label>Readonly</Label>
					<Input readOnly placeholder="Readonly" />
				</Field>
			</Example>
			<Example title="Invalid">
				<Field className="lg:max-w-sm">
					<Label>Invalid</Label>
					<Input data-invalid placeholder="Invalid input" />
				</Field>
			</Example>
		</div>
	)
}
