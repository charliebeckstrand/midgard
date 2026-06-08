import { Button, type ButtonProps } from '../button'

// Previous/Next sit beside `<PaginationList>` as direct children of the
// pagination `<nav>`, not inside its `<ol>` — rendered as plain buttons.
export function PaginationNavButton({ slot, children, ...props }: { slot: string } & ButtonProps) {
	return (
		<Button data-slot={slot} variant="plain" {...props}>
			{children}
		</Button>
	)
}
