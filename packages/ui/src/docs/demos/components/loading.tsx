import { useState } from 'react'
import { Button } from '../../../components/button'
import { LoadingDots, LoadingSpinner } from '../../../components/loading'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { Flex } from '../../../structure/flex'
import { Stack } from '../../../structure/stack'
import { Axes, Example, SizeListbox } from '../../engine'

const buttonSizes = ['xs', 'sm', 'md', 'lg'] as const

type ButtonSize = (typeof buttonSizes)[number]

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
							<Axes of="LoadingSpinner" render={(props) => <LoadingSpinner {...props} />} />

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
							<Axes of="LoadingDots" render={(props) => <LoadingDots {...props} />} />

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
