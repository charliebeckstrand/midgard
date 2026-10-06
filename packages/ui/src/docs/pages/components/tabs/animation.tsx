import { useState } from 'react'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { Stack } from 'ui/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Text } from 'ui/text'

const sections = ['Account', 'Notifications', 'Billing']

const animations = { fade: 'fade', slide: 'slide', off: false } as const

export default function Animation() {
	const [animation, setAnimation] = useState<keyof typeof animations>('fade')

	return (
		<Stack gap="md">
			<Segment
				value={animation}
				onValueChange={(value) => {
					if (value === 'fade' || value === 'slide' || value === 'off') setAnimation(value)
				}}
			>
				<SegmentControl aria-label="Animation">
					<SegmentItem value="fade">Fade</SegmentItem>
					<SegmentItem value="slide">Slide</SegmentItem>
					<SegmentItem value="off">Off</SegmentItem>
				</SegmentControl>
			</Segment>
			<Tabs defaultValue="Account">
				<TabList aria-label="Settings">
					{sections.map((section) => (
						<Tab key={section} value={section}>
							{section}
						</Tab>
					))}
				</TabList>
				<TabContents animate={animations[animation]}>
					{sections.map((section) => (
						<TabContent key={section} value={section}>
							<Text tone="muted">{section} settings would go here.</Text>
						</TabContent>
					))}
				</TabContents>
			</Tabs>
		</Stack>
	)
}
