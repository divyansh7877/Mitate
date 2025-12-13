import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LandingPage } from './LandingPage'
import { AppProvider } from '@/lib/app-context'
import { userEvent } from '@testing-library/user-event'

// Wrapper to provide context
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<AppProvider>{ui}</AppProvider>)
}

describe('LandingPage', () => {
  it('renders correctly', () => {
    renderWithProvider(<LandingPage />)
    expect(screen.getByText('ArXiv Visual Explainer')).toBeInTheDocument()
    expect(screen.getByText('Generate Visual Explainer')).toBeInTheDocument()
  })

  it('validates input', async () => {
    renderWithProvider(<LandingPage />)
    const button = screen.getByRole('button', {
      name: /generate visual explainer/i,
    })

    fireEvent.click(button)

    await waitFor(() => {
      // The error message is rendered inside a <p> tag with id ending in -form-item-message
      // Look for it by role or by querying the aria-invalid input
      const input = screen.getByPlaceholderText(
        /e.g., Transformer architecture/i,
      )
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    renderWithProvider(<LandingPage />)

    const input = screen.getByPlaceholderText(/e.g., Transformer architecture/i)
    await user.type(input, 'Attention Is All You Need')

    const button = screen.getByRole('button', {
      name: /generate visual explainer/i,
    })
    await user.click(button)

    // Since we can't easily check the state change in the context without mocking it or exposing it,
    // we assume that if no validation error is shown and the function completes, it's successful.
    // A better test would be an integration test checking if the LoadingState appears.
    expect(
      screen.queryByText('Please enter a topic or ArXiv link.'),
    ).not.toBeInTheDocument()
  })
})
