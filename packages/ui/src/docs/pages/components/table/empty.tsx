import { Table, TableEmpty, TableHead, TableHeader, TableRow } from 'ui/table'

export default function Empty() {
	return (
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
	)
}
