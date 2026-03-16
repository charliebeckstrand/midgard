import { createContext } from '../../core'

export interface DialogContextValue {
	titleId: string
	descriptionId: string
}

export const [DialogProvider, useDialog] = createContext<DialogContextValue>('Dialog')
