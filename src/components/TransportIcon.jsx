// TfL Roundel icon
function TflIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size * (500 / 615.322)}
      viewBox="0 0 615.322 500"
      className="transport-icon tfl-icon"
      aria-label="TfL"
    >
      <g>
        <path fill="#113B92" d="M469.453,249.986c0,89.078-72.26,161.308-161.337,161.308c-89.1,0-161.294-72.23-161.294-161.308c0-89.063,72.194-161.286,161.294-161.286C397.194,88.699,469.453,160.922,469.453,249.986 M308.116,0C170.027,0,58.094,111.925,58.094,249.986C58.094,388.06,170.027,500,308.116,500c138.06,0,249.985-111.94,249.985-250.014C558.101,111.925,446.176,0,308.116,0"/>
        <rect y="199.516" fill="#113B92" width="615.322" height="101.129"/>
      </g>
    </svg>
  )
}

// National Rail double arrow icon
function NationalRailIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size * (39 / 62)}
      viewBox="0 0 62 39"
      className="transport-icon national-rail-icon"
      aria-label="National Rail"
    >
      <g stroke="#ED1C24" fill="none">
        <path d="M1,-8.9 46,12.4 16,26.6 61,47.9" strokeWidth="6"/>
        <path d="M0,12.4H62m0,14.2H0" strokeWidth="6.4"/>
      </g>
    </svg>
  )
}

export function TransportIcon({ type, size = 20 }) {
  if (type === 'national-rail') {
    return <NationalRailIcon size={size} />
  }
  return <TflIcon size={size} />
}
