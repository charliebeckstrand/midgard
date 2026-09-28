import type { ReactNode } from 'react'
import { Heading } from 'ui/heading'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'

type SectionProps = {
	title: ReactNode
	/** The state of the section, such as "Your authenticator app is on." */
	description?: ReactNode
	/** The main control of the section. It shows at the end of the title row. */
	action?: ReactNode
	children?: ReactNode
}

/**
 * One part of a card of the account page, such as the passkeys: a title row
 * with an action, and the content under it.
 */
export function Section({ title, description, action, children }: SectionProps) {
	return (
		<Stack gap="md">
			<Flex align="center" justify="between" gap="md" wrap>
				<div className="min-w-0">
					<Heading level={3} size="sm">
						{title}
					</Heading>
					{description && <Text tone="muted">{description}</Text>}
				</div>
				{action}
			</Flex>
			{children}
		</Stack>
	)
}
