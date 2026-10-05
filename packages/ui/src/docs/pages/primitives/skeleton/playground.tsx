import { useState } from 'react'
import { Button } from 'ui/button'
import { Heading, HeadingSkeleton } from 'ui/heading'
import { ReadyReveal, type ReadyRevealProps } from 'ui/primitives/ready-reveal'

export default function SkeletonPlayground(props: ReadyRevealProps) {
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
			<ReadyReveal {...props} ready={ready} placeholder={<HeadingSkeleton level={3} />}>
				<Heading level={3}>Create account</Heading>
			</ReadyReveal>
		</>
	)
}
