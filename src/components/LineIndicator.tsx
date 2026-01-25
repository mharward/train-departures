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
    <span
      className="line-indicator"
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      {lineName}
    </span>
  )
}
