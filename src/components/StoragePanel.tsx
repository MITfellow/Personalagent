import { useCallback, useEffect, useState } from 'react';
import {
  canInstall,
  isStandalone,
  promptInstall,
  requestPersistence,
  storageReport,
  subscribeInstallable,
  type StorageReport,
} from '../lib/install';
import { humanSize } from '../lib/files';

/**
 * What the app is using on disk, whether that data is safe from eviction, and
 * how to install it. An app that holds someone's files owes them this screen.
 */
export default function StoragePanel({ onNotice }: { onNotice: (msg: string) => void }) {
  const [report, setReport] = useState<StorageReport | null>(null);
  const [installable, setInstallable] = useState(canInstall());
  const standalone = isStandalone();

  const refresh = useCallback(() => {
    void storageReport().then(setReport);
  }, []);

  useEffect(refresh, [refresh]);
  useEffect(() => subscribeInstallable(() => setInstallable(canInstall())), []);

  const pct = report && report.quota > 0 ? Math.min(100, (report.usage / report.quota) * 100) : 0;

  return (
    <>
      <div className="panel-label" style={{ marginTop: 6 }}>
        Storage
      </div>

      {report?.supported ? (
        <div className="storage-box">
          <div className="storage-bar" role="img" aria-label={`${humanSize(report.usage)} used`}>
            {/* a 0.3% sliver is invisible, so the fill has a floor */}
            <span style={{ width: `${Math.max(pct, report.usage > 0 ? 1.5 : 0)}%` }} />
          </div>
          <div className="storage-line">
            <strong>{humanSize(report.usage)}</strong> used
            {report.quota > 0 && <span className="muted"> of {humanSize(report.quota)} available</span>}
          </div>
          <div className="storage-line muted">
            {report.persisted
              ? 'Your messages are marked as persistent — the browser will not clear them to free space.'
              : 'The browser may clear this data if the disk fills up.'}
          </div>
          {!report.persisted && (
            <button
              className="btn"
              onClick={async () => {
                const ok = await requestPersistence();
                refresh();
                onNotice(
                  ok
                    ? 'Your messages are now protected from automatic cleanup.'
                    : 'The browser declined. Installing the app usually grants this.',
                );
              }}
            >
              Keep my data safe
            </button>
          )}
        </div>
      ) : (
        <div className="storage-line muted">This browser does not report storage usage.</div>
      )}

      <div className="panel-label" style={{ marginTop: 10 }}>
        App
      </div>
      {standalone ? (
        <div className="storage-line muted">Running as an installed app.</div>
      ) : installable ? (
        <>
          <button
            className="btn primary"
            onClick={async () => {
              const accepted = await promptInstall();
              if (accepted) onNotice('Veo is installing.');
            }}
          >
            Install Veo
          </button>
          <div className="storage-line muted">
            Adds it to your dock or Start menu, opens in its own window, and lets it open photos,
            PDFs and audio files directly from your computer.
          </div>
        </>
      ) : (
        <div className="storage-line muted">
          To install, use your browser&rsquo;s <em>Install app</em> option — in Chrome and Edge it is
          the icon at the right of the address bar.
        </div>
      )}
    </>
  );
}
