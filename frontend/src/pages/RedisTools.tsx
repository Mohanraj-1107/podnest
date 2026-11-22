import { useEffect, useState } from 'react';
import { errorMessage, redisApi } from '../api';
import type { Counter } from '../types';
import { formatDuration } from '../components/format';
import { useApi, useFlash } from '../hooks';
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Notice,
  PageHeader,
  Spinner,
  TextInput,
} from '../components/ui';
import { Icon } from '../components/Icon';

const COUNTER_NAME = /^[A-Za-z0-9_-]{1,40}$/;

export default function RedisTools() {
  const info = useApi(redisApi.info);
  const keys = useApi(() => redisApi.keys('demo:*'));
  const [counterName, setCounterName] = useState('page-views');
  const [counter, setCounter] = useState<Counter | null>(null);
  const [counterBusy, setCounterBusy] = useState(false);
  const [counterMessage, setCounterMessage] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      redisApi
        .getCounter(counterName)
        .then((value) => active && setCounter(value))
        .catch(() => active && setCounter(null));
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [counterName]);

  const refreshAll = () => {
    info.reload();
    keys.reload();
  };

  const clearCache = async () => {
    try {
      const result = await redisApi.clearProductCache();
      setFlash(`Product cache cleared (${result.deletedKeys} key(s) deleted).`);
      keys.reload();
    } catch (caught) {
      setCounterMessage(errorMessage(caught));
    }
  };

  const runCounter = async (operation: 'increment1' | 'increment5' | 'read' | 'delete') => {
    if (!COUNTER_NAME.test(counterName)) {
      setCounterMessage('Name must be 1–40 characters: letters, digits, “_” or “-”.');
      return;
    }

    setCounterBusy(true);
    setCounterMessage(null);
    try {
      if (operation === 'delete') {
        const result = await redisApi.deleteCounter(counterName);
        setCounter({ name: counterName, value: 0 });
        setCounterMessage(result.deleted ? 'Counter deleted from Redis.' : 'Counter did not exist.');
      } else if (operation === 'read') {
        const value = await redisApi.getCounter(counterName);
        setCounter(value);
        setCounterMessage('Counter read from Redis.');
      } else {
        const step = operation === 'increment5' ? 5 : 1;
        const value = await redisApi.incrementCounter(counterName, step);
        setCounter(value);
        setCounterMessage(`Incremented by ${step}.`);
      }
      keys.reload();
    } catch (caught) {
      setCounterMessage(errorMessage(caught));
    } finally {
      setCounterBusy(false);
    }
  };

  const liveValue = counter && counter.name === counterName ? counter.value : 0;

  return (
    <div className="page">
      <PageHeader
        title="Redis tools"
        subtitle="Inspect the cache keys, clear cached products and exercise atomic counters."
        actions={
          <Button variant="secondary" onClick={refreshAll}>
            <Icon name="refresh" size={16} /> Refresh
          </Button>
        }
      />

      {flash && <Notice tone="success">{flash}</Notice>}

      {info.error && <ErrorBanner message={info.error} onRetry={info.reload} />}

      {info.loading && !info.data ? (
        <Spinner label="Connecting to Redis…" />
      ) : (
        <div className="stat-grid stat-grid-4">
          <div className="card stat-card">
            <span className="stat-label">Connection</span>
            <div className="stat-value">
              {info.data ? <Badge tone="success" dot>{info.data.status}</Badge> : <Badge tone="danger">DOWN</Badge>}
            </div>
            <span className="stat-foot">Lettuce · localhost</span>
          </div>
          <div className="card stat-card">
            <span className="stat-label">Redis version</span>
            <div className="stat-value">{info.data?.redisVersion ?? '—'}</div>
            <span className="stat-foot">server version</span>
          </div>
          <div className="card stat-card">
            <span className="stat-label">Keys in database</span>
            <div className="stat-value">{info.data?.databaseSize ?? '—'}</div>
            <span className="stat-foot">includes non-demo keys</span>
          </div>
          <div className="card stat-card">
            <span className="stat-label">Uptime</span>
            <div className="stat-value">{info.data ? formatDuration(info.data.uptimeSeconds) : '—'}</div>
            <span className="stat-foot">since last restart</span>
          </div>
        </div>
      )}

      <div className="two-column">
        <section className="card panel">
          <div className="panel-header">
            <div>
              <h2>Demo keyspace</h2>
              <p>Every key used by this app starts with <code>demo:</code>.</p>
            </div>
            <div className="panel-actions">
              <Button variant="ghost" size="sm" onClick={keys.reload}>
                <Icon name="refresh" size={15} /> Reload
              </Button>
              <Button variant="danger" size="sm" onClick={clearCache}>
                Clear product cache
              </Button>
            </div>
          </div>

          {keys.error && <ErrorBanner message={keys.error} onRetry={keys.reload} />}

          {keys.loading && !keys.data ? (
            <Spinner label="Reading keys…" />
          ) : keys.data && keys.data.length === 0 ? (
            <EmptyState
              title="No demo keys"
              message="Read a product list, save a note or increment a counter to create keys."
            />
          ) : (
            <ul className="key-list">
              {keys.data?.map((key) => (
                <li key={key}>
                  <code>{key}</code>
                  <Badge tone={key.startsWith('demo:product') ? 'info' : 'neutral'}>
                    {key.startsWith('demo:counter')
                      ? 'counter'
                      : key.startsWith('demo:product')
                        ? 'cache'
                        : 'data'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card panel">
          <div className="panel-header">
            <div>
              <h2>Atomic counter</h2>
              <p>Backed by Redis <code>INCRBY</code>. Try incrementing twice.</p>
            </div>
          </div>

          <Field label="Counter name" htmlFor="counter-name">
            <TextInput
              id="counter-name"
              value={counterName}
              onChange={(event) => {
                setCounterName(event.target.value);
                setCounterMessage(null);
              }}
              placeholder="page-views"
              maxLength={40}
            />
          </Field>

          <div className="counter-display">
            <span>Current value</span>
            <strong>{counterBusy ? '…' : liveValue}</strong>
            <code>demo:counter:{counterName || '…'}</code>
          </div>

          <div className="counter-actions">
            <Button size="sm" onClick={() => runCounter('increment1')} disabled={counterBusy}>
              +1
            </Button>
            <Button size="sm" onClick={() => runCounter('increment5')} disabled={counterBusy}>
              +5
            </Button>
            <Button variant="secondary" size="sm" onClick={() => runCounter('read')} disabled={counterBusy}>
              Read
            </Button>
            <Button variant="danger" size="sm" onClick={() => runCounter('delete')} disabled={counterBusy}>
              Delete
            </Button>
          </div>

          {counterMessage && <Notice tone="info">{counterMessage}</Notice>}
        </section>
      </div>
    </div>
  );
}
