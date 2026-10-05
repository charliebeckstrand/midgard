import { Button } from 'ui/button'
import { Popover, PopoverContent, PopoverTrigger } from 'ui/popover'
import { GlassProvider } from 'ui/providers/glass'
import { Text } from 'ui/text'

export default function Glass() {
	return (
		<GlassProvider>
			<Popover>
				<PopoverTrigger>
					<Button variant="outline">Delivery</Button>
				</PopoverTrigger>
				<PopoverContent aria-label="Delivery">
					<Text>Arrives Thursday, June 18</Text>
					<Text tone="muted">Orders placed before 2 PM ship the same day.</Text>
				</PopoverContent>
			</Popover>
		</GlassProvider>
	)
}
