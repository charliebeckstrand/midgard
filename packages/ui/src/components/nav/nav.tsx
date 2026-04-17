'use client'

import { useMemo } from 'react'
import { type CurrentContextValue, CurrentProvider } from '../../primitives'

// ── Nav ─────────────────────────────────────────────

export type NavProps = Omit<React.ComponentPropsWithoutRef<'nav'>, 'onChange'> & {
	value?: string
	onChange?: (value: string) => void
}

export function Nav({ value, onChange, className, children, ...props }: NavProps) {
	const ctx = useMemo<CurrentContextValue>(() => ({ value, onChange }), [value, onChange])

	return (
		<CurrentProvider value={ctx}>
			<nav data-slot="nav" className={className} {...props}>
				{children}
			</nav>
		</CurrentProvider>
	)
}
