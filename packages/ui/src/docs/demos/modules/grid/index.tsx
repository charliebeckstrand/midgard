import { Stack } from '../../../../components/stack'
import { Grid } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { columns, people } from './_data'

export const meta = { name: 'Grid' }

function DefaultExample() {
	return <Grid columns={columns} rows={people} getKey={(row) => row.id} />
}

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Default">
				<DefaultExample />
			</Example>

			<Example title="Striped">
				<Grid striped columns={columns} rows={people} getKey={(row) => row.id} />
			</Example>

			<Example title="Hover">
				<Grid hover columns={columns} rows={people} getKey={(row) => row.id} />
			</Example>

			<Example title="Outline">
				<Grid outline columns={columns} rows={people} getKey={(row) => row.id} />
			</Example>

			<Example
				title="Condensed"
				code={code`<Grid condensed columns={columns} rows={rows} getKey={...} />`}
			>
				<Grid condensed columns={columns} rows={people} getKey={(row) => row.id} />
			</Example>
		</Stack>
	)
}
