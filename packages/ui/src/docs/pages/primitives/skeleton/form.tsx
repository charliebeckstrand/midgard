import { useState } from 'react'
import { Button, ButtonSkeleton } from 'ui/button'
import { ControlSkeleton } from 'ui/control'
import { Heading, HeadingSkeleton } from 'ui/heading'
import { Input } from 'ui/input'
import { ReadyReveal } from 'ui/primitives/ready-reveal'
import { Textarea, TextareaSkeleton } from 'ui/textarea'

export default function Form() {
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
