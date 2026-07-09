import { Stack } from '../../../../components/stack'
import { Grid } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { columns, people } from './_data'

const ResizableExample = () => (
	<Grid resizable columns={columns} rows={people} getKey={(row) => row.id} />
)

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Resizable columns" code={code`<Grid resizable columns={columns} />`}>
				<ResizableExample />
			</Example>
		</Stack>
	)
}
