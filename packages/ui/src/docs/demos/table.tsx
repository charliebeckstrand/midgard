import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../components/table'

export const meta = { category: 'Data Display' }

const users = [
	{ name: 'Wade Cooper', email: 'wade@example.com', role: 'Admin' },
	{ name: 'Arlene McCoy', email: 'arlene@example.com', role: 'Editor' },
	{ name: 'Devon Webb', email: 'devon@example.com', role: 'Viewer' },
	{ name: 'Tom Cook', email: 'tom@example.com', role: 'Editor' },
]

export default function TableDemo() {
	return (
		<div className="space-y-6">
			<Table>
				<TableHead>
					<TableRow>
						<TableHeader>Name</TableHeader>
						<TableHeader>Email</TableHeader>
						<TableHeader>Role</TableHeader>
					</TableRow>
				</TableHead>
				<TableBody>
					{users.map((user) => (
						<TableRow key={user.email}>
							<TableCell className="font-medium">{user.name}</TableCell>
							<TableCell>{user.email}</TableCell>
							<TableCell>{user.role}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Striped</p>
				<Table striped>
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
			</div>
		</div>
	)
}
