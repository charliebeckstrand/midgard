import type { ReactNode } from 'react'
import { Card } from 'ui/card'
import { Link } from 'ui/link'
import { Stack } from 'ui/structure/stack'
import { CardButton } from '../card-button'

/** Props for {@link OfficeCard}: the office, its body, and where a pick goes. */
export type OfficeCardProps = {
	title: string
	children: ReactNode
} & (
	| {
			/** Moves the Drawer to the office. */
			onPick: () => void
			href?: never
	  }
	| {
			/** The page of the office in the state. */
			href: string
			onPick?: never
	  }
)

/**
 * A card of one office in the overview of a state: the office, then the race
 * or the delegation of the state. The whole card is one control. In the Drawer,
 * it is a button that moves the Drawer to the office, as a race card is. On the
 * page of a state, it is a link to the page of the office in the state.
 */
export function OfficeCard({ title, onPick, href, children }: OfficeCardProps) {
	// The gap under the title is the inset of the card, as in a race card, so the
	// title stands as far from the body as from the top edge.
	const body = (
		<Stack gap="md">
			<span className="text-base/6 font-semibold">{title}</span>

			{children}
		</Stack>
	)

	if (href !== undefined) {
		return (
			<Card
				href={href}
				render={<Link href={href} />}
				className="h-full transition-shadow hover:shadow-md"
			>
				{body}
			</Card>
		)
	}

	return <CardButton onPick={onPick}>{body}</CardButton>
}
