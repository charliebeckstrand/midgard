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
			<Stack gap="lg">
				<span className="text-base/6 font-semibold">{title}</span>

				{children}
			</Stack>
		</CardButton>
	)
}
