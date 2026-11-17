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
			`Each run draws ${SLOTS} numbers between 1 and ${MAX}, one at a time. Place each number in a slot so that the column always runs from smallest at the top to largest at the bottom.`,
			`The run ends when a number has nowhere to go. Your score is the number of slots you fill, and a full column of ${SLOTS} wins.`,
			"You can't know what comes next, so leave room on both sides: low numbers belong near the top, and high numbers near the bottom.",
		],
	},
	{
		heading: 'Vs CPU',
		paragraphs: [
			'The CPU gets the same numbers in the same order and places each one after you do. Whoever fills more slots wins. You can change its difficulty in Settings.',
		],
	},
	{
		heading: 'Daily puzzle',
		paragraphs: ['Everyone plays the same numbers each day, and only your first run counts.'],
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
