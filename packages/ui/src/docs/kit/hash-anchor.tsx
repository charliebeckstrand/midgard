import { type ReactNode, useState } from 'react'
import { cn } from 'ui/core'
import { useLink } from 'ui/primitives/link'
import { ReducedMotion } from 'ui/primitives/reduced-motion'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements.ts'
import { ugoki } from '../../recipes/kiso/index.ts'

/** Props for {@link HashAnchor}. */
type HashAnchorProps = {
	/** The id of the element that the link goes to. */
	to: string
	/**
	 * Shows the mark only on keyboard focus and on hover, for a link in a long
	 * list, such as the name of each prop of the API reference.
	 *
	 * @defaultValue false
	 */
	reveal?: boolean
	children: ReactNode
}

/**
 * The blue `#` mark before the text. It is the content of a `::before` box, so
 * it is not in the text of the heading. A copy of the heading, a search of the
 * page, and the name of the link do not hold it. The mark shows the focus, so
 * it takes the focus blue of each mode: blue-600 on light and blue-500 on dark.
 */
const MARK = "inline-block text-blue-600 dark:text-blue-500 before:me-1.5 before:content-['#']"

/**
 * The link from a heading or a name of a page to its own element, such as the
 * "Playground" heading to `#playground`.
 *
 * A blue `#` mark comes before the text, at half opacity. On keyboard focus and
 * on hover, the mark fades to full opacity. The mark shows the focus, in place
 * of the focus ring of the library. A click focus does not change the mark.
 *
 * With `reveal`, the mark shows only on keyboard focus and on hover. The mark
 * fades in, and its slot opens, so the text moves to the inline end. The mark
 * and the move show the focus. A touch has no hover, so a tap does not show
 * the mark. Under reduced motion, the `ReducedMotion` root makes the slot open
 * at once, because Motion skips a tween of the width, and only the fade plays.
 */
export function HashAnchor({ to, reveal = false, children }: HashAnchorProps) {
	const { component: LinkComponent } = useLink()

	if (reveal) return <RevealAnchor to={to}>{children}</RevealAnchor>

	return (
		<LinkComponent href={`#${to}`} className="group outline-none">
			<span
				aria-hidden
				className={cn(
					MARK,
					'opacity-50 group-hover:opacity-100 group-focus-visible:opacity-100',
					ugoki.css.opacity,
					ugoki.css.duration,
				)}
			/>
			{children}
		</LinkComponent>
	)
}

/** The {@link HashAnchor} with `reveal`: the mark shows on keyboard focus and on hover. */
function RevealAnchor({ to, children }: Omit<HashAnchorProps, 'reveal'>) {
	const { component: LinkComponent } = useLink()

	const [focused, setFocused] = useState(false)

	const [hovered, setHovered] = useState(false)

	const shown = focused || hovered

	return (
		<LinkComponent
			href={`#${to}`}
			className="outline-none"
			onFocus={(event) => setFocused(event.currentTarget.matches(':focus-visible'))}
			onBlur={() => setFocused(false)}
			onPointerEnter={(event) => setHovered(event.pointerType !== 'touch')}
			onPointerLeave={() => setHovered(false)}
		>
			<ReducedMotion>
				<m.span
					aria-hidden
					className={MARK}
					initial={false}
					animate={shown ? { width: 'auto', opacity: 1 } : { width: 0, opacity: 0 }}
					transition={ugoki.glide}
				/>
			</ReducedMotion>
			{children}
		</LinkComponent>
	)
}
