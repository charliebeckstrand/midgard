'use client'

import { useState } from 'react'
import { Avatar } from '../../components/avatar'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Card, CardBody, CardHeader } from '../../components/card'
import { Checkbox } from '../../components/checkbox'
import { Chip } from '../../components/chip'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import { Heading } from '../../components/heading'
import { Input } from '../../components/input'
import { Radio } from '../../components/radio'
import { Sizer } from '../../components/sizer'
import { Skeleton } from '../../components/skeleton'
import { Switch } from '../../components/switch'
import { Text } from '../../components/text'
import { Textarea } from '../../components/textarea'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Feedback' }

const dynamicComponents = [
	{ name: 'Avatar', render: () => <Avatar size="md" /> },
	{ name: 'Badge', render: () => <Badge>New</Badge> },
	{ name: 'Button', render: () => <Button>Submit</Button> },
	{ name: 'Checkbox', render: () => <Checkbox /> },
	{ name: 'Chip', render: () => <Chip>Filter</Chip> },
	{ name: 'Heading', render: () => <Heading level={3}>The quick brown fox</Heading> },
	{ name: 'Input', render: () => <Input placeholder="Email" /> },
	{ name: 'Radio', render: () => <Radio /> },
	{ name: 'Switch', render: () => <Switch /> },
	{ name: 'Text', render: () => <Text>The quick brown fox jumps over the lazy dog.</Text> },
	{ name: 'Textarea', render: () => <Textarea placeholder="Bio" /> },
]

function DynamicExample() {
	const [selected, setSelected] = useState<string>('Button')

	const active = dynamicComponents.find((c) => c.name === selected)

	return (
		<Example
			title="Dynamic skeletons"
			actions={
				<Combobox
					value={selected}
					onChange={setSelected}
					displayValue={(v: string) => v}
					placeholder="Search components"
					className="w-56"
				>
					{(query) =>
						dynamicComponents
							.filter((c) => !query || c.name.toLowerCase().includes(query.toLowerCase()))
							.map((c) => (
								<ComboboxOption key={c.name} value={c.name}>
									<ComboboxLabel>{c.name}</ComboboxLabel>
								</ComboboxOption>
							))
					}
				</Combobox>
			}
		>
			<Sizer>
				<Skeleton>{active?.render()}</Skeleton>
			</Sizer>
		</Example>
	)
}

function TransitionDemo() {
	const [ready, setReady] = useState(false)

	return (
		<>
			<Button
				variant={ready ? 'soft' : 'outline'}
				color={ready ? 'red' : undefined}
				size="sm"
				onClick={() => setReady(!ready)}
			>
				{ready ? 'Reset' : 'Simulate load'}
			</Button>

			<Skeleton ready={ready}>
				<Sizer>
					<Card>
						<CardHeader>
							<div className="flex items-center gap-3">
								<Avatar initials="JD" />
								<div className="flex-1 space-y-1">
									<Heading level={5}>Jane Doe</Heading>
									<Text>Senior Engineer</Text>
								</div>
							</div>
						</CardHeader>
						<CardBody>
							<Text>Design systems & component libraries.</Text>
						</CardBody>
					</Card>
				</Sizer>
			</Skeleton>
		</>
	)
}

export default function SkeletonDemo() {
	return (
		<div className="space-y-8">
			<DynamicExample />

			<Example title="Form">
				<Skeleton>
					<Sizer gap={3}>
						<Heading level={3}>Create account</Heading>
						<Input placeholder="Email" />
						<Input placeholder="Password" type="password" />
						<Textarea placeholder="Bio" />
						<Button>Sign up</Button>
					</Sizer>
				</Skeleton>
			</Example>

			<Example
				title="Transition"
				code={code`
					<Skeleton ready={!loading}>
						<UserCard user={user} />
					</Skeleton>
				`}
			>
				<TransitionDemo />
			</Example>
		</div>
	)
}
