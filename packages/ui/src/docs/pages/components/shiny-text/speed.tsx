import { ShinyText } from 'ui/shiny-text'
import { Stack } from 'ui/stack'

const speeds = [1, 2, 4] as const

export default function Speed() {
	return (
		<Stack gap="sm" align="start">
			{speeds.map((speed) => (
				<ShinyText key={speed} speed={speed} className="text-3xl font-semibold">
					{speed === 1 ? '1 second per sweep' : `${speed} seconds per sweep`}
				</ShinyText>
			))}
		</Stack>
	)
}
