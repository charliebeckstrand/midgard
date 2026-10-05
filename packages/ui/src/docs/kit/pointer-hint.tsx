import type { ReactNode } from 'react'

/** Props for {@link PointerHint}. */
export type PointerHintProps = {
	/** The text for a mouse or a pen, such as "Right-click here". */
	mouse: ReactNode
	/** The text for a touch screen, such as "Press and hold here". */
	touch: ReactNode
}

/**
 * The hint of an example that names a gesture. The `mouse` text shows when the primary
 * pointer is fine, and the `touch` text shows when it is coarse. The CSS `pointer` media
 * feature picks the text, so the first paint shows the correct text. The hidden text is
 * `display: none`, so assistive technology reads only the text that shows.
 */
export function PointerHint({ mouse, touch }: PointerHintProps) {
	return (
		<>
			<span className="pointer-coarse:hidden">{mouse}</span>
			<span className="hidden pointer-coarse:inline">{touch}</span>
		</>
	)
}
