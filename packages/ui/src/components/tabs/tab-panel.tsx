'use client'

import { type ComponentPropsWithoutRef, useRef } from 'react'
import { cn, createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/tabs'
import { useTabPanelTabIndex } from './use-tab-panel-tab-index'

/** Props for {@link TabPanels}. */
export type TabPanelsProps = SlotProps<'div'>

/** Passthrough wrapper grouping manually-wired `<TabPanel>` elements; merges into its child via `asChild`. */
export const TabPanels = createSlot('div', 'tab-panels')

/** Props for {@link TabPanel}. */
export type TabPanelProps = {
	/** Matches the corresponding Tab's id for aria-labelledby. */
	id?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'id'>

/**
 * Manually-wired tab panel for use without `<TabContent>`: emits
 * `role="tabpanel"`, derives its id from the paired `<Tab id>` (`${id}-panel`),
 * sets `aria-labelledby`, and computes `tabIndex` (`0` only when the panel has
 * no focusable child, per APG). A content-only panel that becomes tab-focusable
 * signals focus with the design-system blue ring rather than the browser default.
 */
export function TabPanel({ id, className, ...props }: TabPanelProps) {
	const ref = useRef<HTMLDivElement>(null)

	// `0` only when the panel has no focusable child.
	const tabIndex = useTabPanelTabIndex(ref)

	return (
		<div
			ref={ref}
			data-slot="tab-panel"
			role="tabpanel"
			id={id ? `${id}-panel` : undefined}
			aria-labelledby={id}
			tabIndex={tabIndex}
			className={cn(k.panel, className)}
			{...props}
		/>
	)
}
