import { Placeholder } from '../../components/placeholder'
import { Example } from '../components/example'

export const meta = { category: 'Feedback' }

export default function PlaceholderDemo() {
	return (
		<div className="space-y-8">
			<Example title="Default">
				<div className="flex flex-col gap-2 sm:max-w-90">
					<Placeholder />
				</div>
			</Example>
		</div>
	)
}
