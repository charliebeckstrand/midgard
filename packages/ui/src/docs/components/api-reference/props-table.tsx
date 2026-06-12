'use client'

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../../components/table'
import { Text } from '../../../components/text'
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
						<TableCell className="align-center">
							<span className="font-mono font-medium whitespace-nowrap">
								{prop.name}
								{prop.required && (
									<span className="text-red-600 dark:text-red-400">
										<span aria-hidden>*</span>
										<span className="sr-only">(required)</span>
									</span>
								)}
							</span>
							{prop.description && (
								<Text variant="muted" className="mt-1 text-xs font-sans whitespace-normal">
									{prop.description}
								</Text>
							)}
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
