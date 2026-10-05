import { Table, TableHead, TableHeader, TableLoading, TableRow } from 'ui/table'

export default function Loading() {
	return (
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
	)
}
