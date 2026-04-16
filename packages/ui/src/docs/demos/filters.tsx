'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { DatePicker } from '../../components/datepicker'
import { Field, Label } from '../../components/fieldset'
import { Filters, FiltersClear, FiltersField, useFilters } from '../../components/filters'
import { Input } from '../../components/input'
import { NumberInput } from '../../components/number-input'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

// ── Basic ──────────────────────────────────────────

type BasicFilters = {
	search: string
	status: string | undefined
}

// ── Shared output component ────────────────────────

function FilterOutput() {
	const { value, activeCount } = useFilters()

	return (
		<div className={activeCount > 0 ? 'whitespace-pre-wrap' : ''}>
			{JSON.stringify(value, null, 2)}
		</div>
	)
}

function FiltersClearButton() {
	const { activeCount } = useFilters()

	if (activeCount === 0) return null

	return (
		<FiltersClear>
			<Button variant="soft" color="red">
				Clear
			</Button>
		</FiltersClear>
	)
}

function BasicDemo() {
	const [filters, setFilters] = useState<BasicFilters>({
		search: '',
		status: undefined,
	})

	return (
		<Filters
			value={filters}
			suffix={<FilterOutput />}
			clear={<FiltersClearButton />}
			onChange={setFilters}
		>
			<Field>
				<Label>Search</Label>
				<FiltersField name="search">
					<Input placeholder="Search" />
				</FiltersField>
			</Field>
			<Field>
				<Label>Status</Label>
				<FiltersField name="status">
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
			</Field>
		</Filters>
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
		<Filters
			value={filters}
			suffix={<FilterOutput />}
			clear={<FiltersClearButton />}
			onChange={setFilters}
		>
			<Field>
				<Label>Search</Label>
				<FiltersField name="search">
					<Input placeholder="Search" />
				</FiltersField>
			</Field>
			<Field>
				<Label>Date Range</Label>
				<FiltersField name="dateRange">
					<DatePicker range />
				</FiltersField>
			</Field>
			<Field>
				<Label>Category</Label>
				<FiltersField name="category">
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
			</Field>
		</Filters>
	)
}

// ── Render Props ───────────────────────────────────

type RenderPropsFilters = {
	search: string
	minPrice: number | undefined
	maxPrice: number | undefined
}

function RenderPropsDemo() {
	const [filters, setFilters] = useState<RenderPropsFilters>({
		search: '',
		minPrice: undefined,
		maxPrice: undefined,
	})

	return (
		<Filters
			value={filters}
			suffix={<FilterOutput />}
			clear={<FiltersClearButton />}
			onChange={setFilters}
		>
			<Field>
				<Label>Search</Label>
				<FiltersField name="search">
					<Input placeholder="Search" />
				</FiltersField>
			</Field>
			<Field>
				<Label>Min Price</Label>
				<FiltersField name="minPrice">
					<NumberInput placeholder="0" min={0} />
				</FiltersField>
			</Field>
			<Field>
				<Label>Max Price</Label>
				<FiltersField name="maxPrice">
					<NumberInput placeholder="1000" min={0} />
				</FiltersField>
			</Field>
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
