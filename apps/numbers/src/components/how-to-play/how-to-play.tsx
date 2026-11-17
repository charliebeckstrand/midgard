'use client'

import { QuestionMark } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Dialog, DialogBody, DialogHeader, DialogPanel, DialogTitle } from 'ui/dialog'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import { MAX, SLOTS } from '../../utilities/game'

/** One part of the rules: a heading, or none for the first part, and its paragraphs. */
type Part = { heading?: string; paragraphs: readonly string[] }

/** The rules of the game, from `utilities/game.ts`, in the order of a run. */
const PARTS: readonly Part[] = [
	{
		paragraphs: [
			`Each run deals ${SLOTS} numbers from 1 to ${MAX}, one at a time. Put each number in a slot, so that the numbers go up from the top slot to the bottom slot.`,
			`The run ends when a number fits no empty slot. Your score is the count of filled slots. Fill all ${SLOTS} to win.`,
			'Leave room on both sides: a low number goes near the top, and a high number near the bottom.',
		],
	},
	{
		heading: 'Vs CPU',
		paragraphs: [
			'The CPU places the same numbers in its own column, after you. The higher score wins. Set its level in Settings.',
		],
	},
	{
		heading: 'Daily puzzle',
		paragraphs: ['Each player gets the same numbers on the same day. Only your first run counts.'],
	},
]

/**
 * The question mark button of the header, which opens the "How to play"
 * dialog. The dialog gives the rules of a run, then the rules of Vs CPU and of
 * the daily puzzle.
 */
export function HowToPlay() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button variant="plain" aria-label="How to play" onClick={() => setOpen(true)}>
				<Icon icon={<QuestionMark />} />
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogPanel width="sm">
					<DialogHeader>
						<DialogTitle>How to play</DialogTitle>
					</DialogHeader>

					<DialogBody>
						<Stack gap="lg">
							{PARTS.map(({ heading, paragraphs }) => (
								<Stack key={heading ?? 'run'} gap="sm">
									{heading && (
										<Heading level={3} size="xs">
											{heading}
										</Heading>
									)}

									{paragraphs.map((paragraph) => (
										<Text key={paragraph}>{paragraph}</Text>
									))}
								</Stack>
							))}
						</Stack>
					</DialogBody>
				</DialogPanel>
			</Dialog>
		</>
	)
}
