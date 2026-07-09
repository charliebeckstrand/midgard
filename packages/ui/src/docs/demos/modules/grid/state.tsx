import { Alert } from '../../../../components/alert'
import { Stack } from '../../../../components/stack'
import { Grid } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { columns, people } from './_data'

const ErrorExample = () => {
	// `error` shows in place of the body — for a failed fetch — taking precedence
	// over rows and the empty slot.
	return (
		<Grid
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			error={<Alert color="red" variant="soft" title="Couldn't load people" block />}
		/>
	)
}

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Loading">
				<Grid loading columns={columns} rows={[]} getKey={(row) => row.id} />
			</Example>

			<Example title="Empty">
				<Grid columns={columns} rows={[]} getKey={(row) => row.id} />
			</Example>

			<Example title="Error" code={code`<Grid error={<Alert ... />} />`}>
				<ErrorExample />
			</Example>
		</Stack>
	)
}
