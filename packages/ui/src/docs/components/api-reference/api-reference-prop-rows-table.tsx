'use client'

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../../components/table'
import type { PropDef } from '../../component-api'
import { TypeCell } from './api-reference-type-cell'

export function PropRowsTable({ rows }: { rows: PropDef[] }) {
	return (
		<Table>
			<TableHead>
				<TableRow>
					<TableHeader className="whitespace-nowrap">Prop</TableHeader>
					<TableHeader>Type</TableHeader>
					<TableHeader>Default</TableHeader>
				</TableRow>
			</TableHead>
			<TableBody>
				{rows.map((prop) => (
					<TableRow key={prop.name}>
						<TableCell className="font-mono font-medium align-center whitespace-nowrap">
							{prop.name}
						</TableCell>
						<TableCell className="w-full">
							<TypeCell
								name={prop.name}
								type={prop.type}
								references={prop.references}
								externalFrom={prop.externalFrom}
							/>
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
