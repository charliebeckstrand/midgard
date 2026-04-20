'use client'

import { Children, cloneElement, isValidElement, type MouseEvent } from 'react'
import { useFilters } from './context'

// ── FiltersClear ───────────────────────────────────

export type FiltersClearProps = {
	children: React.ReactNode
	className?: string
}

export function FiltersClear({ children, className }: FiltersClearProps) {
	const { clear: handleClear } = useFilters()

	const child = Children.only(children)

	if (isValidElement<Record<string, unknown>>(child)) {
		const childOnClick = child.props.onClick as ((e: MouseEvent<HTMLElement>) => void) | undefined

		return cloneElement(child, {
			onClick: (e: MouseEvent<HTMLElement>) => {
				childOnClick?.(e)

				handleClear()
			},
			className: className
				? `${(child.props.className as string) ?? ''} ${className}`.trim()
				: child.props.className,
		})
	}

	return (
		<button data-slot="filter-clear" type="button" onClick={handleClear} className={className}>
			{children}
		</button>
	)
}
