'use client'

import { createContext } from '../../core'
import type { Hsva } from './types'
import type { ColorState } from './use-color-state'

export type ColorPanelContextValue = {
	/** Current color as HSVA; the panel's lossless source of truth. */
	hsva: Hsva
	/** Commit a new color; accepts a value or an updater over the previous one. */
	setHsva: (next: Hsva | ((prev: Hsva) => Hsva)) => void
	/** Whether the alpha channel is editable (drives the alpha slider and `#rrggbbaa` output). */
	alpha: boolean
	disabled: boolean
}

/**
 * Provides the live color and its setter from `<ColorPanel>` to the area,
 * sliders, inputs, swatches, and eyedropper.
 */
export const [ColorPanelContext, useColorPanelContext] =
	createContext<ColorPanelContextValue>('ColorPanel')

/**
 * Gives the color state of a `<ColorPicker>` to its inline `<ColorPanel>`. The
 * panel reads and writes this HSVA in place of its own, so the picker and the
 * panel share one color. Thus a hue that hex drops stays after the panel
 * unmounts, and only the emission of the picker is rounded. Outside a picker
 * the value is `null`, and the panel keeps its own state.
 *
 * @internal
 */
export const [SharedColorContext, useSharedColor] = createContext<ColorState | null>(
	'SharedColor',
	{ default: null },
)
