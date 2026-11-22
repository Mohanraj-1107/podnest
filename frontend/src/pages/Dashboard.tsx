import { customersApi, notesApi, ordersApi, productsApi, redisApi } from '../api';
import type { Customer, Note, Order, Product, RedisInfo } from '../types';
import { formatDuration, formatMoney } from '../components/format';
import { useApi, navigate } from '../hooks';
import { Badge, Button, ErrorBanner, PageHeader, Spinner } from '../components/ui';
import { Icon } from '../components/Icon';

interface Overview {
  products: Product[] | null;
  customers: Customer[] | null;
  orders: Order[] | null;
  notes: Note[] | null;
  redis: RedisInfo | null;
}

function pick<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null;
}

export default function Dashboard() {
  const { data, loading, reload } = useApi<Overview>(async () => {
    const [products, customers, orders, notes, redis] = await Promise.allSettled([
      productsApi.list(),
      customersApi.list(),
      ordersApi.list(),
      notesApi.list(),
      redisApi.info(),
    ]);

    return {
      products: pick(products),
      customers: pick(customers),
      orders: pick(orders),
      notes: pick(notes),
      redis: pick(redis),
    };
  });

  const unreachable =
    data !== null &&
    !data.products &&
    !data.customers &&
    !data.orders &&
    !data.notes &&
    !data.redis;

  const stats = [
    {
      label: 'Products',
      value: data?.products?.length,
      hint: 'MySQL + Redis cache',
      route: 'products',
      icon: 'products' as const,
    },
    {
      label: 'Customers',
      value: data?.customers?.length,
      hint: 'MySQL',
      route: 'customers',
      icon: 'customers' as const,
    },
    {
      label: 'Orders',
      value: data?.orders?.length,
      hint: 'MySQL',
      route: 'orders',
      icon: 'orders' as const,
    },
    {
      label: 'Notes',
      value: data?.notes?.length,
      hint: 'Redis only',
      route: 'notes',
      icon: 'notes' as const,
    },
  ];

  const latestOrders = data?.orders?.slice(0, 5) ?? [];

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        subtitle="A quick look at the demo data and which store backs each API."
        actions={
          <Button variant="secondary" onClick={reload} disabled={loading}>
            <Icon name="refresh" size={16} /> Refresh
          </Button>
        }
      />

      {unreachable && (
        <ErrorBanner
          message="Cannot reach the API. Start the Spring Boot app (default: http://localhost:8080)."
          onRetry={reload}
        />
      )}

      {loading && !data ? (
        <Spinner label="Gathering data from MySQL and Redis…" />
      ) : (
        <>
          <div className="stat-grid">
            {stats.map((stat) => (
              <button
                type="button"
                key={stat.label}
                className="card stat-card stat-card-link"
                onClick={() => navigate(stat.route)}
              >
                <span className="stat-icon">
                  <Icon name={stat.icon} size={18} />
                </span>
                <span className="stat-label">{stat.label}</span>
                <div className="stat-value">{stat.value ?? '—'}</div>
                <span className="stat-foot">{stat.hint}</span>
              </button>
            ))}
          </div>

          <div className="two-column">
            <section className="card panel">
              <div className="panel-header">
                <div>
                  <h2>How routing works</h2>
                  <p>Each API group uses a different combination of MySQL and Redis.</p>
                </div>
              </div>

              <ul className="flow-list">
                <li>
                  <span className="flow-dot mysql" />
                  <div>
                    <strong>Products</strong>
                    <span>MySQL table + Redis read cache, evicted on every write.</span>
                  </div>
                  <Badge tone="info">both</Badge>
                </li>
                <li>
                  <span className="flow-dot mysql" />
                  <div>
                    <strong>Customers & orders</strong>
                    <span>Hibernate entities, relations and constraints in MySQL.</span>
                  </div>
                  <Badge tone="neutral">MySQL</Badge>
                </li>
                <li>
                  <span className="flow-dot redis" />
                  <div>
                    <strong>Notes</strong>
                    <span>JSON documents in a Redis hash; no database tables.</span>
                  </div>
                  <Badge tone="warning">Redis</Badge>
                </li>
                <li>
                  <span className="flow-dot redis" />
                  <div>
                    <strong>Counters & cache tools</strong>
                    <span>Atomic increments and key inspection over Redis.</span>
                  </div>
                  <Badge tone="warning">Redis</Badge>
                </li>
              </ul>
            </section>

            <section className="card panel">
              <div className="panel-header">
                <div>
                  <h2>Redis status</h2>
                  <p>The cache is optional for products, required for notes.</p>
                </div>
                <Badge tone={data?.redis ? 'success' : 'danger'} dot>
                  {data?.redis ? 'ONLINE' : 'OFFLINE'}
                </Badge>
              </div>

              <dl className="detail-list">
                <div>
                  <dt>PING</dt>
                  <dd>{data?.redis?.status ?? 'unavailable'}</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{data?.redis?.redisVersion ?? '—'}</dd>
                </div>
                <div>
                  <dt>Keys</dt>
                  <dd>{data?.redis?.databaseSize ?? '—'}</dd>
                </div>
                <div>
                  <dt>Uptime</dt>
                  <dd>{data?.redis ? formatDuration(data.redis.uptimeSeconds) : '—'}</dd>
                </div>
              </dl>

              <div className="panel-actions stacked">
                <Button variant="secondary" onClick={() => navigate('redis')}>
                  Open Redis tools <Icon name="arrow" size={15} />
                </Button>
                <Button variant="ghost" onClick={() => navigate('products')}>
                  Inspect product cache
                </Button>
              </div>
            </section>
          </div>

          <section className="card table-card">
            <div className="panel-header table-panel-header">
              <div>
                <h2>Latest orders</h2>
                <p>Newest first, with server-calculated totals.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('orders')}>
                View all <Icon name="arrow" size={15} />
              </Button>
            </div>

            {latestOrders.length === 0 ? (
              <p className="panel-empty">No orders yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Item</th>
                    <th className="num">Qty</th>
                    <th className="num">Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {latestOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="mono">{order.orderNumber}</td>
                      <td>{order.customerName}</td>
                      <td>{order.productName}</td>
                      <td className="num">{order.quantity}</td>
                      <td className="num strong">{formatMoney(order.totalPrice)}</td>
                      <td>
                        <span className={`status-pill status-${order.status.toLowerCase()}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
