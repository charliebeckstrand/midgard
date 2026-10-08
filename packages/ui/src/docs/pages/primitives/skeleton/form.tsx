import { type FormEvent, useState } from 'react'
import { Button, ButtonSkeleton } from 'ui/button'
import { ControlSkeleton } from 'ui/control'
import { Heading, HeadingSkeleton } from 'ui/heading'
import { Input } from 'ui/input'
import { ReadyReveal } from 'ui/primitives/ready-reveal'
import { Textarea, TextareaSkeleton } from 'ui/textarea'
import { resetButtonProps } from '../../../kit/reset-button.tsx'

// Chrome puts all fields that have no form into one form for the page. Thus a
// password field with no form can make the password manager of Chrome use a
// field of another example, such as a combobox, as the username.
function prevent(event: FormEvent) {
	event.preventDefault()
}

const simulateProps = { variant: 'outline', children: 'Simulate load' } as const

export default function Form() {
	const [ready, setReady] = useState(false)

	return (
		<>
			<Button {...(ready ? resetButtonProps : simulateProps)} onClick={() => setReady(!ready)} />
			<form className="space-y-4" onSubmit={prevent}>
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
			</form>
		</>
	)
}
