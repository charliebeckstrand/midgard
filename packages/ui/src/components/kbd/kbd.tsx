import type { ComponentProps } from 'react'
import { cn } from '../../core/cn'
import { type KbdVariants, k } from '../../recipes/kata/kbd'

/** Props for {@link Kbd}: an optional `size` atop native `<kbd>` attributes. */
export type KbdProps = ComponentProps<'kbd'> & {
	/** The density step. Omit it to take the step of the nearest density scope. A step makes the key a density scope. */
	size?: KbdVariants['size']
}

/**
 * A key of the keyboard, shown as a keycap. Write a modifier as part of the
 * children, in platform order (⌃⌘). A key is never narrower than it is tall, so
 * a key with one glyph in a line of text is a square. A key with only an icon,
 * such as `<Kbd><Icon icon={<CornerDownLeft />} /></Kbd>`, is a square as tall
 * as a key with text, also with an `sr-only` name beside the icon. A key with a
 * longer label grows. CSS does not see a bare text node, so a key with an icon
 * and bare text gets the size of a key with only an icon. Put the text in a
 * `<span>`, or write the glyph as text.
 *
 * @remarks
 * A pure, server-renderable display leaf. Without `size`, the key takes the
 * step of the nearest density scope, so a key in a Button takes the step of
 * the button. An explicit `size` makes the key a density scope.
 *
 * The key has the default text color, and not the color of the text around
 * it. Its fill lowers the contrast of its text, and muted or intent text on the
 * fill is below 4.5:1 (WCAG 1.4.3). On a solid fill, such as that of a solid
 * Button or Badge, the key keeps the text color of the fill. It then has no
 * fill of its own, so the text keeps 4.5:1, and an outline shows its edge.
 */
export function Kbd({ size, className, children, ...props }: KbdProps) {
	return (
		<kbd data-slot="kbd" data-density={size} className={cn(k().base, className)} {...props}>
			{children}
		</kbd>
	)
}
