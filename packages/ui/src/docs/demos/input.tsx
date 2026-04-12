import { Check, Command, Hash, Lock, Search, Share } from 'lucide-react'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { Input } from '../../components/input'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

const variants = ['default', 'outline', 'glass'] as const

export default function InputDemo() {
	return (
		<div className="space-y-8">
			<Example title="Variants">
				{variants.map((variant) => (
					<Field className="lg:max-w-sm" key={variant}>
						<Label htmlFor={`input-${variant}`}>
							{variant.charAt(0).toUpperCase() + variant.slice(1)}
						</Label>
						<Input
							id={`input-${variant}`}
							variant={variant}
							placeholder={`This is a ${variant} input`}
						/>
					</Field>
				))}
			</Example>
			<Example title="Sizes">
				<div className="flex lg:max-w-xs flex-col gap-4">
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
				<div className="flex lg:max-w-xs flex-col gap-4">
					<Input
						size="sm"
						prefix={<Icon icon={<Search />} />}
						suffix={<Icon icon={<Command />} />}
						placeholder="Small"
					/>
					<Input
						size="md"
						prefix={<Icon icon={<Search />} />}
						suffix={<Icon icon={<Command />} />}
						placeholder="Medium"
					/>
					<Input
						size="lg"
						prefix={<Icon icon={<Search />} />}
						suffix={<Icon icon={<Command />} />}
						placeholder="Large"
					/>
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
			<Example title="Valid">
				<Field className="lg:max-w-sm">
					<Label>Valid</Label>
					<Input data-valid placeholder="Valid input" />
				</Field>
			</Example>
		</div>
	)
}
