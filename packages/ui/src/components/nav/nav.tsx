'use client'

import { type ComponentPropsWithoutRef, useMemo } from 'react'
import { type CurrentContextValue, CurrentProvider } from '../../primitives/current'

export type NavProps = Omit<ComponentPropsWithoutRef<'nav'>, 'onChange'> & {
	value?: string
	onValueChange?: (value: string) => void
}

export function Nav({ value, onValueChange, className, children, ...props }: NavProps) {
	const context = useMemo<CurrentContextValue>(
		() => ({ value, onValueChange }),
		[value, onValueChange],
	)

	return (
		<CurrentProvider value={context}>
			<nav data-slot="nav" className={className} {...props}>
				{children}
			</nav>
		</CurrentProvider>
	)
}
