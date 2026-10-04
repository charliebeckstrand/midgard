import { RefreshCw } from 'lucide-react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'

/**
 * The button of `Example`'s `replay`. It is a module of its own, so that a page
 * with no replay does not load the button and the icon.
 */
export function ReplayButton({ onReplay }: { onReplay: () => void }) {
	return (
		<Button variant="bare" aria-label="Replay animation" onClick={onReplay}>
			<Icon icon={<RefreshCw />} />
		</Button>
	)
}
