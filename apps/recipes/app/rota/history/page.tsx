import { Suspense } from 'react'
import { RotaHistory } from '@/components/rota-history'

/** The month calendar, over the same two records the board draws. */
export default function Page() {
	return (
		<Suspense>
			<RotaHistory />
		</Suspense>
	)
}
