import { Check, Command, Hash, Lock, Search, Share } from 'lucide-react'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { Input } from '../../components/input'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

const variants = ['default', 'outline'] as const

export default function InputDemo() {
	return (
		<Stack gap="xl">
			<Example title="Variants">
				{variants.map((variant) => (
					<Field key={variant}>
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
			</Example>

			<Example title="Prefix">
				<Input prefix={<Icon icon={<Search />} />} placeholder="Search" />
				<Input prefix={<Icon icon={<Lock />} />} placeholder="Password" />
				<Input prefix={<Icon icon={<Hash />} />} placeholder="Channel name" />
			</Example>

			<Example title="Suffix">
				<Input suffix={<Icon icon={<Check />} />} placeholder="Verified" />
				<Input suffix={<Icon icon={<Share />} />} placeholder="Share" />
			</Example>

			<Example title="Prefix and suffix">
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
			</Example>

			<Example title="Disabled">
				<Field>
					<Label htmlFor="input-disabled">Disabled</Label>
					<Input id="input-disabled" disabled placeholder="Disabled" />
				</Field>
			</Example>

			<Example title="Readonly">
				<Field>
					<Label>Readonly</Label>
					<Input readOnly placeholder="Readonly" />
				</Field>
			</Example>

			<Example title="Invalid">
				<Field>
					<Label>Invalid</Label>
					<Input data-invalid placeholder="Invalid input" />
				</Field>
			</Example>

			<Example title="Valid">
				<Field>
					<Label>Valid</Label>
					<Input data-valid placeholder="Valid input" />
				</Field>
			</Example>
		</Stack>
	)
}
