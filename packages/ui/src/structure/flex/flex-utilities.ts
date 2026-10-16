import { mapResponsive } from '../../types/responsive'
import type { FlexAlign, FlexDirection, ResponsiveAlign, ResponsiveDirection } from './variants'

/**
 * Cross-axis default for a single direction: rows center their children;
 * columns stretch theirs to fill the inline axis (`align-items: stretch`). An
 * explicit `align` overrides either.
 *
 * @internal
 */
function alignForDirection(direction: FlexDirection): FlexAlign {
	return direction === 'col' || direction === 'col-reverse' ? 'stretch' : 'center'
}

/**
 * Derives the cross-axis `align` default from `direction`, preserving the
 * responsive shape. A plain direction yields a plain align, and an object
 * yields an align per provided breakpoint.
 *
 * @internal
 */
export function defaultAlignFromDirection(direction: ResponsiveDirection): ResponsiveAlign {
	return mapResponsive(direction, alignForDirection)
}
