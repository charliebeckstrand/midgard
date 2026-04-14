'use client'

import { useState } from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { DatePicker } from '../../components/datepicker'
import { Field, Label } from '../../components/fieldset'
import { Filter, FilterClear, FilterField, useFilter } from '../../components/filter'
import { Input } from '../../components/input'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

// ── Basic ──────────────────────────────────────────

type BasicFilters = {
	search: string
	status: string | undefined
}

function BasicDemo() {
	const [filters, setFilters] = useState<BasicFilters>({
		search: '',
		status: undefined,
	})

	return (
		<Filter value={filters} onChange={setFilters}>
			<div className="flex flex-wrap items-end gap-4">
				<Field>
					<Label>Search</Label>
					<FilterField name="search">
						<Input placeholder="Search..." />
					</FilterField>
				</Field>
				<Field>
					<Label>Status</Label>
					<FilterField name="status">
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
					</FilterField>
				</Field>
				<FilterClear>
					<Button variant="plain">Clear</Button>
				</FilterClear>
			</div>
			<FilterOutput />
		</Filter>
	)
}

// ── With Date Picker ───────────────────────────────

type DateFilters = {
	search: string
	dateRange: [Date, Date] | undefined
	category: string | undefined
}

function DateDemo() {
	const [filters, setFilters] = useState<DateFilters>({
		search: '',
		dateRange: undefined,
		category: undefined,
	})

	return (
		<Filter value={filters} onChange={setFilters}>
			<div className="flex flex-wrap items-end gap-4">
				<Field>
					<Label>Search</Label>
					<FilterField name="search">
						<Input placeholder="Search..." />
					</FilterField>
				</Field>
				<Field>
					<Label>Date Range</Label>
					<FilterField name="dateRange">
						<DatePicker range />
					</FilterField>
				</Field>
				<Field>
					<Label>Category</Label>
					<FilterField name="category">
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
					</FilterField>
				</Field>
				<FilterClear>
					<Button variant="plain">Clear</Button>
				</FilterClear>
			</div>
			<FilterOutput />
		</Filter>
	)
}

// ── Render Props ───────────────────────────────────

type RenderPropsFilters = {
	search: string
	minPrice: string
	maxPrice: string
}

function RenderPropsDemo() {
	const [filters, setFilters] = useState<RenderPropsFilters>({
		search: '',
		minPrice: '',
		maxPrice: '',
	})

	return (
		<Filter value={filters} onChange={setFilters}>
			<div className="flex flex-wrap items-end gap-4">
				<Field>
					<Label>Search</Label>
					<FilterField name="search">
						<Input placeholder="Search..." />
					</FilterField>
				</Field>
				<Field>
					<Label>Min Price</Label>
					<FilterField name="minPrice">
						{({ value, onChange }) => (
							<Input
								type="number"
								placeholder="0"
								prefix="$"
								value={(value as string) ?? ''}
								onChange={(e) => onChange(e.target.value)}
							/>
						)}
					</FilterField>
				</Field>
				<Field>
					<Label>Max Price</Label>
					<FilterField name="maxPrice">
						{({ value, onChange }) => (
							<Input
								type="number"
								placeholder="1000"
								prefix="$"
								value={(value as string) ?? ''}
								onChange={(e) => onChange(e.target.value)}
							/>
						)}
					</FilterField>
				</Field>
				<FilterClear>
					<Button variant="plain">Clear</Button>
				</FilterClear>
			</div>
			<FilterOutput />
		</Filter>
	)
}

// ── Shared output component ────────────────────────

function FilterOutput() {
	const { value, activeCount } = useFilter()

	return (
		<div className="mt-4 flex items-start gap-3">
			<Badge variant="soft" color={activeCount > 0 ? 'blue' : 'zinc'}>
				{activeCount} active
			</Badge>
			<Text className="font-mono text-xs whitespace-pre-wrap break-all">
				{JSON.stringify(value, null, 2)}
			</Text>
		</div>
	)
}

// ── Demo ───────────────────────────────────────────

export default function FilterDemo() {
	return (
		<Stack gap={8}>
			<Example title="Basic">
				<BasicDemo />
			</Example>

			<Example title="With DatePicker">
				<DateDemo />
			</Example>

			<Example title="Render Props">
				<RenderPropsDemo />
			</Example>
		</Stack>
	)
}
