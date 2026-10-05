import { Button } from 'ui/button'
import { Popover, PopoverContent, type PopoverProps, PopoverTrigger } from 'ui/popover'
import { Text } from 'ui/text'

export default function PopoverPlayground(props: PopoverProps) {
	return (
		<Popover {...props}>
			<PopoverTrigger>
				<Button variant="outline">Delivery</Button>
			</PopoverTrigger>
			<PopoverContent aria-label="Delivery">
				<Text>Arrives Thursday, June 18</Text>
				<Text tone="muted">Orders placed before 2 PM ship the same day.</Text>
			</PopoverContent>
		</Popover>
	)
}
