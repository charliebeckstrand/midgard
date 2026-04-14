import { Check, Command, Hash, Lock, Search, Share } from 'lucide-react'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { Input } from '../../components/input'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

const variants = ['default', 'outline', 'glass'] as const

export default function InputDemo() {
	return (
		<Stack gap={8}>
			<Example title="Variants">
				{variants.map((variant) => (
					<Sizer key={variant}>
						<Field>
							<Label htmlFor={`input-${variant}`}>
								{variant.charAt(0).toUpperCase() + variant.slice(1)}
							</Label>
							<Input
								id={`input-${variant}`}
								variant={variant}
								placeholder={`This is a ${variant} input`}
							/>
						</Field>
					</Sizer>
				))}
			</Example>
			<Example title="Sizes">
				<Sizer size="sm">
					<Field>
						<Label>Small</Label>
						<Input size="sm" placeholder="Small input" />
					</Field>
				</Sizer>
				<Sizer size="md">
					<Field>
						<Label>Medium</Label>
						<Input size="md" placeholder="Medium input" />
					</Field>
				</Sizer>
				<Sizer size="lg">
					<Field>
						<Label>Large</Label>
						<Input size="lg" placeholder="Large input" />
					</Field>
				</Sizer>
			</Example>
			<Example title="Prefix">
				<Sizer>
					<Input prefix={<Icon icon={<Search />} />} placeholder="Search" />
					<Input prefix={<Icon icon={<Lock />} />} placeholder="Password" />
					<Input prefix={<Icon icon={<Hash />} />} placeholder="Channel name" />
				</Sizer>
			</Example>
			<Example title="Suffix">
				<Sizer>
					<Input suffix={<Icon icon={<Check />} />} placeholder="Verified" />
					<Input suffix={<Icon icon={<Share />} />} placeholder="Share" />
				</Sizer>
			</Example>
			<Example title="Prefix and suffix">
				<Sizer>
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
				</Sizer>
			</Example>
			<Example title="Disabled">
				<Sizer>
					<Field>
						<Label htmlFor="input-disabled">Disabled</Label>
						<Input id="input-disabled" disabled placeholder="Disabled" />
					</Field>
				</Sizer>
			</Example>
			<Example title="Readonly">
				<Sizer>
					<Field>
						<Label>Readonly</Label>
						<Input readOnly placeholder="Readonly" />
					</Field>
				</Sizer>
			</Example>
			<Example title="Invalid">
				<Sizer>
					<Field>
						<Label>Invalid</Label>
						<Input data-invalid placeholder="Invalid input" />
					</Field>
				</Sizer>
			</Example>
			<Example title="Valid">
				<Sizer>
					<Field>
						<Label>Valid</Label>
						<Input data-valid placeholder="Valid input" />
					</Field>
				</Sizer>
			</Example>
		</Stack>
	)
}
