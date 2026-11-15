/**
 * Ji (字): typography. `size` is the fixed text-size scale, addressable as
 * `ji.size.<key>`. The stepped text size of a density-native component is a
 * ramp, in `dan.text`. A font weight, a line height, and a font family are
 * plain Tailwind classes (`font-medium`, `leading-tight`, `font-mono`).
 */

import { size } from './size'

export const ji = {
	size,
} as const
