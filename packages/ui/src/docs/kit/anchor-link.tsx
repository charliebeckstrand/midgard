import type { ReactNode } from 'react'
import { Link } from 'ui/link'

/**
 * The link of an anchor on a page, such as the title of an example or the name
 * of a prop, to the hash of its own id.
 *
 * @remarks
 * The focus ring is inset. A link to the hash scrolls its anchor to the edge of
 * the scroll area, where the sticky header of the page or the scroll box of an
 * API entry hides an outset ring. The ring stays an outline, so forced colors
 * keep it.
 */
export function AnchorLink({ id, children }: { id: string; children: ReactNode }) {
	return (
		<Link href={`#${id}`} className="focus-visible:-outline-offset-2">
			{children}
		</Link>
	)
}
