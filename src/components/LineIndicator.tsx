import { Badge } from '@mantine/core'
import { getLineColor, getContrastColor } from '../utils/modeColors'

interface LineIndicatorProps {
  lineId: string
  lineName: string
  modeName: string
}

export function LineIndicator({ lineId, lineName, modeName }: LineIndicatorProps) {
  const bgColor = getLineColor(lineId, modeName)
  const textColor = getContrastColor(bgColor)

  return (
    <Badge
      size="xs"
      radius="xs"
      styles={{
        root: {
          backgroundColor: bgColor,
          color: textColor,
          fontWeight: 600,
          textTransform: 'none',
        },
      }}
    >
      {lineName}
    </Badge>
  )
}
