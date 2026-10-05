import { Swatch, type SwatchProps } from 'ui/swatch'

export default function SwatchPlayground(props: SwatchProps) {
	return <Swatch color="blue" label="Blue" {...props} />
}
