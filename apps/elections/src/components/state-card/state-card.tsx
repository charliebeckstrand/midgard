import type { ReactNode } from 'react'
import { Card } from 'ui/card'
import { Link } from 'ui/link'
import { Stack } from 'ui/structure/stack'

/** A card of one race or delegation of a state: a title that links to its page, then its summary. */
export function StateCard({
	title,
	href,
	children,
}: {
	title: string
	href: string
	children: ReactNode
}) {
	return (
		<Card>
			<Stack gap="lg">
				<Link href={href} className="self-start text-base/6 font-semibold hover:underline">
					{title}
				</Link>

				{children}
			</Stack>
		</Card>
	)
}
