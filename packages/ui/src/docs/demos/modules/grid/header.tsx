import { Stack } from '../../../../components/stack'
import { Grid } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { columns, people } from './_data'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example
				title="Sticky header"
				code={code`<Grid header={{ position: 'sticky' }} maxHeight="200px" />`}
			>
				<Grid
					header={{ position: 'sticky' }}
					maxHeight="200px"
					columns={columns}
					rows={[...people, ...people]}
					getKey={(row, i) => `${row.id}-${i}`}
				/>
			</Example>
		</Stack>
	)
}
