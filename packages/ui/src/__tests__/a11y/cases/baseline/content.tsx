import { Button } from '../../../../components/button'
import { Heading } from '../../../../components/heading'
import { Text } from '../../../../components/text'
import type { Case } from '../types'

/** Typography atoms and the canonical Button. */
export const contentCases: readonly Case[] = [
	['button', <Button key="b">Save</Button>],
	[
		'heading + text',
		<div key="h">
			<Heading level={1}>Title</Heading>
			<Text>Body copy.</Text>
		</div>,
	],
]
