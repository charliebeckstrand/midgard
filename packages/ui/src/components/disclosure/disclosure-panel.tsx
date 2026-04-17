'use client'

import { CollapsePanel, type CollapsePanelProps } from '../collapse'

export type DisclosurePanelProps = CollapsePanelProps

export function DisclosurePanel(props: DisclosurePanelProps) {
	return <CollapsePanel {...props} />
}
