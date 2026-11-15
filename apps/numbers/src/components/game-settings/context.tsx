'use client'

import type { ReactNode } from 'react'
import { createContext } from 'ui/core'
import type { GameSettings } from '../../utilities/settings'

const [ServerSettingsContext, useServerSettings] = createContext<GameSettings>('ServerSettings')

export { useServerSettings }

/** Props for {@link GameSettingsProvider}. */
export type GameSettingsProviderProps = {
	/** The settings of the cookies of the request. */
	settings: GameSettings
	children: ReactNode
}

/** Gives the settings of the request to the server render and to the hydration of `useGameSetting`. */
export function GameSettingsProvider({ settings, children }: GameSettingsProviderProps) {
	return <ServerSettingsContext value={settings}>{children}</ServerSettingsContext>
}
