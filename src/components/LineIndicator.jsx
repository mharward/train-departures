import { getLineColor, getContrastColor } from '../utils/modeColors'

export function LineIndicator({ lineId, lineName, modeName }) {
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
