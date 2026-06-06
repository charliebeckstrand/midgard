'use client'

import { createContext } from '../../core'
import type { ControlSize } from '../control/context'
import type { Hsva } from './types'

export type ColorPanelContextValue = {
	/** Current colour as HSVA — the panel's lossless source of truth. */
	hsva: Hsva
	/** Commit a new colour; accepts a value or an updater over the previous one. */
	setHsva: (next: Hsva | ((prev: Hsva) => Hsva)) => void
	/** Whether the alpha channel is editable (drives the alpha slider and `#rrggbbaa` output). */
	alpha: boolean
	disabled: boolean
	size: ControlSize
}

/**
 * Shares the live colour and its setter from `<ColorPanel>` down to the area,
 * sliders, inputs, swatches, and eyedropper — they each read and write the same
 * HSVA without the panel threading props through every part.
 */
export const [ColorPanelContext, useColorPanelContext] =
	createContext<ColorPanelContextValue>('ColorPanel')
