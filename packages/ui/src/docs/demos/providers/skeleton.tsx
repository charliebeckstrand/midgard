import { useState } from 'react'
import { Avatar } from '../../../components/avatar'
import { Badge } from '../../../components/badge'
import { Button } from '../../../components/button'
import { Card, CardBody, CardHeader } from '../../../components/card'
import { Checkbox } from '../../../components/checkbox'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../../components/combobox'
import { Flex } from '../../../components/flex'
import { Heading } from '../../../components/heading'
import { Input } from '../../../components/input'
import { Radio } from '../../../components/radio'
import { Switch } from '../../../components/switch'
import { Text } from '../../../components/text'
import { Textarea } from '../../../components/textarea'
import { Skeleton } from '../../../providers/skeleton'
import { Example } from '../../components/example'

export const meta = { category: 'Providers' }

const dynamicComponents = [
	{ name: 'Avatar', render: () => <Avatar size="md" /> },
	{ name: 'Badge', render: () => <Badge>New</Badge> },
	{ name: 'Button', render: () => <Button>Submit</Button> },
	{
		name: 'Card',
		render: () => (
			<Card>
				<CardHeader>
					<Heading level={3}>Title</Heading>
				</CardHeader>
				<CardBody>
					<Text>The quick brown fox jumps over the lazy dog.</Text>
				</CardBody>
			</Card>
		),
	},
	{ name: 'Checkbox', render: () => <Checkbox /> },
	{ name: 'Heading', render: () => <Heading level={3}>The quick brown fox</Heading> },
	{ name: 'Input', render: () => <Input placeholder="Email" /> },
	{ name: 'Radio', render: () => <Radio /> },
	{ name: 'Switch', render: () => <Switch /> },
	{ name: 'Text', render: () => <Text>The quick brown fox jumps over the lazy dog.</Text> },
	{ name: 'Textarea', render: () => <Textarea placeholder="Bio" /> },
]

function DynamicExample() {
	const [selected, setSelected] = useState<string | undefined>('Button')

	const active = dynamicComponents.find((c) => c.name === selected)

	return (
		<Example
			title="Dynamic skeletons"
			actions={
				<Combobox
					value={selected}
					displayValue={(v: string) => v}
					onValueChange={setSelected}
					placeholder="Search components"
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
			<Skeleton>{active?.render()}</Skeleton>
		</Example>
	)
}

function FormExample() {
	const [ready, setReady] = useState(false)

	return (
		<>
			<Button
				variant={ready ? 'soft' : 'outline'}
				color={ready ? 'red' : undefined}
				onClick={() => setReady(!ready)}
			>
				{ready ? 'Reset' : 'Simulate load'}
			</Button>

			<Skeleton ready={ready}>
				<Heading level={3}>Create account</Heading>
			</Skeleton>
			<Skeleton ready={ready}>
				<Input placeholder="Email" />
			</Skeleton>
			<Skeleton ready={ready}>
				<Input placeholder="Password" type="password" />
			</Skeleton>
			<Skeleton ready={ready}>
				<Textarea placeholder="Bio" />
			</Skeleton>
			<Skeleton ready={ready}>
				<Button color="blue">Sign up</Button>
			</Skeleton>
		</>
	)
}

function ProfileCardExample() {
	const [ready, setReady] = useState(false)

	return (
		<>
			<Button
				variant={ready ? 'soft' : 'outline'}
				color={ready ? 'red' : undefined}
				onClick={() => setReady(!ready)}
			>
				{ready ? 'Reset' : 'Simulate load'}
			</Button>

			<Card bg="none">
				<CardHeader>
					<Flex gap="md">
						<Skeleton ready={ready}>
							<Avatar initials="JD" />
						</Skeleton>
						<div className="flex-1 space-y-1">
							<Skeleton ready={ready}>
								<Heading level={3}>Jane Doe</Heading>
							</Skeleton>
							<Skeleton ready={ready}>
								<Text>Senior Engineer</Text>
							</Skeleton>
						</div>
					</Flex>
				</CardHeader>
				<CardBody>
					<Skeleton ready={ready}>
						<Text>Design systems & component libraries.</Text>
					</Skeleton>
				</CardBody>
			</Card>
		</>
	)
}

export function Demo() {
	return (
		<>
			<DynamicExample />

			<Example title="Form">
				<FormExample />
			</Example>

			<Example title="Profile card">
				<ProfileCardExample />
			</Example>
		</>
	)
}
