'use client'

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../../components/table'
import type { PropDef } from '../../api-reference/types'
import { TypeCell } from './type-cell'

export function PropsTable({ rows }: { rows: PropDef[] }) {
	return (
		<Table>
			<TableHead>
				<TableRow>
					<TableHeader className="w-1/4">Prop</TableHeader>
					<TableHeader className="w-1/2">Type</TableHeader>
					<TableHeader className="w-1/4">Default</TableHeader>
				</TableRow>
			</TableHead>
			<TableBody>
				{rows.map((prop) => (
					<TableRow key={prop.name}>
						<TableCell className="font-mono font-medium align-center whitespace-nowrap">
							{prop.name}
						</TableCell>
						<TableCell>
							<TypeCell prop={prop} />
						</TableCell>
						<TableCell className="font-mono text-zinc-500 dark:text-zinc-400 align-center whitespace-nowrap">
							{prop.default ?? '—'}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
