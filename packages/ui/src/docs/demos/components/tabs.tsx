import { useState } from 'react'
import { Button } from '../../../components/button'
import {
	Tab,
	TabContent,
	TabContents,
	TabList,
	TabListSkeleton,
	Tabs,
} from '../../../components/tabs'
import { Text } from '../../../components/text'
import { Textarea } from '../../../components/textarea'
import { Flex } from '../../../structure/flex'
import { Stack } from '../../../structure/stack'
import { Axes, Example } from '../../engine'

const tabs = ['Account', 'Notifications', 'Billing'] as const

const months = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
] as const

const steps = ['Shipping', 'Payment', 'Review'] as const

const sections = ['Profile', 'Activity', 'Invoices'] as const

function ControlledExample() {
	const [step, setStep] = useState<string>('Shipping')

	const index = steps.indexOf(step as (typeof steps)[number])

	return (
		<Tabs value={step} onValueChange={(value) => setStep(value ?? 'Shipping')}>
			<TabList aria-label="Checkout">
				{steps.map((name) => (
					<Tab key={name} value={name}>
						{name}
					</Tab>
				))}
			</TabList>
			<TabContents>
				{steps.map((name) => (
					<TabContent key={name} value={name}>
						<Text tone="muted">Enter the {name.toLowerCase()} details.</Text>
					</TabContent>
				))}
			</TabContents>
			<Flex gap="sm" className="mt-4">
				<Button
					variant="outline"
					disabled={index === 0}
					onClick={() => setStep(steps[index - 1] ?? step)}
				>
					Back
				</Button>
				<Button
					disabled={index === steps.length - 1}
					onClick={() => setStep(steps[index + 1] ?? step)}
				>
					Next
				</Button>
			</Flex>
		</Tabs>
	)
}

function PreloadExample() {
	const [warmed, setWarmed] = useState<string[]>([])

	return (
		<Stack gap="sm">
			<Tabs defaultValue="Profile">
				<TabList aria-label="Member">
					{sections.map((name) => (
						<Tab
							key={name}
							value={name}
							onPreload={(value) => value && setWarmed((prev) => [...prev, value])}
						>
							{name}
						</Tab>
					))}
				</TabList>
				<TabContents>
					{sections.map((name) => (
						<TabContent key={name} value={name}>
							<Text tone="muted">The {name.toLowerCase()} of the member.</Text>
						</TabContent>
					))}
				</TabContents>
			</Tabs>
			<Text tone="muted">
				Prefetched: {warmed.length > 0 ? warmed.join(', ') : 'none. Point at a tab, or focus it.'}
			</Text>
		</Stack>
	)
}

export function Demo() {
	return (
		<>
			<Axes
				of="Tabs"
				render={(props, label) => (
					<Tabs {...props} defaultValue="Account">
						<TabList aria-label={label}>
							{tabs.map((tab) => (
								<Tab key={tab} value={tab}>
									{tab}
								</Tab>
							))}
						</TabList>
						<TabContents>
							{tabs.map((tab) => (
								<TabContent key={tab} value={tab}>
									<Text tone="muted">{tab} settings would go here.</Text>
								</TabContent>
							))}
						</TabContents>
					</Tabs>
				)}
			/>

			<Example title="Stretch">
				<Tabs defaultValue="Sign in" className="w-full max-w-sm">
					<TabList aria-label="Authentication">
						<Tab value="Sign in" stretch>
							Sign in
						</Tab>
						<Tab value="Create account" stretch>
							Create account
						</Tab>
					</TabList>
					<TabContents>
						<TabContent value="Sign in">
							<Text tone="muted">Sign in with your email and password.</Text>
						</TabContent>
						<TabContent value="Create account">
							<Text tone="muted">Create an account with your work email.</Text>
						</TabContent>
					</TabContents>
				</Tabs>
			</Example>

			<Example title="Disabled tab">
				<Tabs defaultValue="Overview">
					<TabList aria-label="Project">
						<Tab value="Overview">Overview</Tab>
						<Tab value="Analytics">Analytics</Tab>
						<Tab value="Reports" disabled>
							Reports
						</Tab>
					</TabList>
					<TabContents>
						<TabContent value="Overview">
							<Text tone="muted">The project at a glance. Reports open on the Pro plan.</Text>
						</TabContent>
						<TabContent value="Analytics">
							<Text tone="muted">Visits and conversions for the last 30 days.</Text>
						</TabContent>
					</TabContents>
				</Tabs>
			</Example>

			<Example title="Controlled">
				<ControlledExample />
			</Example>

			<Example title="Overflow" width={360} resize>
				<Tabs defaultValue="September">
					<TabList aria-label="Month">
						{months.map((month) => (
							<Tab key={month} value={month}>
								{month}
							</Tab>
						))}
					</TabList>
					<TabContents>
						{months.map((month) => (
							<TabContent key={month} value={month}>
								<Text tone="muted">The invoices of {month}.</Text>
							</TabContent>
						))}
					</TabContents>
				</Tabs>
			</Example>

			<Example title="Keep panel state">
				<Tabs defaultValue="Draft">
					<TabList aria-label="Note">
						<Tab value="Draft">Draft</Tab>
						<Tab value="Help">Help</Tab>
					</TabList>
					<TabContents mount="lazy">
						<TabContent value="Draft">
							<Textarea aria-label="Note" placeholder="Write a note, then open Help." />
						</TabContent>
						<TabContent value="Help">
							<Text tone="muted">
								With <code>mount="lazy"</code>, the Draft panel stays mounted, so the note stays.
							</Text>
						</TabContent>
					</TabContents>
				</Tabs>
			</Example>

			<Example title="Preload">
				<PreloadExample />
			</Example>

			<Example title="Skeleton">
				<TabListSkeleton tabs={4} />
			</Example>
		</>
	)
}
