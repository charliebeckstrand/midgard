import { useState } from 'react'
import { Avatar, AvatarSkeleton } from '../../../components/avatar'
import { BadgeSkeleton } from '../../../components/badge'
import { Button, ButtonSkeleton } from '../../../components/button'
import { Card, CardBody, CardHeader } from '../../../components/card'
import { CheckboxSkeleton } from '../../../components/checkbox'
import { ControlSkeleton } from '../../../components/control/control-skeleton'
import { Flex } from '../../../components/flex'
import { Heading, HeadingSkeleton } from '../../../components/heading'
import { Input } from '../../../components/input'
import { RadioSkeleton } from '../../../components/radio'
import { SwitchSkeleton } from '../../../components/switch'
import { Text, TextSkeleton } from '../../../components/text'
import { Textarea, TextareaSkeleton } from '../../../components/textarea'
import { ReadyReveal } from '../../../primitives/ready-reveal'
import { Example } from '../../components/example'

export const meta = { name: 'Skeletons', category: 'Feedback' }

// Loading trees are composed explicitly: each component ships a
// `<XSkeleton>` counterpart that mirrors its silhouette. The variants are
// static leaves, so a Suspense fallback or loading.tsx can server-render
// them.
const skeletonGallery = [
	{ name: 'Avatar', skeleton: <AvatarSkeleton /> },
	{ name: 'Badge', skeleton: <BadgeSkeleton /> },
	{ name: 'Button', skeleton: <ButtonSkeleton /> },
	{ name: 'Checkbox', skeleton: <CheckboxSkeleton /> },
	{ name: 'Control', skeleton: <ControlSkeleton /> },
	{ name: 'Heading', skeleton: <HeadingSkeleton level={3} /> },
	{ name: 'Radio', skeleton: <RadioSkeleton /> },
	{ name: 'Switch', skeleton: <SwitchSkeleton /> },
	{ name: 'Text', skeleton: <TextSkeleton /> },
	{ name: 'Textarea', skeleton: <TextareaSkeleton /> },
]

function GalleryExample() {
	return (
		<Example title="Skeleton variants">
			<div className="grid grid-cols-2 items-center gap-4">
				{skeletonGallery.map((entry) => (
					<Flex key={entry.name} gap="md" align="center">
						<Text className="w-24">{entry.name}</Text>
						{entry.skeleton}
					</Flex>
				))}
			</div>
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

			<ReadyReveal ready={ready} placeholder={<HeadingSkeleton level={3} />}>
				<Heading level={3}>Create account</Heading>
			</ReadyReveal>
			<ReadyReveal ready={ready} placeholder={<ControlSkeleton />}>
				<Input placeholder="Email" />
			</ReadyReveal>
			<ReadyReveal ready={ready} placeholder={<ControlSkeleton />}>
				<Input placeholder="Password" type="password" />
			</ReadyReveal>
			<ReadyReveal ready={ready} placeholder={<TextareaSkeleton />}>
				<Textarea placeholder="Bio" />
			</ReadyReveal>
			<ReadyReveal ready={ready} placeholder={<ButtonSkeleton />}>
				<Button color="blue">Sign up</Button>
			</ReadyReveal>
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
						<ReadyReveal ready={ready} placeholder={<AvatarSkeleton />}>
							<Avatar initials="JD" />
						</ReadyReveal>
						<div className="flex-1 space-y-1">
							<ReadyReveal ready={ready} placeholder={<HeadingSkeleton level={3} />}>
								<Heading level={3}>Jane Doe</Heading>
							</ReadyReveal>
							<ReadyReveal ready={ready} placeholder={<TextSkeleton />}>
								<Text>Senior Engineer</Text>
							</ReadyReveal>
						</div>
					</Flex>
				</CardHeader>
				<CardBody>
					<ReadyReveal ready={ready} placeholder={<TextSkeleton />}>
						<Text>Design systems & component libraries.</Text>
					</ReadyReveal>
				</CardBody>
			</Card>
		</>
	)
}

export function Demo() {
	return (
		<>
			<GalleryExample />

			<Example title="Form">
				<FormExample />
			</Example>

			<Example title="Profile card">
				<ProfileCardExample />
			</Example>
		</>
	)
}
