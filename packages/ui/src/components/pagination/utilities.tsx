'use client'

import { Button, type ButtonProps } from '../button'

export function PaginationNavButton({ slot, children, ...props }: { slot: string } & ButtonProps) {
	return (
		<li>
			<Button data-slot={slot} variant="plain" {...props}>
				{children}
			</Button>
		</li>
	)
}
