import api from 'virtual:docs/api/components/rating'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import HalfStars from './half-stars.tsx'
import InAForm from './in-a-form.tsx'
import NamedLevels from './named-levels.tsx'
import RatingPlayground from './playground.tsx'
import ReviewAverages from './review-averages.tsx'
import StarCount from './star-count.tsx'

export default function RatingPage() {
	return (
		<>
			<Playground of={RatingPlayground} api={api} />
			<Example of={Controlled} />
			<Example of={HalfStars} />
			<Example of={ReviewAverages} />
			<Example of={StarCount} />
			<Example of={NamedLevels} />
			<Example of={InAForm} />
			<ApiTable api={api} />
		</>
	)
}
