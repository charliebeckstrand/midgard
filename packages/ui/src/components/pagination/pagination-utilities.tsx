import { Button, type ButtonProps } from '../button'

/**
 * Plain-variant {@link Button} backing the Previous/Next controls.
 *
 * @remarks
 * Previous/Next sit beside {@link PaginationList} as direct children of the
 * pagination `<nav>`, not inside its `<ol>`.
 *
 * @internal
 */
export function PaginationNavButton({ slot, children, ...props }: { slot: string } & ButtonProps) {
	return (
		<Button data-slot={slot} variant="plain" {...props}>
			{children}
		</Button>
	)
}
