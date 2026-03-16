import { createContext } from '../../core'

export interface AlertContextValue {
	titleId: string
	descriptionId: string
}

export const [AlertProvider, useAlert] = createContext<AlertContextValue>('Alert')
