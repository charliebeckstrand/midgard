import { ShinyText } from 'ui/shiny-text'
import { Stack } from 'ui/stack'

const palettes = [
	{ label: 'Zinc', color: undefined, shineColor: undefined },
	{ label: 'Amber', color: 'var(--color-amber-600)', shineColor: 'var(--color-amber-200)' },
	{ label: 'Violet', color: 'var(--color-violet-600)', shineColor: 'var(--color-violet-200)' },
	{ label: 'Sky', color: 'var(--color-sky-600)', shineColor: 'var(--color-sky-200)' },
] as const

export default function Colors() {
	return (
		<Stack gap="sm" align="start">
			{palettes.map((palette) => (
				<ShinyText
					key={palette.label}
					color={palette.color}
					shineColor={palette.shineColor}
					className="text-3xl font-semibold"
				>
					{palette.label}
				</ShinyText>
			))}
		</Stack>
	)
}
