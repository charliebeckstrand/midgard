import { createCurrentContent } from '../../primitives'

const { Contents: TabContents, Content: TabContent } = createCurrentContent('tab')

export { TabContent, TabContents }

export type TabContentsProps = React.ComponentPropsWithoutRef<typeof TabContents>
export type TabContentProps = React.ComponentPropsWithoutRef<typeof TabContent>
