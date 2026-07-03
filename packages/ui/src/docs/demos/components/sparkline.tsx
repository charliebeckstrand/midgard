import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { Sparkline } from '../../../components/sparkline'
import { Stack } from '../../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { capitalize, code, Example, LabeledRow, LabeledRows } from '../../engine'

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const sizes = ['sm', 'md', 'lg'] as const

// A rising then cresting series so line, area, and bar variants all read clearly.
const series = [4, 6, 5, 9, 8, 12, 11, 15, 14, 19, 22, 20]

// The mount animation plays once; a refresh button remounts the sparkline (bumping
// its `key`) so the reveal replays on demand. Shared by the line and bar tabs.
function AnimatedExample({ variant }: { variant: 'line' | 'bar' }) {
	const [runKey, setRunKey] = useState(0)

	return (
		<Example
			title="Animated"
			code={
				variant === 'bar' ? code`<Sparkline variant="bar" animate />` : code`<Sparkline animate />`
			}
			actions={
				<Button
					variant="bare"
					aria-label="Replay animation"
					onClick={() => setRunKey((n) => n + 1)}
				>
					<Icon icon={<RefreshCw />} />
				</Button>
			}
		>
			{variant === 'bar' ? (
				<Sparkline
					key={runKey}
					data={series}
					variant="bar"
					color="green"
					animate
					aria-label="Animated bars"
				/>
			) : (
				<Sparkline
					key={runKey}
					data={series}
					color="green"
					fill
					endPoint
					animate
					aria-label="Animated trend"
				/>
			)}
		</Example>
	)
}

export function Demo() {
	return (
		<Tabs defaultValue="line">
			<Stack gap="lg">
				<TabList aria-label="Sparkline style">
					<Tab value="line">Line</Tab>
					<Tab value="bar">Bar</Tab>
				</TabList>
				<TabContents>
					<TabContent value="line">
						<Stack gap="xl">
							<Example title="Default">
								<Sparkline data={series} aria-label="Trend" />
							</Example>

							<Example title="Area fill & end-point">
								<Sparkline
									data={series}
									color="blue"
									fill
									endPoint
									aria-label="Trend with area fill and end-point"
								/>
							</Example>

							<AnimatedExample variant="line" />

							<Example title="Colors">
								<LabeledRows>
									{colors.map((color) => (
										<LabeledRow key={color} label={capitalize(color)}>
											<Sparkline
												data={series}
												color={color}
												fill
												aria-label={`${capitalize(color)} trend`}
											/>
										</LabeledRow>
									))}
								</LabeledRows>
							</Example>

							<Example title="Sizes">
								<LabeledRows>
									{sizes.map((s) => (
										<LabeledRow key={s} label={s}>
											<Sparkline data={series} size={s} color="blue" aria-label={`${s} trend`} />
										</LabeledRow>
									))}
								</LabeledRows>
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="bar">
						<Stack gap="xl">
							<Example title="Default">
								<Sparkline data={series} variant="bar" color="blue" aria-label="By period" />
							</Example>

							<AnimatedExample variant="bar" />

							<Example title="Sizes">
								<LabeledRows>
									{sizes.map((s) => (
										<LabeledRow key={s} label={s}>
											<Sparkline
												data={series}
												variant="bar"
												size={s}
												color="amber"
												aria-label={`${s} bars`}
											/>
										</LabeledRow>
									))}
								</LabeledRows>
							</Example>
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}
