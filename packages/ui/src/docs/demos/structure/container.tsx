import { Container } from '../../../structure/container'
import { Axes } from '../../engine'

export default function Demo() {
	return (
		<Axes
			of="Container"
			captions={false}
			// The smallest size is wider than the example frame, so each size looks the same here.
			omit={['size']}
			render={(props, label) => (
				// The dashed frame shows the padding. The padding applies only from the `lg` breakpoint up.
				<div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
					<Container {...props}>
						<div className="rounded-md bg-zinc-950/5 px-3 py-2 text-sm dark:bg-white/10">
							{label}
						</div>
					</Container>
				</div>
			)}
		/>
	)
}
