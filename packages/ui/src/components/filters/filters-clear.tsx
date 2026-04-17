'use client'

import { Children, cloneElement, isValidElement } from 'react'
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
		return cloneElement(child, {
			onClick: handleClear,
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
