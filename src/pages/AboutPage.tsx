import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GOOGLE_SCOPES } from '@/auth/googleAuth'

const REPO_URL = 'https://github.com/bycym/birthday-present-tracker'

export function AboutPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>About</CardTitle>
        <CardDescription>
          Privacy-first birthday gift tracking · version {__APP_VERSION__}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Birthday Gift Tracker helps you remember upcoming birthdays and track gifts per year.
          All data is stored locally in your browser — no backend, no cloud sync.
        </p>
        <p>
          Google Calendar access is read-only (<code>{GOOGLE_SCOPES}</code>). The access token
          lives in memory for the current tab and is never written to storage. Gift records,
          notes and settings stay in IndexedDB on this device.
        </p>
        <p>
          <a className="text-primary hover:underline" href={REPO_URL} target="_blank" rel="noreferrer">
            Source code on GitHub
          </a>
        </p>
      </CardContent>
    </Card>
  )
}
