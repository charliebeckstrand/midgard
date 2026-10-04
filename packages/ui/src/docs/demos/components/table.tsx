import {
	Table,
	TableBody,
	TableCell,
	TableEmpty,
	TableHead,
	TableHeader,
	TableLoading,
	TableRow,
} from '../../../components/table'
import { Axes, Example } from '../../engine'

const users = [
	{ name: 'Wade Cooper', email: 'wade@example.com', role: 'Admin' },
	{ name: 'Arlene McCoy', email: 'arlene@example.com', role: 'Editor' },
	{ name: 'Devon Webb', email: 'devon@example.com', role: 'Viewer' },
]

export default function Demo() {
	return (
		<>
			<Axes
				of="Table"
				omit={['bleed']}
				render={(props) => (
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
				)}
			/>

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
