import type { ReactNode } from 'react'
import { Button } from 'ui/button'
import { Card, CardBody, CardHeader, CardTitle } from 'ui/card'
import { Flex } from 'ui/flex'

// A pane beside the chat: a card with a title, a Clear control while a
// selection applies, and a surface under them. The card is as tall as its
// surface. A panel of a resizable group stretches to the tallest panel, so a
// card that fills its panel grows when the pane beside it grows.
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
		<Card>
			<CardHeader>
				<Flex align="center" justify="between" gap="sm">
					<CardTitle>{title}</CardTitle>
					{/* The control keeps its space while it hides, so the header keeps one height. */}
					<Button variant="plain" onClick={onClear} className={onClear ? undefined : 'invisible'}>
						Clear
					</Button>
				</Flex>
			</CardHeader>
			<CardBody>{children}</CardBody>
		</Card>
	)
}
