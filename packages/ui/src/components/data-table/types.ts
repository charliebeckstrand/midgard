import type { ReactNode } from 'react'

export type DataTableColumn<T> = {
	id: string | number
	title?: ReactNode
	sortable?: boolean
	selectable?: boolean
	actions?: (row: T) => ReactNode
	cell?: (row: T) => ReactNode
	className?: string
	headerClassName?: string
	width?: string
	/** Shown in the column manager but cannot be reordered or hidden. */
	pinned?: boolean
	/** When false, the column cannot be hidden from the column manager. Defaults to true. */
	hideable?: boolean
}

export type DataTableColumnManagerItem = {
	id: string | number
	title: ReactNode
	/** Pinned columns cannot be reordered or hidden. */
	pinned?: boolean
	/** When false, the column cannot be hidden. Defaults to true. */
	hideable?: boolean
}

export type DataTableColumnManagerPreset = {
	order: (string | number)[]
	hidden: (string | number)[]
}
