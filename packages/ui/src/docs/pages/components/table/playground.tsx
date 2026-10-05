import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	type TableProps,
	TableRow,
} from 'ui/table'

const users = [
	{ name: 'Wade Cooper', email: 'wade@example.com', role: 'Admin' },
	{ name: 'Arlene McCoy', email: 'arlene@example.com', role: 'Editor' },
	{ name: 'Devon Webb', email: 'devon@example.com', role: 'Viewer' },
]

export default function TablePlayground(props: TableProps) {
	return (
		<Table {...props}>
			<TableHead>
				<TableRow>
					<TableHeader>Name</TableHeader>
					<TableHeader>Role</TableHeader>
				</TableRow>
			</TableHead>
			<TableBody>
				{users.map((user) => (
					<TableRow key={user.email}>
						<TableCell>{user.name}</TableCell>
						<TableCell>{user.role}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
