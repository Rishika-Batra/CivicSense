/**
 * Jest global setup — runs before ANY test modules are imported.
 * This guarantees JWT_SECRET is pinned to the test value so dotenv
 * cannot override it when index.ts is imported inside each test file.
 */
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'civicsense_dev_secret_32chars_long'
process.env.PORT = '5099'
