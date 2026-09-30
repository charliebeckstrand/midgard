import { Button } from '../../../components/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { Text } from '../../../components/text'
import { Axes } from '../../engine'

export function Demo() {
	return (
		<>
			<Axes
				of="Popover"
				omit={['open', 'defaultOpen']}
				render={(props, label) => (
					<Popover {...props}>
						<PopoverTrigger>
							<Button variant="outline">{label}</Button>
						</PopoverTrigger>

						<PopoverContent>
							<Text>Popover content</Text>
							<Text tone="muted">This is a general-purpose floating container.</Text>
						</PopoverContent>
					</Popover>
				)}
			/>

			<Axes
				of="PopoverContent"
				title="Popover content"
				render={(props, label) => (
					<Popover>
						<PopoverTrigger>
							<Button variant="outline">{label}</Button>
						</PopoverTrigger>

						<PopoverContent {...props}>
							<Text>Popover content</Text>
							<Text tone="muted">This is a general-purpose floating container.</Text>

							<Button variant="outline">Action</Button>
						</PopoverContent>
					</Popover>
				)}
			/>
		</>
	)
}
