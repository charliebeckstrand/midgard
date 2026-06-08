'use client'

import { type ComponentPropsWithoutRef, useRef } from 'react'
import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { useTabPanelTabIndex } from './use-tab-panel-tab-index'

export type TabPanelsProps = SlotProps<'div'>

export const TabPanels = createSlot('div', 'tab-panels')

export type TabPanelProps = {
	/** Matches the corresponding Tab's id for aria-labelledby. */
	id?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'id'>

export function TabPanel({ id, className, ...props }: TabPanelProps) {
	const ref = useRef<HTMLDivElement>(null)

	// Focusable only when the panel has no focusable child, so it stays
	// keyboard-reachable without adding a redundant tab stop.
	const tabIndex = useTabPanelTabIndex(ref)

	return (
		<div
			ref={ref}
			data-slot="tab-panel"
			role="tabpanel"
			id={id ? `${id}-panel` : undefined}
			aria-labelledby={id}
			tabIndex={tabIndex}
			className={className}
			{...props}
		/>
	)
}
