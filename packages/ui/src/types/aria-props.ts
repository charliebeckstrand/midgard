import type { AriaAttributes, AriaRole } from 'react'

/**
 * A spreadable bag of ARIA attributes (plus `role`) to apply to an element.
 * The shape a hook returns when it has resolved an element's accessibility
 * identity — role and labelling/relationship refs — for the consumer to spread
 * wholesale (`<div {...ariaProps} />`). All optional, so any producer can fill
 * only the parts it owns and any consumer can spread it uniformly.
 */
export type AriaProps = AriaAttributes & {
	role?: AriaRole
}
