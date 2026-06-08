'use client'

import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../../components/badge'
import { Button } from '../../../components/button'
import { Flex } from '../../../components/flex'
import { Icon } from '../../../components/icon'
import {
	Sheet,
	SheetBody,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '../../../components/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { GlassProvider } from '../../../providers/glass'
import type { PropDef } from '../../api-reference/types'
import { ReferencesPanel } from './references-panel'
import { TypeBadges } from './type-badges'

/**
 * Type-column cell. Picks one of three modes:
 *
 *   - **External** — outline badge with a source-package tooltip. The type
 *     isn't authored here, so hover-to-source beats splitting into badges.
 *   - **References** — bare type plus a Sheet trigger for the resolved
 *     definitions of every referenced alias.
 *   - **Simple** (default) — plain badges via `TypeBadges`.
 */
export function TypeCell({ prop }: { prop: PropDef }) {
	const [open, setOpen] = useState(false)

	if (prop.externalFrom) {
		return (
			<Tooltip>
				<TooltipTrigger>
					<Badge variant="outline">{prop.type}</Badge>
				</TooltipTrigger>
				<TooltipContent>
					Type imported from <span className="font-semibold">{prop.externalFrom}</span>
				</TooltipContent>
			</Tooltip>
		)
	}

	const hasReferences = !!prop.references && Object.keys(prop.references).length > 0

	if (!hasReferences) {
		return <TypeBadges type={prop.type} />
	}

	return (
		<>
			<Flex gap="md" direction={{ initial: 'col', xl: 'row' }} wrap>
				<Badge className="text-sm">{prop.type}</Badge>
				<Button variant="plain" size="sm" onClick={() => setOpen(true)}>
					View references
					<Icon icon={<ChevronRight />} />
				</Button>
			</Flex>
			<GlassProvider>
				<Sheet open={open} onOpenChange={setOpen}>
					<SheetHeader>
						<SheetTitle className="font-mono">{prop.name}</SheetTitle>
						<SheetDescription className="font-mono">{prop.type}</SheetDescription>
					</SheetHeader>
					<SheetBody>
						<ReferencesPanel references={prop.references ?? {}} />
					</SheetBody>
					<SheetFooter>
						<Button onClick={() => setOpen(false)}>Close</Button>
					</SheetFooter>
				</Sheet>
			</GlassProvider>
		</>
	)
}
