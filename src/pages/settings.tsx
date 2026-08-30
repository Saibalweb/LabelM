import { toast } from 'sonner'
import { Database, Info, Palette, Printer, Bell } from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

export function Settings() {
  return (
    <div className="flex h-full flex-col">
      <TopNav title="Settings" backTo="/" />

      <main className="flex-1 overflow-y-auto bg-surface-bright p-4 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="mb-8">
            <h2 className="font-headline-lg text-headline-lg text-on-background">Settings</h2>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Preferences, appearance, and data.
            </p>
          </div>

          <section className="space-y-3">
            <h3 className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
              Preferences
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest px-5 py-4">
                <div className="flex items-center gap-3">
                  <Printer className="size-5 text-on-surface-variant" />
                  <div>
                    <p className="font-body-md text-body-md text-on-surface">Auto-mark as printed</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Mark label printed on generate
                    </p>
                  </div>
                </div>
                <Switch
                  defaultChecked={false}
                  onCheckedChange={(v) => toast.info(`Auto-print ${v ? 'enabled' : 'disabled'}`)}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest px-5 py-4">
                <div className="flex items-center gap-3">
                  <Bell className="size-5 text-on-surface-variant" />
                  <div>
                    <p className="font-body-md text-body-md text-on-surface">Notifications</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Label reminders
                    </p>
                  </div>
                </div>
                <Switch
                  defaultChecked
                  onCheckedChange={(v) => toast.info(`Notifications ${v ? 'enabled' : 'disabled'}`)}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
              Appearance
            </h3>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-start gap-2 rounded-xl font-label-md text-label-md"
              onClick={() => toast.info('Theme presets coming soon')}
            >
              <Palette className="size-5 text-primary" />
              Theme
            </Button>
          </section>

          <section className="space-y-3">
            <h3 className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
              Data
            </h3>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-start gap-2 rounded-xl font-label-md text-label-md"
              onClick={() => toast.info('Cloud sync coming soon')}
            >
              <Database className="size-5 text-secondary" />
              Sync with cloud
            </Button>
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 size-5 shrink-0 text-on-surface-variant" />
              <div>
                <p className="font-body-md text-body-md text-on-surface">LabelMaster Pro</p>
                <p className="mt-0.5 font-body-md text-body-md leading-relaxed text-on-surface-variant">
                  Label & bill generator for inventory and retail use. Your data is stored locally on
                  this device.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}