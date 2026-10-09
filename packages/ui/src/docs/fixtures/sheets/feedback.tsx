import { Alert } from '../../../components/alert'
import { Badge } from '../../../components/badge'
import { Banner } from '../../../components/banner'
import { Button } from '../../../components/button'
import { LoadingDots, LoadingSpinner } from '../../../components/loading'
import { Placeholder } from '../../../components/placeholder'
import { ProgressBar, ProgressGauge } from '../../../components/progress'
import { StatusDot } from '../../../components/status'
import { scale as badgeScale } from '../../../recipes/kata/badge'
import { scale as loadingScale } from '../../../recipes/kata/loading'
import { scale as progressScale } from '../../../recipes/kata/progress'
import { Flex } from '../../../structure/flex'
import { Stack } from '../../../structure/stack'
import { FixtureCase, FixtureGroup, FixtureSheet } from '../fixture'

const SEVERITIES = ['info', 'success', 'warning', 'error'] as const

const ALERT_VARIANTS = ['solid', 'soft', 'outline', 'plain'] as const

const BADGE_VARIANTS = ['solid', 'soft', 'outline', 'plain'] as const

const BADGE_COLORS = ['zinc', 'red', 'amber', 'green', 'blue', 'rose', 'violet', 'sky'] as const

const STATUSES = ['inactive', 'active', 'info', 'warning', 'error'] as const

const STATUS_VARIANTS = ['solid', 'outline'] as const

const LOADING_COLORS = ['current', 'zinc', 'red', 'amber', 'green', 'blue'] as const

const PROGRESS_COLORS = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const

const VALUES = [0, 25, 60, 100] as const

export function Sheet() {
	return (
		<FixtureSheet title="Feedback">
			<FixtureGroup title="Alert">
				{SEVERITIES.map((severity) => (
					<FixtureCase key={severity} label={severity}>
						<Alert severity={severity} title={severity} description="A fixed description." />
					</FixtureCase>
				))}
				{ALERT_VARIANTS.map((variant) => (
					<FixtureCase key={variant} label={variant}>
						<Alert variant={variant} severity="info" title={variant} />
					</FixtureCase>
				))}
				<FixtureCase label="default">
					<Alert description="An alert with no severity and no title." />
				</FixtureCase>
				<FixtureCase label="actions, closable">
					<Alert
						severity="warning"
						title="Storage is almost full"
						actions={<Button size="sm">Upgrade</Button>}
						closable
					/>
				</FixtureCase>
				<FixtureCase label="long label, full width" wide>
					<Alert
						className="w-full"
						severity="error"
						title="An alert title that is long enough to wrap or to stretch the container"
						description="The description is long too, so that the text wraps onto more than one line at the narrow width and fills the full width of the row at the wide width."
						closable
					/>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Banner">
				{SEVERITIES.map((severity) => (
					<FixtureCase key={severity} label={severity} wide>
						<Banner severity={severity} title={severity} description="A fixed description." />
					</FixtureCase>
				))}
				<FixtureCase label="not closable, actions" wide>
					<Banner
						severity="info"
						title="New version available"
						actions={<Button size="sm">Update now</Button>}
						closable={false}
					/>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Badge">
				{BADGE_VARIANTS.map((variant) => (
					<FixtureCase key={variant} label={variant}>
						{BADGE_COLORS.map((color) => (
							<Badge key={color} variant={variant} color={color}>
								{color}
							</Badge>
						))}
					</FixtureCase>
				))}
				<FixtureCase label="size">
					{badgeScale.map((size) => (
						<Badge key={size} size={size}>
							{size}
						</Badge>
					))}
				</FixtureCase>
				<FixtureCase label="radius full">
					{BADGE_COLORS.slice(0, 4).map((color) => (
						<Badge key={color} radius="full" color={color}>
							{color}
						</Badge>
					))}
				</FixtureCase>
				<FixtureCase label="long label, full width" wide>
					<Badge>A badge label that is long enough to wrap or to stretch the container</Badge>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="StatusDot">
				{STATUS_VARIANTS.map((variant) => (
					<FixtureCase key={variant} label={variant}>
						{STATUSES.map((status) => (
							<StatusDot key={status} variant={variant} status={status} label={status} />
						))}
					</FixtureCase>
				))}
				<FixtureCase label="size">
					{SIZES.map((size) => (
						<StatusDot key={size} size={size} status="active" label={size} />
					))}
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Loading">
				<FixtureCase label="spinner color">
					{LOADING_COLORS.map((color) => (
						<LoadingSpinner key={color} color={color} />
					))}
				</FixtureCase>
				<FixtureCase label="spinner size">
					{loadingScale.spinner.map((size) => (
						<LoadingSpinner key={size} size={size} />
					))}
				</FixtureCase>
				<FixtureCase label="dots color">
					{LOADING_COLORS.map((color) => (
						<LoadingDots key={color} color={color} />
					))}
				</FixtureCase>
				<FixtureCase label="dots size">
					{loadingScale.dots.map((size) => (
						<LoadingDots key={size} size={size} />
					))}
				</FixtureCase>
				<FixtureCase label="inside a disabled button">
					<Button disabled prefix={<LoadingSpinner />}>
						Loading
					</Button>
					<Button variant="soft" disabled prefix={<LoadingDots />}>
						Saving
					</Button>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Progress">
				<FixtureCase label="bar value">
					<Stack gap="sm" full>
						{VALUES.map((value) => (
							<ProgressBar key={value} value={value} aria-label={`${value} percent`} />
						))}
					</Stack>
				</FixtureCase>
				<FixtureCase label="bar color">
					<Stack gap="sm" full>
						{PROGRESS_COLORS.map((color) => (
							<ProgressBar key={color} value={60} color={color} aria-label={color} />
						))}
					</Stack>
				</FixtureCase>
				<FixtureCase label="bar size">
					<Stack gap="sm" full>
						{progressScale.bar.map((size) => (
							<ProgressBar key={size} value={40} size={size} aria-label={size} />
						))}
					</Stack>
				</FixtureCase>
				<FixtureCase label="gauge value">
					{VALUES.map((value) => (
						<ProgressGauge key={value} value={value} aria-label={`${value} percent`} />
					))}
				</FixtureCase>
				<FixtureCase label="gauge color, label">
					{PROGRESS_COLORS.map((color) => (
						<ProgressGauge key={color} value={75} color={color} centerLabel aria-label={color} />
					))}
				</FixtureCase>
				<FixtureCase label="gauge size">
					{progressScale.gauge.map((size) => (
						<ProgressGauge key={size} value={50} size={size} aria-label={size} />
					))}
				</FixtureCase>
				<FixtureCase label="long label, full width" wide>
					<ProgressBar value={33} className="w-full" aria-label="Full width progress" />
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Placeholder">
				<FixtureCase label="default">
					<Stack gap="sm" full>
						<Placeholder />
					</Stack>
				</FixtureCase>
				<FixtureCase label="shapes">
					<Flex align="center" gap="md" full>
						<Placeholder className="size-10 rounded-full" />
						<Stack gap="sm" flex="1">
							<Placeholder />
							<Placeholder className="w-2/3" />
						</Stack>
					</Flex>
				</FixtureCase>
				<FixtureCase label="full width" wide>
					<Placeholder className="h-24 w-full" />
				</FixtureCase>
			</FixtureGroup>
		</FixtureSheet>
	)
}
