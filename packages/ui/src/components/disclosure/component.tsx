'use client'

import {
	Collapse,
	CollapsePanel,
	type CollapsePanelProps,
	type CollapseProps,
	CollapseTrigger,
	type CollapseTriggerProps,
} from '../collapse'

export type DisclosureProps = CollapseProps

export function Disclosure(props: DisclosureProps) {
	return <Collapse {...props} />
}

export type DisclosureButtonProps = CollapseTriggerProps

export function DisclosureButton(props: DisclosureButtonProps) {
	return <CollapseTrigger {...props} />
}

export type DisclosurePanelProps = CollapsePanelProps

export function DisclosurePanel(props: DisclosurePanelProps) {
	return <CollapsePanel {...props} />
}
