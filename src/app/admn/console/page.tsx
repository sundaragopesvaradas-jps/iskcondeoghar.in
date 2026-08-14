'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import '../admn.css';

type Role = 'read' | 'write';
type TabInfo = { id: string; name: string; rowCount?: number; columns?: string[] };
type TableInfo = { id: string; name: string; tabs: TabInfo[] };
type RowDoc = { id: string; data: Record<string, string> };

export default function AdmnConsolePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: Role } | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [tableId, setTableId] = useState('');
  const [tabId, setTabId] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<RowDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [newTableName, setNewTableName] = useState('');
  const [newTabName, setNewTabName] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'read' as Role });
  const [status, setStatus] = useState('');

  const canWrite = user?.role === 'write';

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === tableId) || null,
    [tables, tableId]
  );

  const loadTables = useCallback(async () => {
    const res = await fetch('/api/admn/tables');
    const data = await res.json();
    if (res.status === 401) {
      router.replace('/admn/login');
      return;
    }
    if (!res.ok) throw new Error(data.message || 'Failed to load tables');
    setUser(data.user);
    setTables(data.tables || []);
    if (!tableId && data.tables?.[0]) {
      setTableId(data.tables[0].id);
      setTabId(data.tables[0].tabs?.[0]?.id || '');
    }
  }, [router, tableId]);

  const loadRows = useCallback(async () => {
    if (!tableId || !tabId) {
      setRows([]);
      setTotal(0);
      return;
    }
    const res = await fetch(
      `/api/admn/tables/${encodeURIComponent(tableId)}/tabs/${encodeURIComponent(tabId)}/rows?offset=${offset}&limit=${limit}`
    );
    const data = await res.json();
    if (res.status === 401) {
      router.replace('/admn/login');
      return;
    }
    if (!res.ok) throw new Error(data.message || 'Failed to load rows');
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setColumns(data.columns || []);
  }, [tableId, tabId, offset, limit, router]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        await loadTables();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadTables]);

  useEffect(() => {
    (async () => {
      setError('');
      try {
        await loadRows();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
      }
    })();
  }, [loadRows]);

  const logout = async () => {
    await fetch('/api/admn/logout', { method: 'POST' });
    router.replace('/admn/login');
  };

  const saveCell = async (row: RowDoc, col: string, value: string) => {
    if (!canWrite) return;
    const nextData = { ...row.data, [col]: value };
    const res = await fetch(
      `/api/admn/tables/${encodeURIComponent(tableId)}/tabs/${encodeURIComponent(tabId)}/rows`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, data: nextData }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || 'Save failed');
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, data: nextData } : r)));
    setStatus('Saved');
  };

  const addRow = async () => {
    if (!canWrite || !tableId || !tabId) return;
    const empty: Record<string, string> = {};
    for (const c of columns) empty[c] = '';
    const res = await fetch(
      `/api/admn/tables/${encodeURIComponent(tableId)}/tabs/${encodeURIComponent(tabId)}/rows`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: empty }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || 'Add row failed');
      return;
    }
    await loadRows();
    setStatus('Row added');
  };

  const createTable = async () => {
    if (!canWrite || !newTableName.trim()) return;
    const res = await fetch('/api/admn/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTableName.trim(), id: newTableName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || 'Create table failed');
      return;
    }
    setNewTableName('');
    await loadTables();
    setStatus('Table created');
  };

  const createTab = async () => {
    if (!canWrite || !tableId || !newTabName.trim()) return;
    const res = await fetch(`/api/admn/tables/${encodeURIComponent(tableId)}/tabs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTabName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || 'Create tab failed');
      return;
    }
    setNewTabName('');
    await loadTables();
    setTabId(newTabName.trim());
    setStatus('Tab created');
  };

  const createUser = async () => {
    if (!canWrite) return;
    const res = await fetch('/api/admn/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || 'Create user failed');
      return;
    }
    setNewUser({ username: '', password: '', role: 'read' });
    setStatus(`User created: ${data.user.username} (${data.user.role})`);
  };

  const pageCount = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;

  return (
    <div className="admn-console">
      <header className="admn-console__header">
        <div>
          <h1>Data console</h1>
          <p>
            {user ? (
              <>
                Signed in as <strong>{user.username}</strong> · access{' '}
                <strong>{user.role}</strong>
              </>
            ) : (
              'Loading…'
            )}
          </p>
        </div>
        <button type="button" className="admn-btn admn-btn--ghost" onClick={logout}>
          Sign out
        </button>
      </header>

      {error ? (
        <p className="admn-error" role="alert">
          {error}
        </p>
      ) : null}
      {status ? <p className="admn-status">{status}</p> : null}

      {loading ? <p>Loading tables…</p> : null}

      <section className="admn-toolbar" aria-label="Table and tab picker">
        <label>
          Table
          <select
            value={tableId}
            onChange={(e) => {
              const id = e.target.value;
              setTableId(id);
              const t = tables.find((x) => x.id === id);
              setTabId(t?.tabs?.[0]?.id || '');
              setOffset(0);
            }}
          >
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tab
          <select
            value={tabId}
            onChange={(e) => {
              setTabId(e.target.value);
              setOffset(0);
            }}
          >
            {(selectedTable?.tabs || []).map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.name}
              </option>
            ))}
          </select>
        </label>
        <div className="admn-pager">
          <button
            type="button"
            className="admn-btn admn-btn--ghost"
            disabled={offset <= 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            Prev
          </button>
          <span>
            Page {page}/{pageCount} · {total} rows
          </span>
          <button
            type="button"
            className="admn-btn admn-btn--ghost"
            disabled={offset + limit >= total}
            onClick={() => setOffset(offset + limit)}
          >
            Next
          </button>
        </div>
        {canWrite ? (
          <button type="button" className="admn-btn" onClick={addRow}>
            Add row
          </button>
        ) : null}
      </section>

      <div className="admn-grid-wrap" role="region" aria-label="Data grid">
        <table className="admn-grid">
          <thead>
            <tr>
              <th scope="col">#</th>
              {columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id}>
                <td>{offset + idx + 1}</td>
                {columns.map((col) => (
                  <td key={col}>
                    {canWrite ? (
                      <input
                        className="admn-cell"
                        defaultValue={row.data?.[col] || ''}
                        aria-label={`${col} row ${offset + idx + 1}`}
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v !== (row.data?.[col] || '')) {
                            void saveCell(row, col, v);
                          }
                        }}
                      />
                    ) : (
                      <span>{row.data?.[col] || ''}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1}>No rows in this tab.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {canWrite ? (
        <section className="admn-admin-panels" aria-label="Write actions">
          <div className="admn-panel">
            <h2>Create table</h2>
            <div className="admn-inline">
              <input
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="table name"
              />
              <button type="button" className="admn-btn" onClick={createTable}>
                Create
              </button>
            </div>
          </div>
          <div className="admn-panel">
            <h2>Create tab in current table</h2>
            <div className="admn-inline">
              <input
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder="tab name"
              />
              <button type="button" className="admn-btn" onClick={createTab}>
                Create
              </button>
            </div>
          </div>
          <div className="admn-panel">
            <h2>Create admin user</h2>
            <div className="admn-inline">
              <input
                value={newUser.username}
                onChange={(e) => setNewUser((u) => ({ ...u, username: e.target.value }))}
                placeholder="username"
              />
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                placeholder="password (min 8)"
              />
              <select
                value={newUser.role}
                onChange={(e) =>
                  setNewUser((u) => ({ ...u, role: e.target.value as Role }))
                }
                aria-label="Role"
              >
                <option value="read">read</option>
                <option value="write">write</option>
              </select>
              <button type="button" className="admn-btn" onClick={createUser}>
                Create user
              </button>
            </div>
          </div>
        </section>
      ) : (
        <p className="admn-note">Your account is read-only. Ask a write admin to grant edit access.</p>
      )}
    </div>
  );
}
