import { Plus } from 'lucide-react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { FixtureCase, FixtureGroup, FixtureSheet } from '../fixture'

const VARIANTS = ['solid', 'soft', 'outline', 'plain', 'bare'] as const

const COLORS = ['zinc', 'red', 'amber', 'green', 'blue', 'rose', 'violet', 'sky'] as const

const SIZES = ['xs', 'sm', 'md', 'lg'] as const

export function Sheet() {
	return (
		<FixtureSheet title="Buttons">
			<FixtureGroup title="Button">
				{VARIANTS.map((variant) => (
					<FixtureCase key={variant} label={variant}>
						{COLORS.map((color) => (
							<Button key={color} variant={variant} color={color}>
								{color}
							</Button>
						))}
					</FixtureCase>
				))}
				<FixtureCase label="size">
					{SIZES.map((size) => (
						<Button key={size} size={size}>
							{size}
						</Button>
					))}
				</FixtureCase>
				<FixtureCase label="icon">
					<Button prefix={<Icon icon={<Plus />} />}>Add</Button>
					<Button aria-label="Add">
						<Icon icon={<Plus />} />
					</Button>
				</FixtureCase>
				<FixtureCase label="disabled">
					{VARIANTS.map((variant) => (
						<Button key={variant} variant={variant} disabled>
							{variant}
						</Button>
					))}
				</FixtureCase>
				<FixtureCase label="long label, full width" wide>
					<Button className="w-full">
						A button label that is long enough to wrap or to stretch the container
					</Button>
				</FixtureCase>
			</FixtureGroup>
		</FixtureSheet>
	)
}
