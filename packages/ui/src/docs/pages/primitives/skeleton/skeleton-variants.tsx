import { useState } from 'react'
import { AccordionSkeleton } from 'ui/accordion'
import { AvatarSkeleton } from 'ui/avatar'
import { BadgeSkeleton } from 'ui/badge'
import { BreadcrumbSkeleton } from 'ui/breadcrumb'
import { ButtonSkeleton } from 'ui/button'
import { CalendarSkeleton } from 'ui/calendar'
import { ChartSkeleton } from 'ui/chart'
import { ChatTranscriptSkeleton } from 'ui/chat'
import { CheckboxSkeleton } from 'ui/checkbox'
import { ColorPanelSkeleton, ColorPickerSkeleton } from 'ui/color'
import { Combobox, ComboboxLabel, ComboboxOption, useComboboxDeferredQuery } from 'ui/combobox'
import { ControlSkeleton } from 'ui/control'
import { DatePickerSkeleton } from 'ui/date-picker'
import { DescriptionListSkeleton } from 'ui/description-list'
import { FiltersSkeleton } from 'ui/filters'
import { HeadingSkeleton } from 'ui/heading'
import { KanbanCardSkeleton } from 'ui/kanban'
import { ListSkeleton } from 'ui/list'
import { MapSkeleton } from 'ui/map'
import { NavSkeleton } from 'ui/nav'
import { PaginationSkeleton } from 'ui/pagination'
import { ProgressBarSkeleton, ProgressGaugeSkeleton } from 'ui/progress'
import { RadioSkeleton } from 'ui/radio'
import { RatingSkeleton } from 'ui/rating'
import { SegmentSkeleton } from 'ui/segment'
import { ShinyTextSkeleton } from 'ui/shiny-text'
import { SidebarSkeleton } from 'ui/sidebar'
import { SliderSkeleton } from 'ui/slider'
import { SparklineSkeleton } from 'ui/sparkline'
import {
	StatDeltaSkeleton,
	StatDescriptionSkeleton,
	StatLabelSkeleton,
	StatSkeleton,
	StatValueSkeleton,
} from 'ui/stat'
import { StepperSkeleton } from 'ui/stepper'
import { SwitchSkeleton } from 'ui/switch'
import { TabListSkeleton } from 'ui/tabs'
import { TextSkeleton } from 'ui/text'
import { TextareaSkeleton } from 'ui/textarea'
import { TimelineSkeleton } from 'ui/timeline'
import { ToggleIconButtonSkeleton } from 'ui/toggle-icon-button'
import { TreeSkeleton } from 'ui/tree'

const variants = [
	{ name: 'Accordion', skeleton: <AccordionSkeleton /> },
	{ name: 'Avatar', skeleton: <AvatarSkeleton /> },
	{ name: 'Badge', skeleton: <BadgeSkeleton /> },
	{ name: 'Breadcrumb', skeleton: <BreadcrumbSkeleton /> },
	{ name: 'Button', skeleton: <ButtonSkeleton /> },
	{ name: 'Calendar', skeleton: <CalendarSkeleton /> },
	{ name: 'Chart', skeleton: <ChartSkeleton /> },
	{ name: 'Chart (pie)', skeleton: <ChartSkeleton sector /> },
	{ name: 'Chat transcript', skeleton: <ChatTranscriptSkeleton /> },
	{ name: 'Checkbox', skeleton: <CheckboxSkeleton /> },
	{ name: 'Color panel', skeleton: <ColorPanelSkeleton /> },
	{ name: 'Color picker', skeleton: <ColorPickerSkeleton /> },
	{ name: 'Control', skeleton: <ControlSkeleton /> },
	{ name: 'Date picker', skeleton: <DatePickerSkeleton /> },
	{ name: 'Description list', skeleton: <DescriptionListSkeleton /> },
	{ name: 'Filters', skeleton: <FiltersSkeleton /> },
	{ name: 'Heading', skeleton: <HeadingSkeleton level={3} /> },
	{ name: 'Kanban card', skeleton: <KanbanCardSkeleton /> },
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
	{ name: 'Timeline', skeleton: <TimelineSkeleton /> },
	{ name: 'Toggle icon button', skeleton: <ToggleIconButtonSkeleton /> },
	{ name: 'Tree', skeleton: <TreeSkeleton /> },
]

function MatchingVariants() {
	const query = useComboboxDeferredQuery().toLowerCase()

	return variants
		.filter((variant) => variant.name.toLowerCase().includes(query))
		.map((variant) => (
			<ComboboxOption key={variant.name} value={variant.name}>
				<ComboboxLabel>{variant.name}</ComboboxLabel>
			</ComboboxOption>
		))
}

export default function SkeletonVariants() {
	const [selected, setSelected] = useState('Button')

	const active = variants.find((variant) => variant.name === selected)

	return (
		<>
			<Combobox<string>
				value={selected}
				onValueChange={(value) => setSelected(value ?? 'Button')}
				displayValue={(name) => name}
				placeholder="Search component"
				aria-label="Skeleton variant"
			>
				<MatchingVariants />
			</Combobox>
			{active?.skeleton}
		</>
	)
}
