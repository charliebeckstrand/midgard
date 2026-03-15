import type { ReactNode } from 'react'

export interface DocEntry {
	slug: string
	title: string
}

export interface ClientProps {
	children: ReactNode
	guides: DocEntry[]
	reference: DocEntry[]
}
