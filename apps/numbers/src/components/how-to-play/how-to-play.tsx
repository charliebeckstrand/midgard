'use client'

import { QuestionMark } from 'lucide-react'
import { useState } from 'react'
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from 'ui/accordion'
import { Button } from 'ui/button'
import { Dialog, DialogBody, DialogHeader, DialogPanel, DialogTitle } from 'ui/dialog'
import { Icon } from 'ui/icon'
import { Stack } from 'ui/structure/stack'
import { MAX, SLOTS } from '../../utilities/game'

/** One section of the dialog: the key of its item, its heading, and its paragraphs. */
type Part = { value: string; heading: string; paragraphs: readonly string[] }

/** The rules of the game, from `utilities/game.ts`, in the order of a run. */
const PARTS: readonly Part[] = [
	{
		value: 'rules',
		heading: 'Rules',
		paragraphs: [
			`Each run draws ${SLOTS} numbers between 1 and ${MAX}, one at a time. Place each number in a slot so that the column always runs from smallest at the top to largest at the bottom.`,
			`The run ends when a number has nowhere to go. Your score is the number of slots you fill, and a full column of ${SLOTS} wins.`,
			"You can't know what comes next, so leave room on both sides: low numbers belong near the top, and high numbers near the bottom.",
		],
	},
	{
		value: 'vs-cpu',
		heading: 'Vs CPU',
		paragraphs: [
			'The CPU gets the same draws in the same order and places each one after you do. Whoever fills more slots wins.',
			'You can change its difficulty in Settings.',
		],
	},
	{
		value: 'daily',
		heading: 'Daily puzzle',
		paragraphs: ['Everyone plays the same seed each day, and only your first run counts.'],
	},
]

/**
 * The question mark button of the header, which opens the "How to play"
 * dialog. An accordion in the dialog holds the Rules of a run, then the rules
 * of Vs CPU and of the daily puzzle. Rules is open when the dialog opens, and
 * one section is open at a time.
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
						<Accordion defaultValue="rules">
							{PARTS.map(({ value, heading, paragraphs }) => (
								<AccordionItem key={value} value={value}>
									<AccordionTrigger>{heading}</AccordionTrigger>

									<AccordionPanel>
										<Stack gap="sm">
											{paragraphs.map((paragraph) => (
												<p key={paragraph}>{paragraph}</p>
											))}
										</Stack>
									</AccordionPanel>
								</AccordionItem>
							))}
						</Accordion>
					</DialogBody>
				</DialogPanel>
			</Dialog>
		</>
	)
}
