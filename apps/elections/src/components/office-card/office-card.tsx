import type { ReactNode } from 'react'
import { Stack } from 'ui/structure/stack'
import { CardButton } from '../card-button'

/**
 * A card of one office in the overview of a state, in the Drawer: the office,
 * then the race or the delegation of the state. The whole card is one button
 * that moves the Drawer to the office, as a race card is.
 */
export function OfficeCard({
	title,
	onPick,
	children,
}: {
	title: string
	onPick: () => void
	children: ReactNode
}) {
	return (
		<CardButton onPick={onPick}>
			{/* The gap under the title is the inset of the card, as in a race card, so the
			title stands as far from the body as from the top edge. */}
			<Stack gap="md">
				<span className="text-base/6 font-semibold">{title}</span>

				{children}
			</Stack>
		</CardButton>
	)
}
