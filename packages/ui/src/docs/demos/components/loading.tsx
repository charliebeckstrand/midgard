import { useState } from 'react'
import { Button } from '../../../components/button'
import { Flex } from '../../../components/flex'
import { LoadingDots, LoadingSpinner } from '../../../components/loading'
import { Stack } from '../../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { capitalize, Example, LabeledColumn, SizeListbox } from '../../engine'

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

const buttonSizes = ['xs', 'sm', 'md', 'lg'] as const

type ButtonSize = (typeof buttonSizes)[number]

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

export function Demo() {
	const [buttonSize, setButtonSize] = useState<ButtonSize>('md')

	return (
		<Tabs defaultValue="spinner">
			<Stack gap="lg">
				<TabList aria-label="Loader style">
					<Tab value="spinner">Spinner</Tab>
					<Tab value="dots">Dots</Tab>
				</TabList>
				<TabContents>
					<TabContent value="spinner">
						<Stack gap="xl">
							<Example title="Default">
								<LoadingSpinner />
							</Example>

							<Example title="Sizes">
								<Flex gap="lg" align="end">
									{sizes.map((s) => (
										<LabeledColumn key={s} label={s}>
											<LoadingSpinner size={s} />
										</LabeledColumn>
									))}
								</Flex>
							</Example>

							<Example title="Colors">
								<Flex gap="lg">
									{colors.map((c) => (
										<LabeledColumn key={c} label={capitalize(c)}>
											<LoadingSpinner color={c} size="lg" />
										</LabeledColumn>
									))}
								</Flex>
							</Example>

							<Example
								title="Inside a button"
								actions={
									<SizeListbox
										sizes={buttonSizes}
										value={buttonSize}
										onValueChange={setButtonSize}
									/>
								}
							>
								<Flex gap="md">
									<Button disabled size={buttonSize} prefix={<LoadingSpinner />}>
										Loading
									</Button>
									<Button variant="soft" disabled size={buttonSize} prefix={<LoadingSpinner />}>
										Saving
									</Button>
								</Flex>
							</Example>
						</Stack>
					</TabContent>
					<TabContent value="dots">
						<Stack gap="xl">
							<Example title="Default">
								<LoadingDots />
							</Example>

							<Example title="Sizes">
								<Flex gap="lg" align="end">
									{sizes.map((s) => (
										<LabeledColumn key={s} label={s}>
											<LoadingDots size={s} />
										</LabeledColumn>
									))}
								</Flex>
							</Example>

							<Example title="Colors">
								<Flex gap="lg">
									{colors.map((c) => (
										<LabeledColumn key={c} label={capitalize(c)}>
											<LoadingDots color={c} size="lg" />
										</LabeledColumn>
									))}
								</Flex>
							</Example>

							<Example
								title="Inside a button"
								actions={
									<SizeListbox
										sizes={buttonSizes}
										value={buttonSize}
										onValueChange={setButtonSize}
									/>
								}
							>
								<Flex gap="md">
									<Button disabled size={buttonSize} prefix={<LoadingDots />}>
										Loading
									</Button>
									<Button variant="soft" disabled size={buttonSize} prefix={<LoadingDots />}>
										Saving
									</Button>
								</Flex>
							</Example>
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}
