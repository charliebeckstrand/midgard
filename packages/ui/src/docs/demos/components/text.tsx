import { Text } from '../../../components/text'
import { Axes } from '../../engine'

export function Demo() {
	return (
		<Axes
			of="Text"
			captions={false}
			render={(props, label) => (
				<Text {...props}>{label} - The lazy dog jumps over the quick brown fox.</Text>
			)}
		/>
	)
}
