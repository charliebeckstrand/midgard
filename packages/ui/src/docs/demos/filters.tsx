'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { DatePicker } from '../../components/datepicker'
import { Label } from '../../components/fieldset'
import { Filters, FiltersClear, FiltersField, useFilters } from '../../components/filters'
import { Flex } from '../../components/flex'
import { Input } from '../../components/input'
import { JsonTree } from '../../components/json-tree'
import { NumberInput } from '../../components/number-input'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

// ── Basic ──────────────────────────────────────────

type BasicFilters = {
	search: string | undefined
	status: string | undefined
}

// ── Shared output component ────────────────────────

type FilterOutputProps = {
	expanded: Set<string>
	onExpandedChange: (expanded: Set<string>) => void
}

function FilterOutput({ expanded, onExpandedChange }: FilterOutputProps) {
	const { value } = useFilters()

	return (
		<JsonTree
			data={JSON.parse(JSON.stringify(value))}
			expanded={expanded}
			onExpandedChange={onExpandedChange}
		/>
	)
}

function FiltersClearButton() {
	const { value } = useFilters()

	const hasValue = Object.values(value).some((v) => v !== undefined && v !== null)

	if (!hasValue) return null

	return (
		<FiltersClear>
			<Flex>
				<Button variant="soft" color="red">
					Clear
				</Button>
			</Flex>
		</FiltersClear>
	)
}

function BasicDemo() {
	const [filters, setFilters] = useState<BasicFilters>({
		search: undefined,
		status: undefined,
	})

	const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

	return (
		<Filters
			value={filters}
			suffix={<FilterOutput expanded={expanded} onExpandedChange={setExpanded} />}
			clear={<FiltersClearButton />}
			onChange={setFilters}
			onClear={() => setExpanded(new Set())}
		>
			<FiltersField name="search">
				<Label>Search</Label>
				<Input placeholder="Search" />
			</FiltersField>
			<FiltersField name="status">
				<Label>Status</Label>
				<Select nullable placeholder="All statuses" displayValue={(v: string) => v}>
					<SelectOption value="active">
						<SelectLabel>Active</SelectLabel>
					</SelectOption>
					<SelectOption value="inactive">
						<SelectLabel>Inactive</SelectLabel>
					</SelectOption>
					<SelectOption value="pending">
						<SelectLabel>Pending</SelectLabel>
					</SelectOption>
				</Select>
			</FiltersField>
		</Filters>
	)
}

// ── With Date Picker ───────────────────────────────

type DateFilters = {
	search: string | undefined
	dateRange: [Date, Date] | undefined
	category: string | undefined
}

function DateDemo() {
	const [filters, setFilters] = useState<DateFilters>({
		search: undefined,
		dateRange: undefined,
		category: undefined,
	})

	const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

	return (
		<Filters
			value={filters}
			suffix={<FilterOutput expanded={expanded} onExpandedChange={setExpanded} />}
			clear={<FiltersClearButton />}
			onChange={setFilters}
			onClear={() => setExpanded(new Set())}
		>
			<FiltersField name="search">
				<Label>Search</Label>
				<Input placeholder="Search" />
			</FiltersField>
			<FiltersField name="dateRange">
				<Label>Date Range</Label>
				<DatePicker range />
			</FiltersField>
			<FiltersField name="category">
				<Label>Category</Label>
				<Select nullable placeholder="All categories" displayValue={(v: string) => v}>
					<SelectOption value="engineering">
						<SelectLabel>Engineering</SelectLabel>
					</SelectOption>
					<SelectOption value="design">
						<SelectLabel>Design</SelectLabel>
					</SelectOption>
					<SelectOption value="marketing">
						<SelectLabel>Marketing</SelectLabel>
					</SelectOption>
				</Select>
			</FiltersField>
		</Filters>
	)
}

// ── Render Props ───────────────────────────────────

type RenderPropsFilters = {
	search: string | undefined
	minPrice: number | undefined
	maxPrice: number | undefined
}

function RenderPropsDemo() {
	const [filters, setFilters] = useState<RenderPropsFilters>({
		search: undefined,
		minPrice: undefined,
		maxPrice: undefined,
	})

	const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

	return (
		<Filters
			value={filters}
			suffix={<FilterOutput expanded={expanded} onExpandedChange={setExpanded} />}
			clear={<FiltersClearButton />}
			onChange={setFilters}
			onClear={() => setExpanded(new Set())}
		>
			<FiltersField name="search">
				<Label>Search</Label>
				<Input placeholder="Search" />
			</FiltersField>
			<FiltersField name="minPrice">
				<Label>Min Price</Label>
				<NumberInput placeholder="0" min={0} />
			</FiltersField>
			<FiltersField name="maxPrice">
				<Label>Max Price</Label>
				<NumberInput placeholder="1000" min={0} />
			</FiltersField>
		</Filters>
	)
}

// ── Demo ───────────────────────────────────────────

export default function FilterDemo() {
	return (
		<Stack gap={6}>
			<Example title="Basic">
				<BasicDemo />
			</Example>

			<Example title="With DatePicker">
				<DateDemo />
			</Example>

			<Example title="With NumberInput">
				<RenderPropsDemo />
			</Example>
		</Stack>
	)
}
