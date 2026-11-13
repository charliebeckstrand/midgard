import { Alert } from 'ui/alert'
import { Grid } from 'ui/grid'
import { columns } from '../data.tsx'

export default function ErrorState() {
	// The error shows in place of the rows, as for a failed request.
	return (
		<Grid
			columns={columns}
			rows={[]}
			getKey={(row) => row.id}
			error={
				<Alert
					severity="error"
					variant="soft"
					icon={false}
					title="Couldn't load people"
					className="w-full"
				/>
			}
		/>
	)
}
