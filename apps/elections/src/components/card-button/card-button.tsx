import type { ReactNode } from 'react'
import { Card } from 'ui/card'

/**
 * A card that is one button, such as a race card or an office card of the
 * Drawer. A pick on any part of the card fires `onPick`. The card fills the
 * height of its cell, so the cards of a row line up. A keyboard focus shows the
 * focus ring of a ui control around the card, as on a card that is a link.
 */
export function CardButton({ onPick, children }: { onPick: () => void; children: ReactNode }) {
	return (
		<button
			type="button"
			onClick={onPick}
			className="block h-full w-full cursor-pointer rounded-xl text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
		>
			<Card className="h-full transition-shadow hover:shadow-md">{children}</Card>
		</button>
	)
}
