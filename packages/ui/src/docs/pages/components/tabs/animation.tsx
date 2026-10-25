import { useState } from 'react'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { Stack } from 'ui/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Text } from 'ui/text'
import { settings } from './settings.ts'

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
			<Tabs defaultValue="account">
				<TabList aria-label="Settings">
					{settings.map((section) => (
						<Tab key={section.id} value={section.id}>
							{section.label}
						</Tab>
					))}
				</TabList>
				<TabContents animate={animations[animation]}>
					{settings.map((section) => (
						<TabContent key={section.id} value={section.id}>
							<Text tone="muted">{section.text}</Text>
						</TabContent>
					))}
				</TabContents>
			</Tabs>
		</Stack>
	)
}
