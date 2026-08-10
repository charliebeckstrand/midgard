/**
 * The one map from a mark's shape to the {@link Swatch} that stands for it in
 * the readouts. The legend and the tooltip both key a swatch off a mark, and
 * `MapSwatchShape` exists so that a new mark shape must reach both or neither
 * (`engine/types.ts`) — which a table declared once in each file cannot hold.
 *
 * Outside `engine/` deliberately: it names a component's prop type, and the
 * engine owns no component vocabulary.
 */

import type { SwatchProps } from '../../components/swatch'
import type { MapSwatchShape } from './engine/types'

/**
 * The {@link Swatch} shape each mark shape reads out as: a square for the two
 * marks that draw an area, a line for a route and a marker, a circle for a
 * point.
 *
 * @internal
 */
export const mapSwatchShapes = {
	rect: 'square',
	line: 'line',
	dot: 'circle',
} as const satisfies Record<MapSwatchShape, NonNullable<SwatchProps['shape']>>
