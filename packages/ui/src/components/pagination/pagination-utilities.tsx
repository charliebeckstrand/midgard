import { Button, type ButtonProps } from '../button'

// Previous/Next sit beside <PaginationList>, not inside its <ol>, so they must
// not be <li> — an <li> with no list parent is a listitem violation. They render
// as plain buttons, valid children of the pagination <nav>.
export function PaginationNavButton({ slot, children, ...props }: { slot: string } & ButtonProps) {
	return (
		<Button data-slot={slot} variant="plain" {...props}>
			{children}
		</Button>
	)
}
