import { type ReactNode, useState } from 'react'
import { usePrefersReducedMotion } from 'ui/hooks'
import { useLink } from 'ui/primitives/link'
import { ReducedMotion } from 'ui/primitives/reduced-motion'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements.ts'
import { ugoki } from '../../recipes/kiso/index.ts'

/** Props for {@link HashAnchor}. */
type HashAnchorProps = {
	/** The id of the element that the link goes to. */
	to: string
	children: ReactNode
}

/**
 * The link from a heading or a name of a page to its own element, such as the
 * "Playground" heading to `#playground`.
 *
 * On keyboard focus, a blue `#` mark comes in before the text. The mark fades
 * in, and its slot opens, so the text moves to the inline end. The mark and
 * the move show the focus, in place of the focus ring of the library. Under
 * reduced motion, the slot opens at once, and only the fade plays.
 *
 * The mark is the content of a `::before` box, so it is not in the text of the
 * heading. A copy of the heading, a search of the page, and the name of the
 * link do not hold it.
 */
export function HashAnchor({ to, children }: HashAnchorProps) {
	const { component: LinkComponent } = useLink()

	const [focused, setFocused] = useState(false)

	const still = usePrefersReducedMotion()

	return (
		<LinkComponent
			href={`#${to}`}
			className="outline-none"
			onFocus={(event) => setFocused(event.currentTarget.matches(':focus-visible'))}
			onBlur={() => setFocused(false)}
		>
			<ReducedMotion>
				<m.span
					aria-hidden
					className="inline-block text-blue-600 before:me-1.5 before:content-['#']"
					initial={false}
					animate={focused ? { width: 'auto', opacity: 1 } : { width: 0, opacity: 0 }}
					transition={{ ...ugoki.glide, width: still ? ugoki.instant : ugoki.glide }}
				/>
			</ReducedMotion>
			{children}
		</LinkComponent>
	)
}
