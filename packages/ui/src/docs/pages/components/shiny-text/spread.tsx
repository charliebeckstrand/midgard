import { ShinyText } from 'ui/shiny-text'

const spreads = [40, 120, 200] as const

export default function Spread() {
	return (
		<>
			{spreads.map((spread) => (
				<ShinyText key={spread} spread={spread} className="text-3xl font-semibold tabular-nums">
					{spread}°
				</ShinyText>
			))}
		</>
	)
}
