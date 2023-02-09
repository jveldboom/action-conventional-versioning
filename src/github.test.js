/* eslint-env jest */
const core = require('@actions/core')
const github = require('./github')

jest.spyOn(core, 'setOutput')

describe('github', () => {
  beforeEach(() => {

  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('setVersionOutputs()', () => {
    it('should set output for all values', () => {

    })
  })
})
