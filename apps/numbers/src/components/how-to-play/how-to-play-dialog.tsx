'use client'

import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from 'ui/accordion'
import { Dialog, DialogBody, DialogHeader, DialogPanel, DialogTitle } from 'ui/dialog'
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
			'A seed always draws the same numbers in the same order, so only your first run of a seed counts toward your stats and the leaderboards.',
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
]

/** Props for {@link HowToPlayDialog}. */
export type HowToPlayDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
}

/**
 * The "How to play" dialog. An accordion holds the Rules of a run, then the
 * rules of Vs CPU. Rules is open when the dialog opens, and one section is
 * open at a time.
 *
 * `HowToPlay` loads this module in idle time, or on a press of its button.
 */
export function HowToPlayDialog({ open, onOpenChange }: HowToPlayDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
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
	)
}
