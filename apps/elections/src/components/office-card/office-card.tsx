import type { ReactNode } from 'react'
import { Card } from 'ui/card'
import { Stack } from 'ui/structure/stack'

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
		<button
			type="button"
			onClick={onPick}
			className="block w-full cursor-pointer rounded-xl text-start"
		>
			<Card className="text-start transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-500">
				<Stack gap="lg">
					<span className="text-base/6 font-semibold">{title}</span>

					{children}
				</Stack>
			</Card>
		</button>
	)
}
