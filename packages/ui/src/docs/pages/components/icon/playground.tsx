import { Star } from 'lucide-react'
import { Icon, type IconProps } from 'ui/icon'

export default function IconPlayground(props: IconProps) {
	return <Icon {...props} icon={<Star />} />
}
