import { Placeholder } from '../../components/placeholder'
import { Example } from '../components/example'

export const meta = { category: 'Feedback' }

export default function PlaceholderDemo() {
	return (
		<div className="space-y-8">
			<Example title="Line (default)">
				<div className="flex flex-col gap-2 lg:max-w-sm">
					<Placeholder />
					<Placeholder className="max-w-[70%]" />
					<Placeholder className="max-w-[50%]" />
				</div>
			</Example>

			<Example title="Rectangle">
				<div className="flex flex-col gap-2 lg:max-w-sm">
					<Placeholder className="h-10" />
					<Placeholder className="h-24" />
				</div>
			</Example>

			<Example title="Circle">
				<div className="flex items-center gap-2 lg:max-w-sm">
					<Placeholder className="size-8 rounded-full" />
					<Placeholder className="size-10 rounded-full" />
					<Placeholder className="size-12 rounded-full" />
				</div>
			</Example>

			<Example title="Composed">
				<div className="flex items-start gap-3">
					<Placeholder className="size-10 rounded-full" />
					<div className="flex-1 space-y-2 lg:max-w-sm">
						<Placeholder className="max-w-[40%]" />
						<Placeholder />
						<Placeholder className="max-w-[80%]" />
					</div>
				</div>
			</Example>
		</div>
	)
}
