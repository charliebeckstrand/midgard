import type { ReactNode } from 'react'
import { Card } from 'ui/card'
import { Stack } from 'ui/structure/stack'

/**
 * A card of one office in the overview of a state, in the Drawer: a title that
 * moves the Drawer to the office, then the race or the delegation of the state.
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
		<Card>
			<Stack gap="lg">
				<button
					type="button"
					onClick={onPick}
					className="cursor-pointer self-start text-start text-base/6 font-semibold hover:underline"
				>
					{title}
				</button>

				{children}
			</Stack>
		</Card>
	)
}
