import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { errorMessage, NOTIFICATION_STREAM_URL, notificationsApi } from '../api';
import type { NotificationItem, NotificationLevel } from '../types';
import { formatDate } from '../components/format';
import { useApi, useFlash } from '../hooks';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Field,
  Modal,
  Notice,
  PageHeader,
  Select,
  Spinner,
  TextArea,
} from '../components/ui';
import { Icon } from '../components/Icon';

const LEVELS: NotificationLevel[] = ['INFO', 'SUCCESS', 'WARNING', 'ERROR'];

const LEVEL_TONE: Record<NotificationLevel, 'info' | 'success' | 'warning' | 'danger'> = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'danger',
};

type StreamStatus = 'connecting' | 'live' | 'reconnecting';

export default function Notifications() {
  const { data: history, loading, error, reload } = useApi(notificationsApi.list);
  const [live, setLive] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<NotificationItem | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();


  useEffect(() => {
    const source = new EventSource(NOTIFICATION_STREAM_URL);

    source.onopen = () => setStatus('live');
    source.onerror = () => setStatus('reconnecting');

    const onNotification = (event: Event) => {
      const { data } = event as MessageEvent<string>;
      setStatus('live');
      setLastEventAt(new Date().toISOString());

      try {
        const item = JSON.parse(data) as NotificationItem;
        setLive((previous) =>
          previous.some((entry) => entry.notificationId === item.notificationId)
            ? previous
            : [item, ...previous],
        );
      } catch {
        
      }
    };

    source.addEventListener('notification', onNotification);
    return () => {
      source.removeEventListener('notification', onNotification);
      source.close();
    };
  }, []);

  // History is fetched once; live frames are newer, so they come first.
  // Deleted ids are filtered until the reloaded history catches up.
  const items = useMemo(() => {
    const seen = new Set<number>();
    const merged: NotificationItem[] = [];

    for (const item of [...live, ...(history ?? [])]) {
      if (deletedIds.includes(item.notificationId)) {
        continue;
      }
      if (!seen.has(item.notificationId)) {
        seen.add(item.notificationId);
        merged.push(item);
      }
    }

    return merged;
  }, [live, history, deletedIds]);

  const deleteNotification = async () => {
    if (!deleting) {
      return;
    }
    setDeletingBusy(true);
    setActionError(null);
    try {
      await notificationsApi.remove(deleting.notificationId);
      const deletedId = deleting.notificationId;
      setDeletedIds((previous) => [...previous, deletedId]);
      setLive((previous) => previous.filter((entry) => entry.notificationId !== deletedId));
      setFlash(`Notification #${deletedId} deleted.`);
      setDeleting(null);
      reload();
    } catch (caught) {
      setActionError(errorMessage(caught));
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  const connectionLabel =
    status === 'live' ? 'Stream connected' : status === 'reconnecting' ? 'Reconnecting…' : 'Connecting…';

  return (
    <div className="page">
      <PageHeader
        title="Notifications"
        subtitle="Server-sent events from the notification microservice, proxied by nginx."
        actions={
          <>
            <Button variant="secondary" onClick={reload} disabled={loading}>
              <Icon name="refresh" size={16} /> Refresh history
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Icon name="plus" size={16} /> Send test
            </Button>
          </>
        }
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {actionError && <Notice tone="danger">{actionError}</Notice>}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <div className="cache-strip">
        <div className="cache-strip-text">
          <span
            className={`status-dot ${
              status === 'live' ? 'online' : status === 'reconnecting' ? 'offline' : ''
            }`}
          />
          <div>
            <strong>{connectionLabel}</strong>
            <small>
              GET {NOTIFICATION_STREAM_URL}
              {lastEventAt ? ` · last event ${formatDate(lastEventAt)}` : ''}
            </small>
          </div>
        </div>
        <div className="cache-strip-actions">
          <Badge tone="neutral">
            {items.length} event{items.length === 1 ? '' : 's'}
          </Badge>
        </div>
      </div>

      <div className="info-strip">
        <Badge tone="info">SSE</Badge>
        <span>
          History comes from <code>GET /api/notification/</code>. New frames arrive on the open
          stream and are deduplicated by <code>notificationId</code>.
        </span>
      </div>

      {loading && !history ? (
        <Spinner label="Loading notification history…" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          message="Create an order — the backend notifies the microservice after the order commits."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Icon name="plus" size={16} /> Send test notification
            </Button>
          }
        />
      ) : (
        <div className="notification-feed">
          {items.map((item) => (
            <article className="notification-item" key={item.notificationId}>
              <span className={`notification-dot level-${item.notificationLevel.toLowerCase()}`} />
              <div className="notification-body">
                <div className="notification-top">
                  <span className="notification-type">
                    {item.notificationType.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  <Badge tone={LEVEL_TONE[item.notificationLevel] ?? 'neutral'}>
                    {item.notificationLevel}
                  </Badge>
                  <span className="notification-time">{formatDate(item.createdOn)}</span>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => setDeleting(item)}
                    title="Delete notification"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
                <p className="notification-message">{item.message}</p>
                <div className="notification-meta">
                  <span>#{item.notificationId}</span>
                  {item.entityId > 0 && (
                    <span>
                      {item.notificationType.startsWith('ORDER_') ? 'order' : 'entity'} #
                      {item.entityId}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <TestNotificationForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSent={(message) => {
          setFormOpen(false);
          setFlash(message);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete notification"
        message={`Delete notification #${deleting?.notificationId ?? ''}? This cannot be undone.`}
        busy={deletingBusy}
        onClose={() => setDeleting(null)}
        onConfirm={deleteNotification}
      />
    </div>
  );
}

function TestNotificationForm({
  open,
  onClose,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState<NotificationLevel>('INFO');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setMessage('');
    setLevel('INFO');
    setFormError(null);
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!message.trim()) {
      setFormError('Message is required.');
      return;
    }

    setSending(true);
    try {
      const created = await notificationsApi.create({
        message: message.trim(),
        notificationType: 'GENERAL',
        notificationLevel: level,
      });
      onSent(`Notification #${created.notificationId} published to the stream.`);
    } catch (caught) {
      setFormError(errorMessage(caught));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Send test notification"
      subtitle="POST /api/notification through nginx; it should appear on the stream immediately."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button type="submit" form="notification-form" loading={sending}>
            Publish
          </Button>
        </>
      }
    >
      <form id="notification-form" className="form" onSubmit={submit}>
        {formError && <Notice tone="danger">{formError}</Notice>}

        <Field
          label="Message"
          htmlFor="notification-message"
          hint="Saved first, then broadcast to every connected client."
        >
          <TextArea
            id="notification-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="e.g. Maintenance starts in 10 minutes"
            rows={3}
            maxLength={500}
            autoFocus
          />
        </Field>

        <Field label="Level" htmlFor="notification-level">
          <Select
            id="notification-level"
            value={level}
            onChange={(event) => setLevel(event.target.value as NotificationLevel)}
          >
            {LEVELS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
