import { useState } from 'react'
import { AccordionSkeleton } from '../../../components/accordion'
import { Avatar, AvatarSkeleton } from '../../../components/avatar'
import { BadgeSkeleton } from '../../../components/badge'
import { BreadcrumbSkeleton } from '../../../components/breadcrumb'
import { Button, ButtonSkeleton } from '../../../components/button'
import { CalendarSkeleton } from '../../../components/calendar'
import { Card, CardBody, CardHeader } from '../../../components/card'
import { CheckboxSkeleton } from '../../../components/checkbox'
import { ColorPanelSkeleton } from '../../../components/color'
import {
	Combobox,
	ComboboxLabel,
	ComboboxOption,
	useComboboxDeferredQuery,
} from '../../../components/combobox'
import { ControlSkeleton } from '../../../components/control'
import { DescriptionListSkeleton } from '../../../components/description-list'
import { FiltersSkeleton } from '../../../components/filters'
import { Heading, HeadingSkeleton } from '../../../components/heading'
import { Input } from '../../../components/input'
import { ListSkeleton } from '../../../components/list'
import { NavSkeleton } from '../../../components/nav'
import { PaginationSkeleton } from '../../../components/pagination'
import { ProgressBarSkeleton, ProgressGaugeSkeleton } from '../../../components/progress'
import { RadioSkeleton } from '../../../components/radio'
import { RatingSkeleton } from '../../../components/rating'
import { SegmentSkeleton } from '../../../components/segment'
import { ShinyTextSkeleton } from '../../../components/shiny-text'
import { SidebarSkeleton } from '../../../components/sidebar'
import { SliderSkeleton } from '../../../components/slider'
import { SparklineSkeleton } from '../../../components/sparkline'
import {
	StatDeltaSkeleton,
	StatDescriptionSkeleton,
	StatLabelSkeleton,
	StatSkeleton,
	StatValueSkeleton,
} from '../../../components/stat'
import { StepperSkeleton } from '../../../components/stepper'
import { SwitchSkeleton } from '../../../components/switch'
import { TabListSkeleton } from '../../../components/tabs'
import { Text, TextSkeleton } from '../../../components/text'
import { Textarea, TextareaSkeleton } from '../../../components/textarea'
import { ToggleIconButtonSkeleton } from '../../../components/toggle-icon-button'
import { ChartSkeleton } from '../../../modules/chart'
import { MapSkeleton } from '../../../modules/map'
import { ReadyReveal } from '../../../primitives/ready-reveal'
import { Flex } from '../../../structure/flex'
import { Example } from '../../engine'

export const meta = { name: 'Skeleton' }

// Compose loading trees explicitly: each component ships a `<XSkeleton>`
// counterpart mirroring its silhouette. The variants are static leaves, so
// a Suspense fallback or loading.tsx can server-render them.
const skeletonVariants = [
	{ name: 'Accordion', skeleton: <AccordionSkeleton /> },
	{ name: 'Avatar', skeleton: <AvatarSkeleton /> },
	{ name: 'Badge', skeleton: <BadgeSkeleton /> },
	{ name: 'Breadcrumb', skeleton: <BreadcrumbSkeleton /> },
	{ name: 'Button', skeleton: <ButtonSkeleton /> },
	{ name: 'Calendar', skeleton: <CalendarSkeleton /> },
	{ name: 'Chart', skeleton: <ChartSkeleton /> },
	{ name: 'Checkbox', skeleton: <CheckboxSkeleton /> },
	{ name: 'Color panel', skeleton: <ColorPanelSkeleton /> },
	{ name: 'Control', skeleton: <ControlSkeleton /> },
	{ name: 'Description list', skeleton: <DescriptionListSkeleton /> },
	{ name: 'Filters', skeleton: <FiltersSkeleton /> },
	{ name: 'Heading', skeleton: <HeadingSkeleton level={3} /> },
	{ name: 'List', skeleton: <ListSkeleton description /> },
	{ name: 'Map', skeleton: <MapSkeleton /> },
	{ name: 'Nav', skeleton: <NavSkeleton /> },
	{ name: 'Pagination', skeleton: <PaginationSkeleton /> },
	{ name: 'Progress bar', skeleton: <ProgressBarSkeleton /> },
	{ name: 'Progress gauge', skeleton: <ProgressGaugeSkeleton /> },
	{ name: 'Radio', skeleton: <RadioSkeleton /> },
	{ name: 'Rating', skeleton: <RatingSkeleton /> },
	{ name: 'Segment', skeleton: <SegmentSkeleton /> },
	{ name: 'Shiny text', skeleton: <ShinyTextSkeleton /> },
	{ name: 'Sidebar', skeleton: <SidebarSkeleton /> },
	{ name: 'Slider', skeleton: <SliderSkeleton /> },
	{ name: 'Sparkline', skeleton: <SparklineSkeleton /> },
	{ name: 'Stat', skeleton: <StatSkeleton delta description /> },
	{ name: 'Stat delta', skeleton: <StatDeltaSkeleton /> },
	{ name: 'Stat description', skeleton: <StatDescriptionSkeleton /> },
	{ name: 'Stat label', skeleton: <StatLabelSkeleton /> },
	{ name: 'Stat value', skeleton: <StatValueSkeleton /> },
	{ name: 'Stepper', skeleton: <StepperSkeleton /> },
	{ name: 'Switch', skeleton: <SwitchSkeleton /> },
	{ name: 'Tab list', skeleton: <TabListSkeleton /> },
	{ name: 'Text', skeleton: <TextSkeleton /> },
	{ name: 'Textarea', skeleton: <TextareaSkeleton /> },
	{ name: 'Toggle icon button', skeleton: <ToggleIconButtonSkeleton /> },
]

// Combobox filtering is consumer-driven: read the deferred query from context
// via `useComboboxDeferredQuery` and narrow the option list against the variant name.
function FilteredVariants() {
	const deferredQuery = useComboboxDeferredQuery()

	return skeletonVariants
		.filter((v) => !deferredQuery || v.name.toLowerCase().includes(deferredQuery.toLowerCase()))
		.map((v) => (
			<ComboboxOption key={v.name} value={v.name}>
				<ComboboxLabel>{v.name}</ComboboxLabel>
			</ComboboxOption>
		))
}

function VariantExample() {
	const [selected, setSelected] = useState('Button')

	const active = skeletonVariants.find((v) => v.name === selected)

	return (
		<Example
			title="Skeleton variants"
			actions={
				<Combobox<string>
					value={selected}
					onValueChange={(value) => setSelected(value ?? 'Button')}
					displayValue={(v: string) => v}
					placeholder="Search component"
					aria-label="Skeleton variant"
				>
					<FilteredVariants />
				</Combobox>
			}
		>
			{/* Block flow on purpose: the line-shaped variants (Text, Heading)
			    size to their container and collapse to zero width as flex items. */}
			{active?.skeleton}
		</Example>
	)
}

function FormExample() {
	const [ready, setReady] = useState(false)

	return (
		<>
			<Button
				variant={ready ? 'soft' : 'outline'}
				color={ready ? 'red' : undefined}
				onClick={() => setReady(!ready)}
			>
				{ready ? 'Reset' : 'Simulate load'}
			</Button>

			<ReadyReveal ready={ready} placeholder={<HeadingSkeleton level={3} />}>
				<Heading level={3}>Create account</Heading>
			</ReadyReveal>
			<ReadyReveal ready={ready} placeholder={<ControlSkeleton />}>
				<Input placeholder="Email" />
			</ReadyReveal>
			<ReadyReveal ready={ready} placeholder={<ControlSkeleton />}>
				<Input placeholder="Password" type="password" />
			</ReadyReveal>
			<ReadyReveal ready={ready} placeholder={<TextareaSkeleton />}>
				<Textarea placeholder="Bio" />
			</ReadyReveal>
			<ReadyReveal ready={ready} placeholder={<ButtonSkeleton />}>
				<Button color="blue">Sign up</Button>
			</ReadyReveal>
		</>
	)
}

function ProfileCardExample() {
	const [ready, setReady] = useState(false)

	return (
		<>
			<Button
				variant={ready ? 'soft' : 'outline'}
				color={ready ? 'red' : undefined}
				onClick={() => setReady(!ready)}
			>
				{ready ? 'Reset' : 'Simulate load'}
			</Button>

			<Card bg="none">
				<CardHeader>
					<Flex gap="md">
						<ReadyReveal ready={ready} placeholder={<AvatarSkeleton />}>
							<Avatar initials="JD" />
						</ReadyReveal>
						<div className="flex-1 space-y-1">
							<ReadyReveal ready={ready} placeholder={<HeadingSkeleton level={3} />}>
								<Heading level={3}>Jane Doe</Heading>
							</ReadyReveal>
							<ReadyReveal ready={ready} placeholder={<TextSkeleton />}>
								<Text>Senior Engineer</Text>
							</ReadyReveal>
						</div>
					</Flex>
				</CardHeader>
				<CardBody>
					<ReadyReveal ready={ready} placeholder={<TextSkeleton />}>
						<Text>Design systems & component libraries.</Text>
					</ReadyReveal>
				</CardBody>
			</Card>
		</>
	)
}

export function Demo() {
	return (
		<>
			<VariantExample />

			<Example title="Form">
				<FormExample />
			</Example>

			<Example title="Profile card">
				<ProfileCardExample />
			</Example>
		</>
	)
}
