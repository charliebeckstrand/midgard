'use client'

import { createContext } from '../../core'
import type { DensityStep } from '../../core/density'

/**
 * The density context: the step of the nearest density scope under the root,
 * or `null` outside each such scope. It carries the same value as the
 * `data-density` attribute of that scope. The root element is the scope of the
 * app, and the context does not hold it. A client component reads the context
 * only when it needs the step as a JS value. A stepped `density-*` class reads
 * the step in CSS. {@link Density} provides it.
 *
 * `useDensityScope` reads the step of the nearest scope, or `null` outside each
 * such scope. Use it when "no scope" must differ from a step. A `Portal` writes
 * the step of its scope, and it writes nothing at the root, so its panel
 * follows the root element. Each other reader uses {@link useDensityStep}.
 */
export const [DensityContext, useDensityScope] = createContext<DensityStep | null>('Density', {
	default: null,
})
