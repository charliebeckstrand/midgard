import { AspectRatio } from '../../components/aspect-ratio'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

const placeholder =
	'flex items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'

export default function AspectRatioDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Presets"
				code={code`
					import { AspectRatio } from 'ui/aspect-ratio'

					<AspectRatio ratio="square" />
					<AspectRatio ratio="video" />
					<AspectRatio ratio="16/9" />
					<AspectRatio ratio="4/3" />
					<AspectRatio ratio="3/2" />
					<AspectRatio ratio="21/9" />
				`}
			>
				<div className="grid grid-cols-3 gap-4 max-w-xl">
					<AspectRatio ratio="square" className={placeholder}>
						square
					</AspectRatio>
					<AspectRatio ratio="video" className={placeholder}>
						video
					</AspectRatio>
					<AspectRatio ratio="4/3" className={placeholder}>
						4/3
					</AspectRatio>
					<AspectRatio ratio="3/2" className={placeholder}>
						3/2
					</AspectRatio>
					<AspectRatio ratio="16/9" className={placeholder}>
						16/9
					</AspectRatio>
					<AspectRatio ratio="21/9" className={placeholder}>
						21/9
					</AspectRatio>
				</div>
			</Example>

			<Example
				title="Custom ratio"
				code={code`
					import { AspectRatio } from 'ui/aspect-ratio'

					<AspectRatio ratio={1.618}>
						Golden
					</AspectRatio>
				`}
			>
				<div className="max-w-sm">
					<AspectRatio ratio={1.618} className={placeholder}>
						golden (1.618)
					</AspectRatio>
				</div>
			</Example>
		</div>
	)
}
