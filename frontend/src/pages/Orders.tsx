import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, customersApi, errorMessage, ordersApi } from '../api';
import type { Order, OrderRequest, OrderStatus } from '../types';
import { formatDate, formatMoney } from '../components/format';
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
  Select,
  Spinner,
  TextInput,
} from '../components/ui';
import { Icon } from '../components/Icon';

const STATUSES: OrderStatus[] = ['CREATED', 'PAID', 'SHIPPED', 'CANCELLED'];

export default function Orders() {
  const [customerFilter, setCustomerFilter] = useState('');
  const { data: orders, loading, error, reload } = useApi(
    () => ordersApi.list(customerFilter ? Number(customerFilter) : undefined),
    [customerFilter],
  );
  const { data: customers } = useApi(customersApi.list);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (order: Order) => {
    setEditing(order);
    setFormOpen(true);
  };

  const changeStatus = async (order: Order, status: OrderStatus) => {
    setStatusBusyId(order.id);
    setActionError(null);
    try {
      await ordersApi.updateStatus(order.id, status);
      setFlash(`Order ${order.orderNumber} moved to ${status}.`);
      reload();
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setStatusBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) {
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await ordersApi.remove(deleting.id);
      setFlash(`Order ${deleting.orderNumber} deleted.`);
      setDeleting(null);
      reload();
    } catch (caught) {
      setActionError(errorMessage(caught));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const filterLabel =
    customerFilter && customers
      ? ` for ${customers.find((customer) => String(customer.id) === customerFilter)?.name ?? 'customer'}`
      : '';

  return (
    <div className="page">
      <PageHeader
        title="Orders"
        subtitle={`MySQL orders linked to customers. Totals are computed by the API${filterLabel}.`}
        actions={
          <>
            <Button variant="secondary" onClick={reload} disabled={loading}>
              <Icon name="refresh" size={16} /> Refresh
            </Button>
            <Button onClick={openCreate} disabled={!customers || customers.length === 0}>
              <Icon name="plus" size={16} /> New order
            </Button>
          </>
        }
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {actionError && <Notice tone="danger">{actionError}</Notice>}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      {customers && customers.length === 0 && (
        <Notice tone="info">Create a customer first — every order belongs to one.</Notice>
      )}

      <div className="toolbar card">
        <div className="toolbar-group">
          <label htmlFor="customer-filter">Filter by customer</label>
          <Select
            id="customer-filter"
            value={customerFilter}
            onChange={(event) => setCustomerFilter(event.target.value)}
          >
            <option value="">All customers</option>
            {customers?.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </Select>
        </div>
        <span className="toolbar-meta">
          {orders ? `${orders.length} order${orders.length === 1 ? '' : 's'}` : '—'}
        </span>
      </div>

      {loading && !orders ? (
        <Spinner label="Loading orders…" />
      ) : orders && orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          message={
            customerFilter
              ? 'This customer has no orders yet. Try clearing the filter.'
              : 'Create an order to see server-side totals and status changes.'
          }
          action={
            customers && customers.length > 0 ? (
              <Button onClick={openCreate}>
                <Icon name="plus" size={16} /> New order
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Item</th>
                <th className="num">Qty</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th>Created</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((order) => (
                <tr key={order.id}>
                  <td>
                    <div className="cell-title mono">{order.orderNumber}</div>
                    <div className="cell-sub">#{order.id}</div>
                  </td>
                  <td>{order.customerName}</td>
                  <td>
                    <div className="cell-title">{order.productName}</div>
                    <div className="cell-sub">{formatMoney(order.unitPrice)} each</div>
                  </td>
                  <td className="num">{order.quantity}</td>
                  <td className="num strong">{formatMoney(order.totalPrice)}</td>
                  <td>
                    <select
                      className={`status-select status-${order.status.toLowerCase()}`}
                      value={order.status}
                      disabled={statusBusyId === order.id}
                      onChange={(event) => changeStatus(order, event.target.value as OrderStatus)}
                      title="Change order status"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="muted">{formatDate(order.createdAt)}</td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => openEdit(order)}
                        title="Edit order"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => setDeleting(order)}
                        title="Delete order"
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

      <OrderForm
        open={formOpen}
        order={editing}
        customers={customers ?? []}
        onClose={() => setFormOpen(false)}
        onSaved={(message) => {
          setFormOpen(false);
          setFlash(message);
          reload();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete order"
        message={`Delete order ${deleting?.orderNumber ?? ''}? This cannot be undone.`}
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function OrderForm({
  open,
  order,
  customers,
  onClose,
  onSaved,
}: {
  open: boolean;
  order: Order | null;
  customers: Array<{ id: number; name: string }>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [customerId, setCustomerId] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setCustomerId(order ? String(order.customerId) : customers[0] ? String(customers[0].id) : '');
    setProductName(order?.productName ?? '');
    setQuantity(order ? String(order.quantity) : '1');
    setUnitPrice(order ? String(order.unitPrice) : '');
    setFormError(null);
  }, [open, order, customers]);

  const quantityValue = Number(quantity);
  const priceValue = Number(unitPrice);
  const preview =
    Number.isFinite(quantityValue) && Number.isFinite(priceValue) && quantityValue > 0 && priceValue > 0
      ? quantityValue * priceValue
      : 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!customerId) {
      setFormError('Choose a customer.');
      return;
    }
    if (!productName.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (!Number.isInteger(quantityValue) || quantityValue < 1) {
      setFormError('Quantity must be a whole number of at least 1.');
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setFormError('Unit price must be greater than zero.');
      return;
    }

    const body: OrderRequest = {
      customerId: Number(customerId),
      productName: productName.trim(),
      quantity: quantityValue,
      unitPrice: priceValue,
    };

    setSaving(true);
    try {
      if (order) {
        await ordersApi.update(order.id, body);
        onSaved(`Order ${order.orderNumber} updated.`);
      } else {
        const created = await ordersApi.create(body);
        onSaved(`Order ${created.orderNumber} created with total ${formatMoney(created.totalPrice)}.`);
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
      title={order ? 'Edit order' : 'New order'}
      subtitle={
        order ? `Editing ${order.orderNumber}` : 'The total is calculated by the server, not the browser.'
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="order-form" loading={saving}>
            {order ? 'Save changes' : 'Create order'}
          </Button>
        </>
      }
    >
      <form id="order-form" className="form" onSubmit={submit}>
        {formError && <Notice tone="danger">{formError}</Notice>}

        <Field label="Customer" htmlFor="order-customer">
          <Select
            id="order-customer"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          >
            <option value="">Select a customer…</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} (#{customer.id})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Product name" htmlFor="order-product">
          <TextInput
            id="order-product"
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            placeholder="e.g. Mechanical Keyboard"
            maxLength={120}
          />
        </Field>

        <div className="form-row">
          <Field label="Quantity" htmlFor="order-quantity">
            <TextInput
              id="order-quantity"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </Field>

          <Field label="Unit price (USD)" htmlFor="order-price">
            <TextInput
              id="order-price"
              type="number"
              min="0.01"
              step="0.01"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              placeholder="0.00"
            />
          </Field>
        </div>

        <div className="total-preview">
          <span>Server-calculated total</span>
          <strong>{formatMoney(preview)}</strong>
        </div>
      </form>
    </Modal>
  );
}
