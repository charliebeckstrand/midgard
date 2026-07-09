import { RefreshCw } from 'lucide-react'
import { type ComponentProps, type ReactNode, useState } from 'react'
import { Button } from '../../../../components/button'
import { Flex } from '../../../../components/flex'
import { Icon } from '../../../../components/icon'
import { Listbox, ListboxOption } from '../../../../components/listbox'
import { Spacer } from '../../../../components/spacer'
import { code, Example as ExampleFrame } from '../../../engine'

// Every chart demo renders in the same fixed-width, resizable frame so its
// responsive behaviour is visible at a glance. Wrapping the engine Example once
// here injects those defaults into all the `<Example>` call sites below —
// including AnimatedExample's — without repeating the props on each. A call site
// can still override either default by passing its own `width`/`resize`.
export function Example(props: ComponentProps<typeof ExampleFrame>) {
	return <ExampleFrame width={720} minWidth={160} resize {...props} />
}

type LegendPlacement = 'right' | 'left' | 'top' | 'bottom'

export const LegendPlacementExample = ({
	children,
}: {
	children: (placement: LegendPlacement) => ReactNode
}) => {
	const [placement, setPlacement] = useState<LegendPlacement>('right')

	return (
		<Example
			title="Legend placement"
			code={code`<BarChart aspectRatio={16 / 9} legend={placement} … /> // plot stays 16:9`}
			prefix={
				<Flex>
					<Listbox
						aria-label="Legend placement"
						value={placement}
						displayValue={(value) => value.at(0)?.toUpperCase() + value.slice(1)}
						onValueChange={(value) => setPlacement(value as LegendPlacement)}
					>
						{(['right', 'left', 'top', 'bottom'] as LegendPlacement[]).map((option) => (
							<ListboxOption key={option} value={option}>
								{option.charAt(0).toUpperCase() + option.slice(1)}
							</ListboxOption>
						))}
					</Listbox>
				</Flex>
			}
		>
			{children(placement)}
		</Example>
	)
}

// The mount animation plays once; a refresh button remounts the chart
// (bumping its `key`) so the reveal replays on demand.
export function AnimatedExample({
	title,
	source,
	children,
}: {
	title: string
	source: ReturnType<typeof code>
	children: ReactNode
}) {
	const [runKey, setRunKey] = useState(0)

	return (
		<Example
			title={title}
			code={source}
			prefix={
				<Flex>
					<Spacer />
					<Button
						variant="bare"
						aria-label="Replay animation"
						onClick={() => setRunKey((n) => n + 1)}
					>
						<Icon icon={<RefreshCw />} />
					</Button>
				</Flex>
			}
		>
			<div key={runKey}>{children}</div>
		</Example>
	)
}
