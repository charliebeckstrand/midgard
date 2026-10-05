import { ProgressBar, type ProgressBarProps } from 'ui/progress'

export default function ProgressPlayground(props: ProgressBarProps) {
	return <ProgressBar aria-label="Upload progress" value={60} {...props} />
}
