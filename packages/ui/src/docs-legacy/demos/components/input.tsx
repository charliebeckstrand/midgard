import { Check, Hash, Lock, Search, Share } from 'lucide-react'
import { Field, Label } from '../../../components/fieldset'
import { Icon } from '../../../components/icon'
import { Input } from '../../../components/input'
import { Axes, Example } from '../../engine'

export const handle = { category: 'input' }

export default function Demo() {
	return (
		<>
			<Axes
				of="Input"
				captions={false}
				render={(props, label) => <Input {...props} aria-label={label} placeholder={label} />}
			/>

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
					<Label>Disabled</Label>
					<Input disabled placeholder="Disabled" />
				</Field>
			</Example>

			<Example title="Read-only">
				<Field>
					<Label>Readonly</Label>
					<Input readOnly placeholder="Readonly" />
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
