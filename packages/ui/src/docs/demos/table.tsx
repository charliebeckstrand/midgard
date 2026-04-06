import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../components/table'
import { Example } from '../example'

export const meta = { category: 'Data Display' }

const users = [
	{ name: 'Wade Cooper', email: 'wade@example.com', role: 'Admin' },
	{ name: 'Arlene McCoy', email: 'arlene@example.com', role: 'Editor' },
	{ name: 'Devon Webb', email: 'devon@example.com', role: 'Viewer' },
	{ name: 'Tom Cook', email: 'tom@example.com', role: 'Editor' },
]

const usersCode = `const users = [\n${users.map((u) => `  { name: '${u.name}', email: '${u.email}', role: '${u.role}' },`).join('\n')}\n]`

export default function TableDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={`import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'

${usersCode}

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
        <TableCell>{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>{user.role}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>`}
			>
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
			<Example
				title="Striped"
				code={`import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'

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
</Table>`}
			>
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
		</div>
	)
}
