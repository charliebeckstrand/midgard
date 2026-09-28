'use client'

import { createContext } from '../../core'
import type { ButtonVariants } from '../../recipes/kata/button'

/**
 * The `variant` and the `color` that a {@link Button} takes when it gives none
 * of its own. A surface with its own palette, such as an alert, sets them for
 * the buttons in it.
 *
 * @internal
 */
export type ButtonDefaults = Pick<ButtonVariants, 'variant' | 'color'>

/**
 * Sets the {@link ButtonDefaults} of the buttons under it. A prop on a button
 * wins over its default.
 *
 * @internal
 */
export const [ButtonDefaultsContext, useButtonDefaults] = createContext<ButtonDefaults>(
	'ButtonDefaults',
	{ default: {} },
)
