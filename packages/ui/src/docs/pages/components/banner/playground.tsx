import { Banner, type BannerProps } from 'ui/banner'

export default function BannerPlayground(props: BannerProps) {
	return <Banner title="New version available" closable={false} {...props} />
}
