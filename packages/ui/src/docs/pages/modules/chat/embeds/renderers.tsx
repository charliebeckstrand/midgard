import type { ChatEmbedRenderer } from 'ui/chat'
import { Sparkline } from 'ui/sparkline'

export const renderers = {
	'stops-trend': (part) => (
		<Sparkline
			data={part.data as number[]}
			shape="bar"
			color="blue"
			width={160}
			aria-label="Late stops per day over the last week"
		/>
	),
} satisfies Record<string, ChatEmbedRenderer>
