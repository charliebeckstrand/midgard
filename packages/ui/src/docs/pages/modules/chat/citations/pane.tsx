import type { ReactNode } from 'react'
import { Button } from 'ui/button'
import { Card, CardBody, CardHeader, CardTitle } from 'ui/card'
import { Flex } from 'ui/flex'

// A pane beside the chat: a card with a title, a Clear control while a
// selection applies, and a surface under them.
export function Pane({
	title,
	onClear,
	children,
}: {
	title: string
	onClear?: (() => void) | undefined
	children: ReactNode
}) {
	return (
		<Card className="flex h-full flex-col">
			<CardHeader>
				<Flex align="center" justify="between" gap="sm">
					<CardTitle>{title}</CardTitle>
					{/* The control keeps its space while it hides, so the header keeps one height. */}
					<Button variant="plain" onClick={onClear} className={onClear ? undefined : 'invisible'}>
						Clear
					</Button>
				</Flex>
			</CardHeader>
			<CardBody className="min-h-0 flex-1">{children}</CardBody>
		</Card>
	)
}
