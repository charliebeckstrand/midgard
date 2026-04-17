'use client'

import { Collapse, type CollapseProps } from '../collapse'

export type DisclosureProps = CollapseProps

export function Disclosure(props: DisclosureProps) {
	return <Collapse {...props} />
}
