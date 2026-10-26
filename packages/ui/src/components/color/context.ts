'use client'

import type { Dispatch, SetStateAction } from 'react'
import { createContext } from '../../core'
import type { Hsva } from './types'

export type ColorPanelContextValue = {
	/** Current color as HSVA; the panel's lossless source of truth. */
	hsva: Hsva
	/** Commit a new color; accepts a value or an updater over the previous one. */
	setHsva: Dispatch<SetStateAction<Hsva>>
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
