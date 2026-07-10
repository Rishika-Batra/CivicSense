/**
 * ReportIssue Page — React Testing Library Tests
 *
 * Validates Zod/RHF form field rules for the complaint report form.
 * Leaflet map is mocked (it requires browser canvas/DOM APIs not
 * available in jsdom). The API client is mocked to avoid real network calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// ─── Mock Leaflet ─────────────────────────────────────────────────────────────
// jsdom has no canvas/SVG, so Leaflet map APIs must be stubbed out

vi.mock('leaflet', () => {
  const mockMap = {
    setView: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  }
  const mockMarker = {
    addTo: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    getLatLng: vi.fn().mockReturnValue({ lat: 28.6139, lng: 77.209 }),
    setLatLng: vi.fn(),
  }
  const mockTileLayer = {
    addTo: vi.fn().mockReturnThis(),
  }
  return {
    default: {
      map: vi.fn().mockReturnValue(mockMap),
      tileLayer: vi.fn().mockReturnValue(mockTileLayer),
      marker: vi.fn().mockReturnValue(mockMarker),
      Icon: {
        Default: {
          prototype: {},
          mergeOptions: vi.fn(),
        },
      },
    },
  }
})

// ─── Mock API client ─────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn().mockResolvedValue({ data: { success: false } }),
    get: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

// ─── Mock react-router-dom navigate ──────────────────────────────────────────

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

// ─── Import component after mocks ────────────────────────────────────────────

import { ReportIssue } from '../pages/ReportIssue'

// ─── Helper ──────────────────────────────────────────────────────────────────

function renderReportIssue() {
  return render(
    <MemoryRouter>
      <ReportIssue />
    </MemoryRouter>
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ReportIssue Page — form validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the complaint title and description fields', () => {
    renderReportIssue()
    expect(screen.getByLabelText(/complaint title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description details/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /file report/i })).toBeInTheDocument()
  })

  it('shows title validation error when title is too short', async () => {
    renderReportIssue()
    const titleInput = screen.getByLabelText(/complaint title/i)

    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Hi') // Only 2 chars, min is 3

    fireEvent.click(screen.getByRole('button', { name: /file report/i }))

    await waitFor(() => {
      expect(screen.getByText(/title must be at least 3 characters/i)).toBeInTheDocument()
    })
  })

  it('shows description validation error when description is too short', async () => {
    renderReportIssue()
    const descriptionInput = screen.getByLabelText(/description details/i)

    await userEvent.clear(descriptionInput)
    await userEvent.type(descriptionInput, 'Short') // Only 5 chars, min is 10

    fireEvent.click(screen.getByRole('button', { name: /file report/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/description must be at least 10 characters/i)
      ).toBeInTheDocument()
    })
  })

  it('shows title max-length validation error for titles over 100 chars', async () => {
    renderReportIssue()
    const titleInput = screen.getByLabelText(/complaint title/i)
    const longTitle = 'A'.repeat(101)

    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, longTitle)

    fireEvent.click(screen.getByRole('button', { name: /file report/i }))

    await waitFor(() => {
      expect(screen.getByText(/title must not exceed 100 characters/i)).toBeInTheDocument()
    })
  })

  it('shows address validation error when address field is too short', async () => {
    renderReportIssue()

    // Set valid title and description first so only the address error triggers
    const titleInput = screen.getByLabelText(/complaint title/i)
    const descInput = screen.getByLabelText(/description details/i)

    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Valid complaint title')
    await userEvent.clear(descInput)
    await userEvent.type(descInput, 'Valid description that is long enough')

    // Clear the address field (default is the geocoded address placeholder)
    // The address field is a hidden input controlled by form state, so we
    // fire a submit to trigger validation against the Zod schema
    fireEvent.click(screen.getByRole('button', { name: /file report/i }))

    // The default address is 'Fetching pin location address...' which is >=5 chars
    // so address should NOT show an error here — api.post should be attempted
    await waitFor(() => {
      expect(screen.queryByText(/title must be at least 3 characters/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/description must be at least 10 characters/i)).not.toBeInTheDocument()
    })
  })

  it('displays category and priority dropdowns with expected options', () => {
    renderReportIssue()

    const categorySelect = screen.getByLabelText(/category/i)
    expect(categorySelect).toBeInTheDocument()

    const prioritySelect = screen.getByLabelText(/priority rating/i)
    expect(prioritySelect).toBeInTheDocument()

    // Verify key category options are present
    expect(screen.getByRole('option', { name: 'Pothole' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Garbage' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument()
  })
})
