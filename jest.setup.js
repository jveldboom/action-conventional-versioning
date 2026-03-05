/* eslint-env jest */
// Mock @actions/core to suppress output during tests
jest.mock('@actions/core', () => ({
  ...jest.requireActual('@actions/core'),
  setFailed: jest.fn(),
  setOutput: jest.fn()
}))
