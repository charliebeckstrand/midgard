'use client'

import { useGlass } from '../../primitives/glass/context'
import { type ControlVariant, useControl } from './context'

/**
 * The surface of a field that draws its own frame: the `variant` prop, else
 * the variant of the enclosing Control. Without either, a field in a
 * GlassProvider takes the `glass` surface, and any other field takes the
 * default of its recipe. Input, Textarea, Wysiwyg, and the FileUpload input
 * read it. A trigger reads {@link useControlSurface}, which takes `outline` in
 * a glass overlay.
 *
 * @param variant - The `variant` prop of the field.
 * @internal
 */
export function useControlVariant(variant?: ControlVariant): ControlVariant | 'glass' | undefined {
	const control = useControl()

	const glass = useGlass()

	return variant ?? control?.variant ?? (glass ? 'glass' : undefined)
}
