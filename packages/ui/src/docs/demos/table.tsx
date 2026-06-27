import {
	Table,
	TableBody,
	TableCell,
	TableEmpty,
	TableHead,
	TableHeader,
	TableLoading,
	TableRow,
} from '../../components/table'
import { Example } from '../engine'

const users = [
	{ name: 'Wade Cooper', email: 'wade@example.com', role: 'Admin' },
	{ name: 'Arlene McCoy', email: 'arlene@example.com', role: 'Editor' },
	{ name: 'Devon Webb', email: 'devon@example.com', role: 'Viewer' },
	{ name: 'Tom Cook', email: 'tom@example.com', role: 'Editor' },
]

export function Demo() {
	return (
		<>
			<Example title="Default">
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
			</Example>

			<Example title="Striped">
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
			</Example>

			<Example title="Hover">
				<Table hover>
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
			</Example>

			<Example title="Outline">
				<Table outline>
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
								<TableCell>{user.name}</TableCell>
								<TableCell>{user.email}</TableCell>
								<TableCell>{user.role}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Example>

			<Example title="Loading">
				<Table>
					<TableHead>
						<TableRow>
							<TableHeader>Name</TableHeader>
							<TableHeader>Email</TableHeader>
							<TableHeader>Role</TableHeader>
						</TableRow>
					</TableHead>
					<TableLoading columns={3} />
				</Table>
			</Example>

			<Example title="Empty">
				<Table>
					<TableHead>
						<TableRow>
							<TableHeader>Name</TableHeader>
							<TableHeader>Email</TableHeader>
							<TableHeader>Role</TableHeader>
						</TableRow>
					</TableHead>
					<TableEmpty columns={3} />
				</Table>
			</Example>
		</>
	)
}
