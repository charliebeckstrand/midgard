import { useState } from 'react'
import { Avatar, AvatarSkeleton } from 'ui/avatar'
import { Button } from 'ui/button'
import { Card, CardBody, CardHeader } from 'ui/card'
import { Flex } from 'ui/flex'
import { Heading, HeadingSkeleton } from 'ui/heading'
import { ReadyReveal } from 'ui/primitives/ready-reveal'
import { Stack } from 'ui/stack'
import { Text, TextSkeleton } from 'ui/text'
import { resetButtonProps } from '../../../kit/reset-button.tsx'

const simulateProps = { variant: 'outline', children: 'Simulate load' } as const

export default function ProfileCard() {
	const [ready, setReady] = useState(false)

	return (
		<>
			<Button {...(ready ? resetButtonProps : simulateProps)} onClick={() => setReady(!ready)} />
			<Card>
				<CardHeader>
					<Flex gap="md">
						<ReadyReveal ready={ready} placeholder={<AvatarSkeleton />}>
							<Avatar initials="JD" />
						</ReadyReveal>
						<Stack gap="xs" flex="1">
							<ReadyReveal ready={ready} placeholder={<HeadingSkeleton level={3} />}>
								<Heading level={3}>Jane Doe</Heading>
							</ReadyReveal>
							<ReadyReveal ready={ready} placeholder={<TextSkeleton />}>
								<Text>Senior Engineer</Text>
							</ReadyReveal>
						</Stack>
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
