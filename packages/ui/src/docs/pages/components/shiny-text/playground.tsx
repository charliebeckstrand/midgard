import { ShinyText, type ShinyTextProps } from 'ui/shiny-text'

export default function ShinyTextPlayground(props: ShinyTextProps) {
	return (
		<ShinyText className="text-3xl font-semibold" {...props}>
			Generating your report
		</ShinyText>
	)
}
