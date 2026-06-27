'use client'

import { Download } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Toolbar } from '../../components/toolbar'

/** Props for {@link GridExportButton}. @internal */
type GridExportButtonProps = {
	label: ReactNode
	/** Downloads the grid's filtered/sorted rows as CSV. */
	onExport: () => void
}

/**
 * Standalone toolbar button that triggers the grid's CSV export, mirroring the
 * column manager's toolbar trigger. {@link GridData} renders it when
 * {@link GridDataProps.exportable} opts into `toolbarButton`; the same export
 * also stays reachable from the header context menu.
 *
 * @internal
 */
export function GridExportButton({ label, onExport }: GridExportButtonProps) {
	return (
		<Toolbar aria-label="Data export">
			<Button variant="plain" onClick={onExport}>
				<Icon icon={<Download />} />
				{label}
			</Button>
		</Toolbar>
	)
}
