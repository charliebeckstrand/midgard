import type { ComponentProps } from 'react'
import type { PolymorphicProps } from '../../primitives/polymorphic'
import { Button, type ButtonProps } from '../button'
import type { ButtonBaseProps } from '../button/button-utilities'

/**
 * The props of the Previous and Next controls: {@link ButtonProps}, with
 * `plain` as the default `variant`. The type omits the `variant` of the Button,
 * so the docs read one default.
 *
 * @internal
 */
export type PaginationNavProps = {
	/** The fill style of the button. @defaultValue 'plain' */
	variant?: ButtonProps['variant']
} & Omit<ButtonBaseProps, 'variant'> &
	PolymorphicProps<'button', 'prefix'>

/**
 * Plain-variant {@link Button} backing the Previous/Next controls.
 *
 * @remarks
 * Previous/Next sit beside {@link PaginationList} as direct children of the
 * pagination `<nav>`, not inside its `<ol>`.
 *
 * @internal
 */
export function PaginationNavButton({
	slot,
	type,
	children,
	...props
}: { slot: string } & ButtonProps) {
	return (
		<Button
			data-slot={slot}
			variant="plain"
			{...props}
			// After the spread: the control does not submit a form unless the
			// caller asks for it. The anchor arm of the union widens `type` to a
			// MIME string, and Button reads it only on its `<button>` arm.
			type={(type ?? 'button') as ComponentProps<'button'>['type']}
		>
			{children}
		</Button>
	)
}
