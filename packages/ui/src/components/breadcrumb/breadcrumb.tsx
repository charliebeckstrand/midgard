'use client'

import type { ComponentPropsWithoutRef } from 'react'

export type BreadcrumbProps = ComponentPropsWithoutRef<'nav'>

/**
 * Navigation landmark for a trail of links. Each crumb is an ordinary,
 * individually Tab-focusable link — no roving keyboard model (matching `Nav`).
 */
export function Breadcrumb({ className, ...props }: BreadcrumbProps) {
	return <nav data-slot="breadcrumb" aria-label="Breadcrumb" className={className} {...props} />
}
