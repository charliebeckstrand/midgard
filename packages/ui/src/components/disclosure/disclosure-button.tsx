'use client'

import { CollapseTrigger, type CollapseTriggerProps } from '../collapse'

export type DisclosureButtonProps = CollapseTriggerProps

export function DisclosureButton(props: DisclosureButtonProps) {
	return <CollapseTrigger {...props} />
}
