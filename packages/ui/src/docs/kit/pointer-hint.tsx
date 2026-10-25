import type { ReactNode } from 'react'

/** Props for {@link PointerHint}. */
export type PointerHintProps = {
	/** The text for a mouse or a pen, such as "Right-click here". */
	mouseText: ReactNode
	/** The text for a touch screen, such as "Press and hold here". */
	touchText: ReactNode
}

/**
 * The hint of an example that names a gesture. The `mouseText` shows when the primary
 * pointer is fine, and the `touchText` shows when it is coarse. The CSS `pointer` media
 * feature picks the text, so the first paint shows the correct text. The hidden text is
 * `display: none`, so assistive technology reads only the text that shows.
 */
export function PointerHint({ mouseText, touchText }: PointerHintProps) {
	return (
		<>
			<span className="pointer-coarse:hidden">{mouseText}</span>
			<span className="hidden pointer-coarse:inline">{touchText}</span>
		</>
	)
}
