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
import { FormFiltersSkeleton } from 'ui/form'
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
	{ id: 'accordion', label: 'Accordion', skeleton: <AccordionSkeleton /> },
	{ id: 'avatar', label: 'Avatar', skeleton: <AvatarSkeleton /> },
	{ id: 'badge', label: 'Badge', skeleton: <BadgeSkeleton /> },
	{ id: 'breadcrumb', label: 'Breadcrumb', skeleton: <BreadcrumbSkeleton /> },
	{ id: 'button', label: 'Button', skeleton: <ButtonSkeleton /> },
	{ id: 'calendar', label: 'Calendar', skeleton: <CalendarSkeleton /> },
	{ id: 'chart', label: 'Chart', skeleton: <ChartSkeleton /> },
	{ id: 'chartPie', label: 'Chart (pie)', skeleton: <ChartSkeleton sector /> },
	{ id: 'chatTranscript', label: 'Chat transcript', skeleton: <ChatTranscriptSkeleton /> },
	{ id: 'checkbox', label: 'Checkbox', skeleton: <CheckboxSkeleton /> },
	{ id: 'colorPanel', label: 'Color panel', skeleton: <ColorPanelSkeleton /> },
	{ id: 'colorPicker', label: 'Color picker', skeleton: <ColorPickerSkeleton /> },
	{ id: 'control', label: 'Control', skeleton: <ControlSkeleton /> },
	{ id: 'datePicker', label: 'Date picker', skeleton: <DatePickerSkeleton /> },
	{ id: 'descriptionList', label: 'Description list', skeleton: <DescriptionListSkeleton /> },
	{ id: 'filters', label: 'Filters', skeleton: <FormFiltersSkeleton /> },
	{ id: 'heading', label: 'Heading', skeleton: <HeadingSkeleton level={3} /> },
	{ id: 'kanbanCard', label: 'Kanban card', skeleton: <KanbanCardSkeleton /> },
	{ id: 'list', label: 'List', skeleton: <ListSkeleton description /> },
	{ id: 'map', label: 'Map', skeleton: <MapSkeleton /> },
	{ id: 'nav', label: 'Nav', skeleton: <NavSkeleton /> },
	{ id: 'pagination', label: 'Pagination', skeleton: <PaginationSkeleton /> },
	{ id: 'progressBar', label: 'Progress bar', skeleton: <ProgressBarSkeleton /> },
	{ id: 'progressGauge', label: 'Progress gauge', skeleton: <ProgressGaugeSkeleton /> },
	{ id: 'radio', label: 'Radio', skeleton: <RadioSkeleton /> },
	{ id: 'rating', label: 'Rating', skeleton: <RatingSkeleton /> },
	{ id: 'segment', label: 'Segment', skeleton: <SegmentSkeleton /> },
	{ id: 'shinyText', label: 'Shiny text', skeleton: <ShinyTextSkeleton /> },
	{ id: 'sidebar', label: 'Sidebar', skeleton: <SidebarSkeleton /> },
	{ id: 'slider', label: 'Slider', skeleton: <SliderSkeleton /> },
	{ id: 'sparkline', label: 'Sparkline', skeleton: <SparklineSkeleton /> },
	{ id: 'stat', label: 'Stat', skeleton: <StatSkeleton delta description /> },
	{ id: 'statDelta', label: 'Stat delta', skeleton: <StatDeltaSkeleton /> },
	{ id: 'statDescription', label: 'Stat description', skeleton: <StatDescriptionSkeleton /> },
	{ id: 'statLabel', label: 'Stat label', skeleton: <StatLabelSkeleton /> },
	{ id: 'statValue', label: 'Stat value', skeleton: <StatValueSkeleton /> },
	{ id: 'stepper', label: 'Stepper', skeleton: <StepperSkeleton /> },
	{ id: 'switch', label: 'Switch', skeleton: <SwitchSkeleton /> },
	{ id: 'tabList', label: 'Tab list', skeleton: <TabListSkeleton /> },
	{ id: 'text', label: 'Text', skeleton: <TextSkeleton /> },
	{ id: 'textarea', label: 'Textarea', skeleton: <TextareaSkeleton /> },
	{ id: 'timeline', label: 'Timeline', skeleton: <TimelineSkeleton /> },
	{ id: 'toggleIconButton', label: 'Toggle icon button', skeleton: <ToggleIconButtonSkeleton /> },
	{ id: 'tree', label: 'Tree', skeleton: <TreeSkeleton /> },
]

function MatchingVariants() {
	const query = useComboboxDeferredQuery().toLowerCase()

	return variants
		.filter((variant) => variant.label.toLowerCase().includes(query))
		.map((variant) => (
			<ComboboxOption key={variant.id} value={variant.id}>
				<ComboboxLabel>{variant.label}</ComboboxLabel>
			</ComboboxOption>
		))
}

export default function SkeletonVariants() {
	const [selected, setSelected] = useState('button')

	const active = variants.find((variant) => variant.id === selected)

	return (
		<>
			<Combobox<string>
				value={selected}
				onValueChange={(value) => setSelected(value ?? 'button')}
				displayValue={(id) => variants.find((variant) => variant.id === id)?.label ?? id}
				placeholder="Search components"
				aria-label="Skeleton variant"
			>
				<MatchingVariants />
			</Combobox>
			{active?.skeleton}
		</>
	)
}
