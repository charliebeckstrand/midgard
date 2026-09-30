import { Button } from '../../../components/button'
import { Box } from '../../../structure/box'
import { Stack } from '../../../structure/stack'
import { Axes, Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Axes
				of="Box"
				render={(props, label) => (
					// The tint and the subtle outline show the radius when the background is unset or clear.
					// The button shows the density step.
					<Box p="lg" bg="tint" outline="subtle" className="w-40" {...props}>
						<Stack gap="sm">
							<span className="text-sm">{label}</span>
							<Button>Action</Button>
						</Stack>
					</Box>
				)}
			/>

			<Example title="Outline">
				<Stack gap="lg">
					<Box p="lg" bg="surface" radius="lg" outline>
						Default outline
					</Box>
					<Box p="lg" bg="surface" radius="lg" outline="subtle">
						Subtle outline
					</Box>
					<Box p="lg" bg="surface" radius="lg" outline="strong">
						Strong outline
					</Box>
				</Stack>
			</Example>
		</>
	)
}
