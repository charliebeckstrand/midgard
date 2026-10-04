'use client'

import type { ReactNode } from 'react'
import { createContext } from '../../core'
import { usePortalScope } from '../../primitives/portal/context'
import type { ButtonVariants } from '../../recipes/kata/button'

/**
 * The `variant` and the `color` that a {@link Button} takes when it gives none
 * of its own. A surface with its own palette, such as an alert, sets them for
 * the buttons in it.
 *
 * @internal
 */
export type ButtonDefaults = Pick<ButtonVariants, 'variant' | 'color'>

/** The defaults of a surface, and the portal scope of the place that sets them. @internal */
type SurfaceDefaults = ButtonDefaults & { scope: string | null }

const [SurfaceDefaultsContext, useSurfaceDefaults] = createContext<SurfaceDefaults | null>(
	'ButtonDefaults',
	{ default: null },
)

/**
 * Sets the {@link ButtonDefaults} of the buttons under it. A prop on a button
 * wins over its default.
 *
 * @remarks
 * The defaults stop at a portal. A dialog or a popover that a button under the
 * provider opens is another surface, so its buttons take the defaults of the
 * recipe.
 *
 * @internal
 */
export function ButtonDefaultsProvider({
	value,
	children,
}: {
	value: ButtonDefaults
	children: ReactNode
}) {
	const scope = usePortalScope()

	return <SurfaceDefaultsContext value={{ ...value, scope }}>{children}</SurfaceDefaultsContext>
}

/**
 * Whether a variant paints a fill. An unset variant is `solid`, the default of
 * the recipe.
 *
 * @internal
 */
function hasFill(variant: ButtonDefaults['variant']): boolean {
	return variant === undefined || variant === 'solid' || variant === 'soft'
}

/**
 * Resolves the `variant` and the `color` of a button against the
 * {@link ButtonDefaults} of the surface around it. A prop wins over a default.
 *
 * @remarks
 * The `inherit` color takes the text color of the surface and paints no fill.
 * A button with a fill thus does not take `inherit` from a surface. It takes
 * the color of the recipe.
 *
 * @returns The `variant` and the `color` to give the recipe.
 * @internal
 */
export function useButtonDefaults({ variant, color }: ButtonDefaults): ButtonDefaults {
	const surface = useSurfaceDefaults()

	const scope = usePortalScope()

	if (surface === null || surface.scope !== scope) return { variant, color }

	const resolvedVariant = variant ?? surface.variant

	const surfaceColor =
		surface.color === 'inherit' && hasFill(resolvedVariant) ? undefined : surface.color

	return { variant: resolvedVariant, color: color ?? surfaceColor }
}
