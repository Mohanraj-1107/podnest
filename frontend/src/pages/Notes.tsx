import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, errorMessage, notesApi } from '../api';
import type { Note, NoteRequest } from '../types';
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
  Spinner,
  TextArea,
  TextInput,
} from '../components/ui';
import { Icon } from '../components/Icon';

export default function Notes() {
  const { data: notes, loading, error, reload } = useApi(notesApi.list);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) {
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await notesApi.remove(deleting.id);
      setFlash(`Note “${deleting.title}” deleted from Redis.`);
      setDeleting(null);
      reload();
    } catch (caught) {
      setActionError(errorMessage(caught));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Notes"
        subtitle="Pure Redis persistence — these records never touch MySQL."
        actions={
          <>
            <Button variant="secondary" onClick={reload} disabled={loading}>
              <Icon name="refresh" size={16} /> Refresh
            </Button>
            <Button onClick={openCreate}>
              <Icon name="plus" size={16} /> New note
            </Button>
          </>
        }
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {actionError && <Notice tone="danger">{actionError}</Notice>}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <div className="info-strip">
        <Badge tone="info">Redis hash · demo:notes</Badge>
        <span>
          {notes ? `${notes.length} note${notes.length === 1 ? '' : 's'}` : '—'} stored as JSON
          fields keyed by UUID.
        </span>
      </div>

      {loading && !notes ? (
        <Spinner label="Loading notes from Redis…" />
      ) : notes && notes.length === 0 ? (
        <EmptyState
          title="No notes yet"
          message="Write a note — it is serialized to JSON and stored in Redis."
          action={
            <Button onClick={openCreate}>
              <Icon name="plus" size={16} /> New note
            </Button>
          }
        />
      ) : (
        <div className="note-grid">
          {notes?.map((note) => (
            <article className="card note-card" key={note.id}>
              <div className="note-card-top">
                <Badge tone="info">Redis</Badge>
                <div className="row-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => openEdit(note)}
                    title="Edit note"
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => setDeleting(note)}
                    title="Delete note"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>
              <h3>{note.title}</h3>
              <p className="note-content">{note.content || 'No content'}</p>
              <div className="note-meta">
                <span>Created {formatDate(note.createdAt)}</span>
                <span>Updated {formatDate(note.updatedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      <NoteForm
        open={formOpen}
        note={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(message) => {
          setFormOpen(false);
          setFlash(message);
          reload();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete note"
        message={`Delete “${deleting?.title ?? ''}” from Redis? This cannot be undone.`}
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function NoteForm({
  open,
  note,
  onClose,
  onSaved,
}: {
  open: boolean;
  note: Note | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
    setFormError(null);
  }, [open, note]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }

    const body: NoteRequest = {
      title: title.trim(),
      content: content.trim() || null,
    };

    setSaving(true);
    try {
      if (note) {
        await notesApi.update(note.id, body);
        onSaved(`Note “${body.title}” updated in Redis.`);
      } else {
        await notesApi.create(body);
        onSaved(`Note “${body.title}” saved to Redis.`);
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.details) {
        setFormError(Object.values(caught.details).join(' · '));
      } else {
        setFormError(errorMessage(caught));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={note ? 'Edit note' : 'New note'}
      subtitle={note ? `Redis field ${note.id}` : 'Saved directly into the demo:notes hash.'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="note-form" loading={saving}>
            {note ? 'Save changes' : 'Save note'}
          </Button>
        </>
      }
    >
      <form id="note-form" className="form" onSubmit={submit}>
        {formError && <Notice tone="danger">{formError}</Notice>}

        <Field label="Title" htmlFor="note-title">
          <TextInput
            id="note-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Shopping list"
            maxLength={120}
            autoFocus
          />
        </Field>

        <Field label="Content" htmlFor="note-content" hint="Optional. Up to 5000 characters.">
          <TextArea
            id="note-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write something…"
            rows={6}
            maxLength={5000}
          />
        </Field>
      </form>
    </Modal>
  );
}
