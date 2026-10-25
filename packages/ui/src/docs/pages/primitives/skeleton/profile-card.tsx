import { useState } from 'react'
import { Avatar, AvatarSkeleton } from 'ui/avatar'
import { Button } from 'ui/button'
import { Card, CardBody, CardHeader } from 'ui/card'
import { Flex } from 'ui/flex'
import { Heading, HeadingSkeleton } from 'ui/heading'
import { ReadyReveal } from 'ui/primitives/ready-reveal'
import { Stack } from 'ui/stack'
import { Text, TextSkeleton } from 'ui/text'
import { person } from '../../../data/people.ts'
import { resetButtonProps } from '../../../kit/reset-button.tsx'

const simulateProps = { variant: 'outline', children: 'Simulate load' } as const

const arlene = person(2)

export default function ProfileCard() {
	const [ready, setReady] = useState(false)

	return (
		<>
			<Button {...(ready ? resetButtonProps : simulateProps)} onClick={() => setReady(!ready)} />
			<Card>
				<CardHeader>
					<Flex gap="md">
						<ReadyReveal ready={ready} placeholder={<AvatarSkeleton />}>
							<Avatar initials={arlene.initials} />
						</ReadyReveal>
						<Stack gap="xs" flex="1">
							<ReadyReveal ready={ready} placeholder={<HeadingSkeleton level={3} />}>
								<Heading level={3}>{arlene.name}</Heading>
							</ReadyReveal>
							<ReadyReveal ready={ready} placeholder={<TextSkeleton />}>
								<Text tone="muted">Senior engineer</Text>
							</ReadyReveal>
						</Stack>
					</Flex>
				</CardHeader>
				<CardBody>
					<ReadyReveal ready={ready} placeholder={<TextSkeleton />}>
						<Text tone="muted">Arlene builds design systems and component libraries.</Text>
					</ReadyReveal>
				</CardBody>
			</Card>
		</>
	)
}
