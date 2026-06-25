import { capitalize, Example } from 'docs'
import { Check, Hash, Lock, Search, Share } from 'lucide-react'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { Input } from '../../components/input'

const variants = ['default', 'outline'] as const
const sizes = ['sm', 'md', 'lg'] as const

export function Demo() {
	return (
		<>
			<Example title="Variants">
				{variants.map((variant) => (
					<Field key={variant}>
						<Label htmlFor={`input-${variant}`}>{capitalize(variant)}</Label>
						<Input id={`input-${variant}`} variant={variant} />
					</Field>
				))}
			</Example>

			<Example title="Sizes">
				{sizes.map((size) => (
					<Field key={size}>
						<Label htmlFor={`input-size-${size}`}>{capitalize(size)}</Label>
						<Input id={`input-size-${size}`} size={size} />
					</Field>
				))}
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

			<Example title="Disabled">
				<Field>
					<Label htmlFor="input-disabled">Disabled</Label>
					<Input id="input-disabled" disabled placeholder="Disabled" />
				</Field>
			</Example>

			<Example title="Read-only">
				<Field>
					<Label>Readonly</Label>
					<Input readOnly placeholder="Readonly" />
				</Field>
			</Example>

			<Example title="Invalid">
				<Field>
					<Label>Invalid</Label>
					<Input data-invalid placeholder="Something went wrong" />
				</Field>
			</Example>

			<Example title="Valid">
				<Field>
					<Label>Valid</Label>
					<Input data-valid placeholder="Everything is fine" />
				</Field>
			</Example>

			<Example title="Warning">
				<Field>
					<Label>Warning</Label>
					<Input data-warning placeholder="Something might be wrong" />
				</Field>
			</Example>
		</>
	)
}
