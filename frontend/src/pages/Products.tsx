import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, errorMessage, productsApi, redisApi } from '../api';
import type { Product, ProductRequest } from '../types';
import { formatDate, formatMoney } from '../components/format';
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

const CACHE_KEY = 'demo:products:all';

export default function Products() {
  const { data: products, loading, error, reload } = useApi(productsApi.list);
  const [cacheKeys, setCacheKeys] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();

  useEffect(() => {
    redisApi
      .keys('demo:product*')
      .then(setCacheKeys)
      .catch(() => setCacheKeys([]));
  }, [products]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const clearCache = async () => {
    setActionError(null);
    try {
      const result = await redisApi.clearProductCache();
      setFlash(`Redis cache cleared (${result.deletedKeys} key(s) deleted).`);
      setCacheKeys(await redisApi.keys('demo:product*').catch(() => []));
    } catch (caught) {
      setActionError(errorMessage(caught));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) {
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await productsApi.remove(deleting.id);
      setFlash(`Product “${deleting.name}” deleted.`);
      setDeleting(null);
      reload();
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const cached = cacheKeys.includes(CACHE_KEY);

  return (
    <div className="page">
      <PageHeader
        title="Products"
        subtitle="Stored in MySQL, read through a Redis cache with a 60 second TTL."
        actions={
          <>
            <Button variant="secondary" onClick={reload} disabled={loading}>
              <Icon name="refresh" size={16} /> Refresh
            </Button>
            <Button onClick={openCreate}>
              <Icon name="plus" size={16} /> New product
            </Button>
          </>
        }
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {actionError && <Notice tone="danger">{actionError}</Notice>}

      <div className="cache-strip">
        <div className="cache-strip-text">
          <span className={`status-dot ${cached ? 'online' : 'offline'}`} />
          <div>
            <strong>{cached ? 'Cache is warm' : 'Cache is empty'}</strong>
            <small>
              {cached
                ? `Redis key ${CACHE_KEY} is serving this list.`
                : 'The next read will load products from MySQL and cache them.'}
            </small>
          </div>
        </div>
        <div className="cache-strip-actions">
          <Badge tone={cached ? 'success' : 'neutral'}>
            {cacheKeys.length} demo:product* key(s)
          </Badge>
          <Button variant="ghost" size="sm" onClick={clearCache}>
            Clear cache
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} />}

      {loading && !products ? (
        <Spinner label="Loading products…" />
      ) : products && products.length === 0 ? (
        <EmptyState
          title="No products yet"
          message="Create your first product to see MySQL and Redis working together."
          action={
            <Button onClick={openCreate}>
              <Icon name="plus" size={16} /> New product
            </Button>
          }
        />
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th className="col-id">ID</th>
                <th>Product</th>
                <th className="num">Price</th>
                <th>Stock</th>
                <th>Updated</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products?.map((product) => (
                <tr key={product.id}>
                  <td className="col-id muted">#{product.id}</td>
                  <td>
                    <div className="cell-title">{product.name}</div>
                    <div className="cell-sub">{product.description || 'No description'}</div>
                  </td>
                  <td className="num strong">{formatMoney(product.price)}</td>
                  <td>
                    {product.stock === 0 ? (
                      <Badge tone="danger">Out of stock</Badge>
                    ) : product.stock < 10 ? (
                      <Badge tone="warning">{product.stock} left</Badge>
                    ) : (
                      <span>{product.stock} units</span>
                    )}
                  </td>
                  <td className="muted">{formatDate(product.updatedAt)}</td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => openEdit(product)}
                        title="Edit product"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => setDeleting(product)}
                        title="Delete product"
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

      <ProductForm
        open={formOpen}
        product={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(message) => {
          setFormOpen(false);
          setFlash(message);
          reload();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete product"
        message={`Delete “${deleting?.name ?? ''}”? This also evicts the product cache entries.`}
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function ProductForm({
  open,
  product,
  onClose,
  onSaved,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(product?.name ?? '');
    setDescription(product?.description ?? '');
    setPrice(product ? String(product.price) : '');
    setStock(product ? String(product.stock) : '0');
    setFormError(null);
  }, [open, product]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }
    const priceValue = Number(price);
    if (price === '' || !Number.isFinite(priceValue) || priceValue < 0) {
      setFormError('Price must be zero or a positive number.');
      return;
    }
    const stockValue = Number(stock);
    if (!Number.isInteger(stockValue) || stockValue < 0) {
      setFormError('Stock must be a whole number, zero or greater.');
      return;
    }

    const body: ProductRequest = {
      name: name.trim(),
      description: description.trim() || null,
      price: priceValue,
      stock: stockValue,
    };

    setSaving(true);
    try {
      if (product) {
        await productsApi.update(product.id, body);
        onSaved(`Product “${body.name}” updated.`);
      } else {
        await productsApi.create(body);
        onSaved(`Product “${body.name}” created.`);
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
      title={product ? 'Edit product' : 'New product'}
      subtitle={product ? `Editing #${product.id}` : 'Persisted in MySQL, then cached in Redis.'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={saving}>
            {product ? 'Save changes' : 'Create product'}
          </Button>
        </>
      }
    >
      <form id="product-form" className="form" onSubmit={submit}>
        {formError && <Notice tone="danger">{formError}</Notice>}

        <Field label="Name" htmlFor="product-name">
          <TextInput
            id="product-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Wireless Mouse"
            maxLength={120}
            autoFocus
          />
        </Field>

        <Field label="Description" htmlFor="product-description">
          <TextArea
            id="product-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional short description"
            rows={3}
            maxLength={500}
          />
        </Field>

        <div className="form-row">
          <Field label="Price (USD)" htmlFor="product-price">
            <TextInput
              id="product-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0.00"
            />
          </Field>

          <Field label="Stock" htmlFor="product-stock">
            <TextInput
              id="product-stock"
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(event) => setStock(event.target.value)}
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
