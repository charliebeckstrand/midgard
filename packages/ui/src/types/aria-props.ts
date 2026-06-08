import type { AriaAttributes, AriaRole } from 'react'

/**
 * A spreadable bag of accessibility-identity props to apply to an element: every
 * `aria-*` attribute, plus `role` and `id` (the anchor that `aria-controls` /
 * `aria-labelledby` / `aria-describedby` reference). The shape a hook returns
 * once it has resolved an element's role and labelling/relationship refs, for
 * the consumer to spread wholesale (`<div {...ariaProps} />`). All optional, so
 * any producer fills only the parts it owns; intersect with required fields
 * (`AriaProps & { id: string }`) where a relationship must be guaranteed.
 */
export type AriaProps = AriaAttributes & {
	role?: AriaRole
	id?: string
}
