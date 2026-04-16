'use client'

import { Card } from '../../components/card'
import { Grid, GridCell, GridDivider } from '../../components/grid'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function GridDemo() {
	return (
		<Stack gap={6}>
			<Example title="Columns">
				<Grid columns={3} gap={4}>
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
					<Card>Four</Card>
					<Card>Five</Card>
					<Card>Six</Card>
				</Grid>
			</Example>

			<Example title="Cell span">
				<Grid columns={4} gap={4}>
					<GridCell span={2}>
						<Card>Span 2</Card>
					</GridCell>
					<Card>One</Card>
					<Card>Two</Card>
					<GridCell span="full">
						<Card>Full width</Card>
					</GridCell>
				</Grid>
			</Example>

			<Example title="Responsive columns">
				<Grid columns={{ initial: 1, sm: 2, lg: 3 }} gap={4}>
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
					<Card>Four</Card>
					<Card>Five</Card>
					<Card>Six</Card>
				</Grid>
			</Example>

			<Example title="Divider">
				<Grid columns={1} gap={4}>
					<Card>Row one</Card>
					<GridDivider />
					<Card>Row two</Card>
					<GridDivider />
					<Card>Row three</Card>
				</Grid>
			</Example>

			<Example title="Alignment">
				<Grid columns={3} gap={4} align="center" justify="center">
					<Card>Short</Card>
					<Card>
						Taller
						<br />
						content
					</Card>
					<Card>Short</Card>
				</Grid>
			</Example>
		</Stack>
	)
}
