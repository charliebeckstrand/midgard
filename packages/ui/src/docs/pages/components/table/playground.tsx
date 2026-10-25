import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	type TableProps,
	TableRow,
} from 'ui/table'
import { profiles, roles } from '../../../data/people.ts'

const users = profiles.slice(0, 3)

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
						<TableCell>{roles[user.role]}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
