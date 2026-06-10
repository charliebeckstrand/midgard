'use client'

import { createContext } from '../../core'
import type { ControlSize } from '../control/context'
import type { Hsva } from './types'

export type ColorPanelContextValue = {
	/** Current colour as HSVA; the panel's lossless source of truth. */
	hsva: Hsva
	/** Commit a new colour; accepts a value or an updater over the previous one. */
	setHsva: (next: Hsva | ((prev: Hsva) => Hsva)) => void
	/** Whether the alpha channel is editable (drives the alpha slider and `#rrggbbaa` output). */
	alpha: boolean
	disabled: boolean
	size: ControlSize
}

/**
 * Provides the live colour and its setter from `<ColorPanel>` to the area,
 * sliders, inputs, swatches, and eyedropper.
 */
export const [ColorPanelContext, useColorPanelContext] =
	createContext<ColorPanelContextValue>('ColorPanel')
