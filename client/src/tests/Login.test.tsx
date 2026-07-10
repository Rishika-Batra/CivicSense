/**
 * Login Page — React Testing Library Tests
 *
 * Validates form-level Zod/RHF validation behaviour and
 * verifies that auth.login is called with the right credentials.
 *
 * AuthContext is mocked so tests don't need a real API server.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Login } from '../pages/Login'

// ─── Mock AuthContext ─────────────────────────────────────────────────────────

const mockLogin = vi.fn()

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    token: null,
    loading: false,
  }),
}))

// ─── Mock react-router-dom navigate ───────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Login Page — form validation', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockNavigate.mockReset()
  })

  it('renders email and password fields and a submit button', () => {
    renderLogin()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors when submitting an empty form', async () => {
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })

    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('shows an invalid email error for a bad email format', async () => {
    const { container } = renderLogin()
    const emailInput = screen.getByLabelText(/email address/i)

    // fireEvent.change bypasses userEvent's native-event simulation so RHF
    // sees the value even though it fails HTML5 type=email native constraint.
    fireEvent.change(emailInput, { target: { value: 'not-valid' } })
    await userEvent.type(screen.getByLabelText(/password/i), 'somepassword')

    // Submit the form directly to skip jsdom's native checkValidity() guard
    const form = container.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })

    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('shows a password length error when password is under 8 chars', async () => {
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'short')
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })

    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('calls auth.login with correct credentials on valid form submission', async () => {
    mockLogin.mockResolvedValue(undefined)
    renderLogin()

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'securePass1')
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'securePass1')
    })
  })

  it('shows an error message when login fails with an API error', async () => {
    mockLogin.mockRejectedValue({
      response: { data: { message: 'Invalid email or password.' } },
    })
    renderLogin()

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongPassword')
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })
  })
})
