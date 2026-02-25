import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { NetworkBanner } from '../components/NetworkBanner'

function renderBanner(props: Partial<Parameters<typeof NetworkBanner>[0]> = {}) {
  const defaultProps = {
    online: true,
    hasErrors: false,
    loading: false,
    onRetry: vi.fn(),
    ...props,
  }
  return render(
    <MantineProvider>
      <NetworkBanner {...defaultProps} />
    </MantineProvider>,
  )
}

describe('NetworkBanner', () => {
  it('renders nothing when online with no errors', () => {
    renderBanner()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows offline banner when offline', () => {
    renderBanner({ online: false })
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument()
  })

  it('shows error banner with retry button when online with errors', () => {
    renderBanner({ hasErrors: true })
    expect(screen.getByText(/could not be reached/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('offline takes precedence over errors', () => {
    renderBanner({ online: false, hasErrors: true })
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument()
    expect(screen.queryByText(/could not be reached/i)).not.toBeInTheDocument()
  })

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn()
    renderBanner({ hasErrors: true, onRetry })
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows loading state on retry button', () => {
    renderBanner({ hasErrors: true, loading: true })
    const button = screen.getByRole('button', { name: /retry/i })
    expect(button).toHaveAttribute('data-loading', 'true')
  })
})
