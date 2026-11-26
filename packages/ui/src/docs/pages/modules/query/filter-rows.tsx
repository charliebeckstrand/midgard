import { useState } from 'react'
import { evaluateQuery, QueryBuilder, type QueryGroup } from 'ui/query'
import { Stack } from 'ui/stack'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from 'ui/table'
import { fields, members, seed } from './data.ts'

const statuses = fields.find((field) => field.name === 'status')?.options ?? []

// `evaluateQuery` tells if one row matches the query. It reads each field of
// the row through `getValue`, so the rows can have any shape.
export default function FilterRows() {
	const [query, setQuery] = useState<QueryGroup>(seed)

	const matches = members.filter((member) =>
		evaluateQuery(query, (field) => member[field as keyof typeof member]),
	)

	return (
		<Stack gap="md">
			<QueryBuilder fields={fields} value={query} onValueChange={setQuery} />
			<Table>
				<TableHead>
					<TableRow>
						<TableHeader>Name</TableHeader>
						<TableHeader>Age</TableHeader>
						<TableHeader>Status</TableHeader>
					</TableRow>
				</TableHead>
				{matches.length === 0 ? (
					<TableEmpty columns={3} />
				) : (
					<TableBody>
						{matches.map((member) => (
							<TableRow key={member.name}>
								<TableCell>{member.name}</TableCell>
								<TableCell>{member.age}</TableCell>
								<TableCell>
									{statuses.find((status) => status.value === member.status)?.label}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				)}
			</Table>
		</Stack>
	)
}
