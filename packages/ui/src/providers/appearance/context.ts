'use client'

import { createContext } from '../../core/create-context'
import type { DensityLevel } from '../density/context'
import type { MotionMode, SidebarMode, SurfaceMode, ThemeMode } from './modes'

/** Appearance state and setters that {@link useAppearance} returns. */
export type AppearanceContextValue = {
	theme: ThemeMode
	density: DensityLevel
	motion: MotionMode
	sidebar: SidebarMode
	surfaces: SurfaceMode
	setTheme: (theme: ThemeMode) => void
	setDensity: (density: DensityLevel) => void
	setMotion: (motion: MotionMode) => void
	setSidebar: (sidebar: SidebarMode) => void
	setSurfaces: (surfaces: SurfaceMode) => void
}

/**
 * Reads the persisted theme, density, motion, sidebar, and surfaces from the nearest
 * `<AppearanceProvider>`, with their setters. Throws outside a provider.
 */
export const [AppearanceContext, useAppearance] = createContext<AppearanceContextValue>(
	'Appearance',
	{ error: 'useAppearance must be used within <AppearanceProvider>' },
)
