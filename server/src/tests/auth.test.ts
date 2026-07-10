/**
 * Auth Route Tests — Jest + Supertest
 *
 * Tests key auth flows without hitting a real database.
 * JWT_SECRET is pinned by jest.setup.js before any module loads.
 */
import request from 'supertest'
import { app } from '../index.js'
import { User } from '../models/index.js'
import bcrypt from 'bcryptjs'

afterEach(() => {
  jest.restoreAllMocks()
})

// ─── POST /api/auth/register ─────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('rejects malformed email with 422', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'John Doe',
      email: 'not-a-valid-email',
      password: 'short',
    })
    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
    expect(res.body.errors).toBeDefined()
  })

  it('creates a citizen account and returns 201 + JWT', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(null)
    jest.spyOn(User, 'create').mockResolvedValue({
      _id: 'mock-id-001',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'citizen',
    } as any)

    const res = await request(app).post('/api/auth/register').send({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'securePassword123',
    })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe('jane@example.com')
  })

  it('returns 409 when email is already taken', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue({
      _id: 'existing-id',
      email: 'taken@example.com',
    } as any)

    const res = await request(app).post('/api/auth/register').send({
      name: 'Jane Doe',
      email: 'taken@example.com',
      password: 'securePassword123',
    })

    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toContain('already exists')
  })
})

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 200 + JWT for correct credentials', async () => {
    const hash = await bcrypt.hash('correctPass1', 6)
    jest.spyOn(User, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'user-abc',
        name: 'Bob Ross',
        email: 'bob@example.com',
        role: 'citizen',
        passwordHash: hash,
      }),
    } as any)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'correctPass1' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.name).toBe('Bob Ross')
  })

  it('returns 401 for wrong password', async () => {
    const hash = await bcrypt.hash('correctPass1', 6)
    jest.spyOn(User, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'user-abc',
        name: 'Bob Ross',
        email: 'bob@example.com',
        role: 'citizen',
        passwordHash: hash,
      }),
    } as any)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'wrongPassword' })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toContain('Invalid email or password')
  })
})
