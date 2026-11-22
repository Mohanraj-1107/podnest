import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, customersApi, errorMessage } from '../api';
import type { Customer, CustomerRequest } from '../types';
import { formatDate } from '../components/format';
import { useApi, useFlash } from '../hooks';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Field,
  Modal,
  Notice,
  PageHeader,
  Spinner,
  TextInput,
} from '../components/ui';
import { Icon } from '../components/Icon';

export default function Customers() {
  const { data: customers, loading, error, reload } = useApi(customersApi.list);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) {
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await customersApi.remove(deleting.id);
      setFlash(`Customer “${deleting.name}” deleted.`);
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
        title="Customers"
        subtitle="Relational CRUD in MySQL. Emails are unique and validated."
        actions={
          <>
            <Button variant="secondary" onClick={reload} disabled={loading}>
              <Icon name="refresh" size={16} /> Refresh
            </Button>
            <Button onClick={openCreate}>
              <Icon name="plus" size={16} /> New customer
            </Button>
          </>
        }
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {actionError && <Notice tone="danger">{actionError}</Notice>}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      {loading && !customers ? (
        <Spinner label="Loading customers…" />
      ) : customers && customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          message="Add a customer before creating orders."
          action={
            <Button onClick={openCreate}>
              <Icon name="plus" size={16} /> New customer
            </Button>
          }
        />
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th className="col-id">ID</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Created</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers?.map((customer) => (
                <tr key={customer.id}>
                  <td className="col-id muted">#{customer.id}</td>
                  <td>
                    <div className="cell-title">{customer.name}</div>
                    <div className="cell-sub">{customer.email}</div>
                  </td>
                  <td>{customer.phone || <span className="muted">—</span>}</td>
                  <td className="muted">{formatDate(customer.createdAt)}</td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => openEdit(customer)}
                        title="Edit customer"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => setDeleting(customer)}
                        title="Delete customer"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CustomerForm
        open={formOpen}
        customer={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(message) => {
          setFormOpen(false);
          setFlash(message);
          reload();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete customer"
        message={`Delete “${deleting?.name ?? ''}”? Customers that still have orders cannot be deleted.`}
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function CustomerForm({
  open,
  customer,
  onClose,
  onSaved,
}: {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(customer?.name ?? '');
    setEmail(customer?.email ?? '');
    setPhone(customer?.phone ?? '');
    setFormError(null);
  }, [open, customer]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Enter a valid email address.');
      return;
    }

    const body: CustomerRequest = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
    };

    setSaving(true);
    try {
      if (customer) {
        await customersApi.update(customer.id, body);
        onSaved(`Customer “${body.name}” updated.`);
      } else {
        await customersApi.create(body);
        onSaved(`Customer “${body.name}” created.`);
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
      title={customer ? 'Edit customer' : 'New customer'}
      subtitle={customer ? `Editing #${customer.id}` : 'Stored in the MySQL customers table.'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form" loading={saving}>
            {customer ? 'Save changes' : 'Create customer'}
          </Button>
        </>
      }
    >
      <form id="customer-form" className="form" onSubmit={submit}>
        {formError && <Notice tone="danger">{formError}</Notice>}

        <Field label="Full name" htmlFor="customer-name">
          <TextInput
            id="customer-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Dana Lee"
            maxLength={120}
            autoFocus
          />
        </Field>

        <Field label="Email" htmlFor="customer-email" hint="Must be unique across customers.">
          <TextInput
            id="customer-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="dana@example.com"
            maxLength={180}
          />
        </Field>

        <Field label="Phone" htmlFor="customer-phone" hint="Optional.">
          <TextInput
            id="customer-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+1-555-0100"
            maxLength={30}
          />
        </Field>
      </form>
    </Modal>
  );
}
