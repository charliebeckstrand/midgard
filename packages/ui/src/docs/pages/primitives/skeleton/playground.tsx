import { useState } from 'react'
import { Button } from 'ui/button'
import { Heading, HeadingSkeleton } from 'ui/heading'
import { ReadyReveal, type ReadyRevealProps } from 'ui/primitives/ready-reveal'
import { resetButtonProps } from '../../../kit/reset-button.tsx'

const simulateProps = { variant: 'outline', children: 'Simulate load' } as const

export default function SkeletonPlayground(props: ReadyRevealProps) {
	const [ready, setReady] = useState(false)

	return (
		<>
			<Button {...(ready ? resetButtonProps : simulateProps)} onClick={() => setReady(!ready)} />
			<ReadyReveal {...props} ready={ready} placeholder={<HeadingSkeleton level={3} />}>
				<Heading level={3}>Create account</Heading>
			</ReadyReveal>
		</>
	)
}
