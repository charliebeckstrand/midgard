import { notFound } from 'next/navigation'
import { Avatar, AvatarGroup, AvatarSkeleton } from 'ui/avatar'
import { Badge, BadgeSkeleton } from 'ui/badge'
import { Banner } from 'ui/banner'
import { Box } from 'ui/box'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'
import { ButtonSkeleton } from 'ui/button'
import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from 'ui/card'
import { CheckboxSkeleton } from 'ui/checkbox'
import { Divider } from 'ui/divider'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/dl'
import { Flex } from 'ui/flex'
import { Grid } from 'ui/grid'
import { Heading, HeadingSkeleton } from 'ui/heading'
import { Kbd } from 'ui/kbd'
import { LoadingDots, LoadingSpinner } from 'ui/loading'
import { Placeholder } from 'ui/placeholder'
import { RadioSkeleton } from 'ui/radio'
import { Split } from 'ui/split'
import { Stack } from 'ui/stack'
import {
	Stat,
	StatDelta,
	StatDeltaSkeleton,
	StatDescription,
	StatDescriptionSkeleton,
	StatLabel,
	StatLabelSkeleton,
	StatValue,
	StatValueSkeleton,
} from 'ui/stat'
import { StatusDot } from 'ui/status'
import { SwitchSkeleton } from 'ui/switch'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableLoading,
	TableRow,
} from 'ui/table'
import { Text, TextSkeleton } from 'ui/text'
import { TextareaSkeleton } from 'ui/textarea'

/**
 * Build-time guard for the ui package's server-renderable surface. This page
 * carries no 'use client' directive, so every component below renders as a
 * React Server Component; `next build` fails if one of them transitively
 * pulls client-only code without declaring a client boundary. The static
 * boundary test in packages/ui covers the source level; this covers the
 * bundler level. Dev-only: production requests get a 404.
 */
export default function RscProbePage() {
	if (process.env.NODE_ENV === 'production') notFound()

	return (
		<Stack gap="lg" className="p-8">
			<Heading level={1}>RSC probe</Heading>
			<Text>Every component on this page renders as a React Server Component.</Text>

			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/">Home</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink current>Probe</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<Flex gap="md" align="center">
				<Badge color="blue">Static</Badge>
				<Badge href="/rsc-probe" size="sm">
					Linked
				</Badge>
				<StatusDot status="active" label="Active" />
				<Kbd>⌘K</Kbd>
				<LoadingSpinner size="sm" />
				<LoadingDots size="sm" />
			</Flex>

			<Divider />

			<Grid columns={2} gap="md">
				<Card size="sm">
					<CardHeader>
						<CardTitle size="sm">Card</CardTitle>
						<CardDescription>Server-rendered card</CardDescription>
					</CardHeader>
					<CardBody>
						<Stat>
							<StatLabel>Revenue</StatLabel>
							<StatValue>$12,345</StatValue>
							<StatDelta trend="up">+5%</StatDelta>
							<StatDescription>vs last month</StatDescription>
						</Stat>
					</CardBody>
					<CardFooter>
						<Text>Footer</Text>
					</CardFooter>
				</Card>

				<Card>
					<CardBody>
						<Flex gap="md" align="center">
							<AvatarGroup size="sm" extra={2}>
								<Avatar initials="AB" />
								<Avatar initials="CD" status="active" />
							</AvatarGroup>
							<Box p="sm" radius="md" outline>
								<Text>Box</Text>
							</Box>
						</Flex>
					</CardBody>
				</Card>
			</Grid>

			<Banner
				severity="info"
				title="Static banner"
				description="The banner file is static; its Alert core renders as a client island."
			/>

			<Table density="compact" grid striped>
				<TableHead>
					<TableRow>
						<TableHeader>Name</TableHeader>
						<TableHeader>Role</TableHeader>
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						<TableCell>Jane Doe</TableCell>
						<TableCell>Engineer</TableCell>
					</TableRow>
					<TableRow>
						<TableCell>John Roe</TableCell>
						<TableCell>Designer</TableCell>
					</TableRow>
				</TableBody>
				<TableLoading columns={2} rows={1} />
			</Table>

			<DescriptionList>
				<DescriptionTerm>Tier</DescriptionTerm>
				<DescriptionDetails>Static</DescriptionDetails>
				<DescriptionTerm>Rendered by</DescriptionTerm>
				<DescriptionDetails>React Server Components</DescriptionDetails>
			</DescriptionList>

			<Heading level={2} size="sm">
				Loading tree (explicit skeleton variants)
			</Heading>

			<Split gap="md">
				<Stack gap="sm">
					<HeadingSkeleton level={3} />
					<TextSkeleton />
					<AvatarSkeleton size="sm" />
					<BadgeSkeleton size="sm" />
					<ButtonSkeleton />
					<Placeholder className="w-24" />
				</Stack>
				<Stack gap="sm">
					<CheckboxSkeleton />
					<RadioSkeleton />
					<SwitchSkeleton />
					<TextareaSkeleton rows={2} />
					<StatLabelSkeleton />
					<StatValueSkeleton size="sm" />
					<StatDeltaSkeleton />
					<StatDescriptionSkeleton />
				</Stack>
			</Split>
		</Stack>
	)
}
