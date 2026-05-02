import { Heading1, Heading2, Heading3 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { Control } from '../../components/control'
import { Flex } from '../../components/flex'
import { Group } from '../../components/group'
import { Icon } from '../../components/icon'
import { Input } from '../../components/input'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

type ChildType = 'button' | 'input'

const childOptions: { value: ChildType; label: string }[] = [
	{ value: 'button', label: 'Button' },
	{ value: 'input', label: 'Input' },
]

export default function GroupDemo() {
	const [child, setChild] = useState<ChildType>('button')

	const isInput = child === 'input'

	return (
		<Stack gap="xl">
			<Flex gap="sm">
				<Control>
					<Listbox<ChildType>
						value={child}
						onChange={(v) => v && setChild(v)}
						displayValue={(v) => childOptions.find((o) => o.value === v)?.label ?? v}
					>
						{childOptions.map((option) => (
							<ListboxOption key={option.value} value={option.value}>
								<ListboxLabel>{option.label}</ListboxLabel>
							</ListboxOption>
						))}
					</Listbox>
				</Control>
			</Flex>

			<Example title="Default">
				<Stack gap="lg">
					<Group>
						{isInput ? (
							<>
								<Input placeholder="First" />
								<Input placeholder="Second" />
								<Input placeholder="Third" />
							</>
						) : (
							<>
								<Button variant="outline">Cut</Button>
								<Button variant="outline">Copy</Button>
								<Button variant="outline">Paste</Button>
							</>
						)}
					</Group>

					<Group>
						{isInput ? (
							<>
								<Input placeholder="First" />
								<Input placeholder="Last" />
							</>
						) : (
							<>
								<Button variant="outline">Previous</Button>
								<Button variant="outline">Next</Button>
							</>
						)}
					</Group>

					<Group>
						{isInput ? (
							<Input placeholder="Only one" />
						) : (
							<Button variant="outline">Only one</Button>
						)}
					</Group>
				</Stack>
			</Example>

			{!isInput && (
				<Example title="Vertical">
					<Group orientation="vertical">
						<Button variant="outline" prefix={<Icon icon={<Heading1 />} />} />
						<Button variant="outline" prefix={<Icon icon={<Heading2 />} />} />
						<Button variant="outline" prefix={<Icon icon={<Heading3 />} />} />
					</Group>
				</Example>
			)}

			<Example title="Sizes">
				<Stack gap="lg">
					<Group size="sm">
						{isInput ? (
							<>
								<Input placeholder="sm" />
								<Input placeholder="sm" />
								<Input placeholder="sm" />
							</>
						) : (
							<>
								<Button variant="outline">sm</Button>
								<Button variant="outline">sm</Button>
								<Button variant="outline">sm</Button>
							</>
						)}
					</Group>
					<Group size="md">
						{isInput ? (
							<>
								<Input placeholder="md" />
								<Input placeholder="md" />
								<Input placeholder="md" />
							</>
						) : (
							<>
								<Button variant="outline">md</Button>
								<Button variant="outline">md</Button>
								<Button variant="outline">md</Button>
							</>
						)}
					</Group>
					<Group size="lg">
						{isInput ? (
							<>
								<Input placeholder="lg" />
								<Input placeholder="lg" />
								<Input placeholder="lg" />
							</>
						) : (
							<>
								<Button variant="outline">lg</Button>
								<Button variant="outline">lg</Button>
								<Button variant="outline">lg</Button>
							</>
						)}
					</Group>
				</Stack>
			</Example>
		</Stack>
	)
}
