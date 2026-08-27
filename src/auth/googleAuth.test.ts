import { clientIdProblem } from './googleAuth'

describe('clientIdProblem', () => {
  it('accepts a real-looking web client ID', () => {
    expect(clientIdProblem('1234567890-abcDEF123.apps.googleusercontent.com')).toBeNull()
  })

  it('tolerates surrounding whitespace from a hand-edited .env', () => {
    expect(clientIdProblem('  1234-abc.apps.googleusercontent.com \n')).toBeNull()
  })

  it('rejects a missing value', () => {
    expect(clientIdProblem(undefined)).toMatch(/is not set/)
    expect(clientIdProblem('')).toMatch(/is not set/)
  })

  it('rejects the .env.example placeholder', () => {
    // Left in place, this reaches Google and returns a bare flowName=GeneralOAuthFlow page.
    expect(clientIdProblem('your-client-id.apps.googleusercontent.com')).toMatch(/placeholder/)
  })

  it('rejects anything that is not a Google client ID', () => {
    expect(clientIdProblem('not-a-client-id')).toMatch(/does not look like/)
    expect(clientIdProblem('123.apps.googleusercontent.com.evil.test')).toMatch(/does not look like/)
  })
})
