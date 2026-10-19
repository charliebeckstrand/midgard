'use client'

import { type UseSortableArguments, useSortable } from '@dnd-kit/sortable'
import { reorderMessages } from '../primitives/intl/intl-reorder'
import { useIntl } from '../primitives/intl/use-intl'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'

/**
 * dnd-kit `useSortable` that honors the reduced-motion preference. When the
 * reader asks for reduced motion, the returned `transition` is `undefined`, so
 * a displaced item moves to its new slot at once (WCAG 2.3.3).
 *
 * @remarks
 * dnd-kit writes its reflow transition (`transform 200ms ease`) as an inline
 * style, and an inline style beats a `motion-reduce:` class. So the hook gives
 * dnd-kit `transition: null` instead. Each sortable that renders the returned
 * `transition` uses this hook.
 *
 * The role description of the item is in the language of the reader. The
 * `attributes` of the caller can replace it.
 *
 * @internal
 */
export function useMotionSafeSortable(args: UseSortableArguments) {
	const still = usePrefersReducedMotion()

	const intl = useIntl()

	const attributes = {
		roleDescription: intl.formatMessage(reorderMessages.sortableRole),
		...args.attributes,
	}

	return useSortable(still ? { ...args, attributes, transition: null } : { ...args, attributes })
}
