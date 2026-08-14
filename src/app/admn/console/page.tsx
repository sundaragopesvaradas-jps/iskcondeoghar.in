'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import '../admn.css';

type Role = 'read' | 'write';
type ColumnSchema = { name: string; allowedValues?: string[] };
type ColumnView = { name: string; allowedValues?: string[] };
type TabInfo = { id: string; name: string; rowCount?: number; columns?: string[] };
type TableInfo = {
  id: string;
  name: string;
  tabs: TabInfo[];
  columnSchemas?: ColumnSchema[];
  adminKey?: string;
};
type RowDoc = { id: string; data: Record<string, string> };

const PAGE_SIZES = [25, 50, 100, 200, 1000, 3000, 5000] as const;
const SADHANA_RESPONSES_TAB = 'Sadhana Responses';
const SADHANA_UNIQUE_NAMES_TAB = 'Sadhana Unique Names';

function deepCloneRows(rows: RowDoc[]): RowDoc[] {
  return rows.map((r) => ({ id: r.id, data: { ...(r.data || {}) } }));
}

export default function AdmnConsolePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: Role } | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [tableId, setTableId] = useState('');
  const [tabId, setTabId] = useState('');
  const [columnViews, setColumnViews] = useState<ColumnView[]>([]);
  const [rows, setRows] = useState<RowDoc[]>([]);
  const [baseline, setBaseline] = useState<RowDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(50);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTabName, setNewTabName] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'read' as Role });
  const [status, setStatus] = useState('');
  const [tabSearch, setTabSearch] = useState('');
  const [schemaCol, setSchemaCol] = useState('');
  const [schemaValueList, setSchemaValueList] = useState<string[]>([]);
  const [schemaEditIdx, setSchemaEditIdx] = useState(0);
  const [schemaAddValue, setSchemaAddValue] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [sortCol, setSortCol] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [adminKeyDraft, setAdminKeyDraft] = useState('');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [personNames, setPersonNames] = useState<string[]>([]);
  const [personFilter, setPersonFilter] = useState('');
  const [personSearch, setPersonSearch] = useState('');

  const canWrite = user?.role === 'write';
  const columns = useMemo(() => columnViews.map((c) => c.name), [columnViews]);

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === tableId) || null,
    [tables, tableId]
  );

  const filteredTabs = useMemo(() => {
    const tabs = selectedTable?.tabs || [];
    const q = tabSearch.trim().toLowerCase();
    if (!q) return tabs;
    return tabs.filter((t) => t.name.toLowerCase().includes(q));
  }, [selectedTable, tabSearch]);

  const dirtyUpdates = useMemo(() => {
    const baseMap = new Map(baseline.map((r) => [r.id, r]));
    const updates: Array<{ id: string; data: Record<string, string> }> = [];
    for (const row of rows) {
      const orig = baseMap.get(row.id);
      if (!orig) continue;
      const keys = new Set([...Object.keys(orig.data || {}), ...Object.keys(row.data || {})]);
      let changed = false;
      for (const k of keys) {
        if ((orig.data?.[k] || '') !== (row.data?.[k] || '')) {
          changed = true;
          break;
        }
      }
      if (changed) updates.push({ id: row.id, data: { ...row.data } });
    }
    return updates;
  }, [rows, baseline]);

  const dirtyCount = dirtyUpdates.length;

  const filteredPersonNames = useMemo(() => {
    const q = personSearch.trim().toLowerCase();
    if (!q) return personNames;
    return personNames.filter((n) => n.toLowerCase().includes(q));
  }, [personNames, personSearch]);

  const selectedCount = useMemo(
    () => Object.values(selectedIds).filter(Boolean).length,
    [selectedIds]
  );

  useEffect(() => {
    setAdminKeyDraft(selectedTable?.adminKey || '');
  }, [selectedTable?.id, selectedTable?.adminKey]);

  useEffect(() => {
    setColFilters({});
    setSortCol('');
    setSortDir('asc');
    setSelectedIds({});
    setPersonFilter('');
    setPersonSearch('');
  }, [tableId, tabId]);


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
      setBaseline([]);
      setTotal(0);
      setColumnViews([]);
      setSelectedIds({});
      return;
    }
    const qs = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
    });
    if (
      tableId === 'sadhana' &&
      tabId === SADHANA_RESPONSES_TAB &&
      personFilter.trim()
    ) {
      qs.set('name', personFilter.trim());
    }
    const res = await fetch(
      `/api/admn/tables/${encodeURIComponent(tableId)}/tabs/${encodeURIComponent(tabId)}/rows?${qs}`
    );
    const data = await res.json();
    if (res.status === 401) {
      router.replace('/admn/login');
      return;
    }
    if (!res.ok) throw new Error(data.message || 'Failed to load rows');
    const nextRows: RowDoc[] = (data.rows || []).map((r: RowDoc) => ({
      id: r.id,
      data: { ...(r.data || {}) },
    }));
    setRows(nextRows);
    setBaseline(deepCloneRows(nextRows));
    setTotal(data.total || 0);
    setColumnViews(data.columnViews || (data.columns || []).map((n: string) => ({ name: n })));
    setSelectedIds({});
  }, [tableId, tabId, offset, limit, personFilter, router]);


  const loadPersonNames = useCallback(async () => {
    if (tableId !== 'sadhana') {
      setPersonNames([]);
      return;
    }
    const res = await fetch(
      `/api/admn/tables/${encodeURIComponent(tableId)}/tabs/${encodeURIComponent(SADHANA_UNIQUE_NAMES_TAB)}/rows?offset=0&limit=5000`
    );
    const data = await res.json();
    if (!res.ok) return;
    const names: string[] = (data.rows || [])
      .map((r: RowDoc) => String(r.data?.Name || '').trim())
      .filter(Boolean);
    const uniq = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'hi'));
    setPersonNames(uniq);
  }, [tableId]);


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
    void loadPersonNames();
  }, [loadPersonNames]);

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

  useEffect(() => {
    const schemas = selectedTable?.columnSchemas || [];
    if (schemaCol) {
      const s = schemas.find((c) => c.name === schemaCol);
      const vals = [...(s?.allowedValues || [])];
      setSchemaValueList(vals);
      setSchemaEditIdx(0);
      setSchemaAddValue('');
    } else {
      setSchemaValueList([]);
      setSchemaEditIdx(0);
      setSchemaAddValue('');
    }
  }, [selectedTable, schemaCol]);

  const logout = async () => {
    await fetch('/api/admn/logout', { method: 'POST' });
    router.replace('/admn/login');
  };

  const setCell = (rowId: string, col: string, value: string) => {
    if (!canWrite) return;
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, data: { ...r.data, [col]: value } } : r))
    );
    setStatus('');
    setError('');
  };

  const discardChanges = () => {
    setRows(deepCloneRows(baseline));
    setStatus('Changes discarded');
    setError('');
  };

  const applyUpdates = async () => {
    if (!canWrite || !dirtyCount || !tableId || !tabId) return;
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const res = await fetch(
        `/api/admn/tables/${encodeURIComponent(tableId)}/tabs/${encodeURIComponent(tabId)}/rows`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: dirtyUpdates }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Update failed — no rows were changed.');
        return;
      }
      setStatus(`Updated ${data.updated} row(s) successfully.`);
      await loadRows();
      await loadTables();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed — no rows were changed.');
    } finally {
      setSaving(false);
    }
  };

  const addRow = async () => {
    if (!canWrite || !tableId || !tabId) return;
    if (dirtyCount > 0) {
      setError('Save or discard pending edits before adding a row.');
      return;
    }
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

  const deleteRowsByIds = async (ids: string[]) => {
    if (!canWrite || !tableId || !tabId || !ids.length) return;
    if (dirtyCount > 0) {
      setError('Save or discard pending edits before deleting rows.');
      return;
    }
    const ok = window.confirm(
      ids.length === 1
        ? 'Delete this row permanently? This cannot be undone.'
        : `Delete ${ids.length} rows permanently? This cannot be undone.`
    );
    if (!ok) return;
    setError('');
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admn/tables/${encodeURIComponent(tableId)}/tabs/${encodeURIComponent(tabId)}/rows`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Delete failed');
        return;
      }
      const failed = data.failed || 0;
      setStatus(
        failed
          ? `Deleted ${data.deleted} row(s); ${failed} failed.`
          : `Deleted ${data.deleted} row(s).`
      );
      setSelectedIds({});
      await loadRows();
      await loadTables();
      if (tableId === 'sadhana') await loadPersonNames();
    } finally {
      setSaving(false);
    }
  };

  const deleteRowById = async (rowId: string) => {
    await deleteRowsByIds([rowId]);
  };

  const deleteSelectedRows = async () => {
    const ids = Object.entries(selectedIds)
      .filter(([, v]) => v)
      .map(([id]) => id);
    await deleteRowsByIds(ids);
  };

  const selectPerson = (name: string) => {
    if (dirtyCount > 0) {
      const ok = window.confirm('You have unsaved edits. Discard them and switch person?');
      if (!ok) return;
    }
    setPersonFilter(name);
    setTabId(SADHANA_RESPONSES_TAB);
    setOffset(0);
    setSelectedIds({});
    setError('');
    setStatus(name ? `Showing responses for ${name}` : 'Showing all responses');
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

  const saveColumnSchema = async () => {
    if (!canWrite || !tableId || !schemaCol.trim()) return;
    const allowedValues = schemaValueList.map((v) => v.trim()).filter(Boolean);
    const res = await fetch(`/api/admn/tables/${encodeURIComponent(tableId)}/columns`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: schemaCol.trim(),
        allowedValues,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || 'Failed to save column values');
      return;
    }
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId ? { ...t, columnSchemas: data.columnSchemas || [] } : t
      )
    );
    await loadRows();
    setStatus(
      allowedValues.length
        ? `Allowed values saved for “${schemaCol.trim()}”.`
        : `Cleared allowed values for “${schemaCol.trim()}” (free text).`
    );
  };

  const addColumnToTab = async () => {
    if (!canWrite || !tableId || !tabId || !newColumnName.trim()) return;
    const name = newColumnName.trim();
    const res = await fetch(`/api/admn/tables/${encodeURIComponent(tableId)}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabId, name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || 'Add column failed');
      return;
    }
    setNewColumnName('');
    await loadTables();
    await loadRows();
    setStatus(`Column “${name}” added to this tab.`);
  };

  const saveAdminKey = async () => {
    if (!canWrite || !tableId) return;
    const res = await fetch(`/api/admn/tables/${encodeURIComponent(tableId)}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey: adminKeyDraft }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || 'Failed to save admin key');
      return;
    }
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, adminKey: data.adminKey || '' } : t))
    );
    setStatus(
      data.adminKey
        ? 'Overview admin key saved. Use it on /sadhana/overview.'
        : 'Overview admin key cleared.'
    );
  };

  const selectTab = (id: string) => {
    if (dirtyCount > 0) {
      const ok = window.confirm('You have unsaved edits. Discard them and switch tabs?');
      if (!ok) return;
    }
    setTabId(id);
    setOffset(0);
    setTabSearch('');
    setColFilters({});
    setSortCol('');
    setSortDir('asc');
    setError('');
    setStatus('');
  };

  const changeTable = (id: string) => {
    if (dirtyCount > 0) {
      const ok = window.confirm('You have unsaved edits. Discard them and switch tables?');
      if (!ok) return;
    }
    setTableId(id);
    const t = tables.find((x) => x.id === id);
    setTabId(t?.tabs?.[0]?.id || '');
    setOffset(0);
    setTabSearch('');
    setSchemaCol('');
    setSchemaValueList([]);
    setSchemaEditIdx(0);
    setSchemaAddValue('');
  };

  const changePageSize = (n: number) => {
    if (dirtyCount > 0) {
      const ok = window.confirm('You have unsaved edits. Discard them and change page size?');
      if (!ok) return;
    }
    setLimit(n);
    setOffset(0);
  };

  const visibleRows = useMemo(() => {
    const entries = Object.entries(colFilters).filter(([, v]) => v.trim() !== '');
    let list = rows;
    if (entries.length) {
      list = rows.filter((row) =>
        entries.every(([col, prefix]) =>
          String(row.data?.[col] || '')
            .toLowerCase()
            .startsWith(prefix.trim().toLowerCase())
        )
      );
    }
    if (!sortCol) return list;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = String(a.data?.[sortCol] || '');
      const bv = String(b.data?.[sortCol] || '');
      const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
      return cmp * dir;
    });
  }, [rows, colFilters, sortCol, sortDir]);

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const allVisibleSelected =
    visibleRows.length > 0 && visibleRows.every((r) => selectedIds[r.id]);

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = { ...prev };
        for (const r of visibleRows) delete next[r.id];
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = { ...prev };
        for (const r of visibleRows) next[r.id] = true;
        return next;
      });
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;
  const allowedMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const c of columnViews) {
      if (c.allowedValues && c.allowedValues.length > 0) m.set(c.name, c.allowedValues);
    }
    return m;
  }, [columnViews]);

  const schemaColumnOptions = useMemo(() => {
    const names = new Set<string>(columns);
    for (const s of selectedTable?.columnSchemas || []) {
      if (s.name) names.add(s.name);
    }
    for (const tab of selectedTable?.tabs || []) {
      for (const c of tab.columns || []) names.add(c);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [columns, selectedTable]);

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

      <div className="admn-flash" aria-live="polite">
        {error ? (
          <p className="admn-error" role="alert">
            {error}
          </p>
        ) : null}
        {status ? <p className="admn-status">{status}</p> : null}
      </div>

      {loading ? <p className="admn-note">Loading tables…</p> : null}

      <section className="admn-toolbar" aria-label="Table picker and pagination">
        <label>
          Table
          <select value={tableId} onChange={(e) => changeTable(e.target.value)}>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Rows per page
          <select
            value={limit}
            onChange={(e) => changePageSize(parseInt(e.target.value, 10))}
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="admn-pager">
          <button
            type="button"
            className="admn-btn admn-btn--ghost"
            disabled={offset <= 0 || dirtyCount > 0}
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
            disabled={offset + limit >= total || dirtyCount > 0}
            onClick={() => setOffset(offset + limit)}
          >
            Next
          </button>
        </div>
        {canWrite ? (
          <>
            <button
              type="button"
              className="admn-btn"
              disabled={!dirtyCount || saving}
              onClick={() => void applyUpdates()}
            >
              {saving ? 'Updating…' : `Update${dirtyCount ? ` (${dirtyCount})` : ''}`}
            </button>
            <button
              type="button"
              className="admn-btn admn-btn--ghost"
              disabled={!dirtyCount || saving}
              onClick={discardChanges}
            >
              Discard
            </button>
            <button type="button" className="admn-btn admn-btn--ghost" onClick={addRow}>
              Add row
            </button>
            <button
              type="button"
              className="admn-btn admn-btn--ghost admn-btn--danger"
              disabled={!selectedCount || saving}
              onClick={() => void deleteSelectedRows()}
            >
              Delete selected ({selectedCount})
            </button>
          </>
        ) : null}
      </section>

      <section className="admn-tabs-bar" aria-label="Tabs">
        <label className="admn-tab-search">
          <span className="visually-hidden">Search tabs</span>
          <input
            type="search"
            list="admn-tab-suggestions"
            value={tabSearch}
            onChange={(e) => setTabSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredTabs.length === 1) {
                e.preventDefault();
                selectTab(filteredTabs[0].id);
              }
            }}
            placeholder="Search tabs…"
            autoComplete="off"
          />
          <datalist id="admn-tab-suggestions">
            {(selectedTable?.tabs || []).map((tab) => (
              <option key={tab.id} value={tab.name} />
            ))}
          </datalist>
        </label>
        <div className="admn-tab-chips" role="tablist" aria-label="Table tabs">
          {filteredTabs.map((tab) => {
            const selected = tab.id === tabId;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`admn-tab-chip${selected ? ' is-active' : ''}`}
                onClick={() => selectTab(tab.id)}
              >
                {tab.name}
                {typeof tab.rowCount === 'number' ? (
                  <span className="admn-tab-chip__count">{tab.rowCount}</span>
                ) : null}
              </button>
            );
          })}
          {filteredTabs.length === 0 ? (
            <span className="admn-tab-empty">No tabs match.</span>
          ) : null}
        </div>
      </section>

      {tableId === 'sadhana' ? (
        <section className="admn-tabs-bar admn-person-bar" aria-label="Sadhana persons">
          <label className="admn-tab-search">
            <span className="visually-hidden">Search persons</span>
            <input
              type="search"
              list="admn-person-suggestions"
              value={personSearch}
              onChange={(e) => setPersonSearch(e.target.value)}
              placeholder="Search persons…"
              autoComplete="off"
            />
            <datalist id="admn-person-suggestions">
              {personNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </label>
          <div className="admn-tab-chips" role="list" aria-label="Unique persons">
            <button
              type="button"
              className={`admn-tab-chip${!personFilter ? ' is-active' : ''}`}
              onClick={() => selectPerson('')}
            >
              All responses
            </button>
            {filteredPersonNames.map((name) => {
              const selected = personFilter === name;
              return (
                <button
                  key={name}
                  type="button"
                  role="listitem"
                  className={`admn-tab-chip${selected ? ' is-active' : ''}`}
                  onClick={() => selectPerson(name)}
                >
                  {name}
                </button>
              );
            })}
            {filteredPersonNames.length === 0 ? (
              <span className="admn-tab-empty">No persons match.</span>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="admn-grid-wrap" role="region" aria-label="Data grid">
        <table className="admn-grid">
          <thead>
            <tr>
              {canWrite ? (
                <th scope="col" className="admn-th-check">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all visible rows"
                  />
                </th>
              ) : null}
              <th scope="col">#</th>
              {columnViews.map((c) => (
                <th key={c.name} scope="col" aria-sort={sortCol === c.name ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <div className="admn-th">
                    <button
                      type="button"
                      className="admn-th-sort"
                      onClick={() => toggleSort(c.name)}
                      aria-label={`Sort by ${c.name}${sortCol === c.name ? `, currently ${sortDir}` : ''}`}
                    >
                      <span>
                        {c.name}
                        {c.allowedValues?.length ? (
                          <span className="admn-col-hint" title="Restricted values">
                            {' '}
                            ▾
                          </span>
                        ) : null}
                      </span>
                      <span className="admn-th-sort__ind" aria-hidden>
                        {sortCol === c.name ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                    <label className="admn-col-filter">
                      <span className="visually-hidden">Filter {c.name} by prefix</span>
                      <input
                        type="search"
                        value={colFilters[c.name] || ''}
                        placeholder="prefix…"
                        aria-label={`Filter ${c.name} by prefix`}
                        onChange={(e) =>
                          setColFilters((prev) => ({ ...prev, [c.name]: e.target.value }))
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                    </label>
                  </div>
                </th>
              ))}
              {canWrite ? (
                <th scope="col" className="admn-th-actions">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, idx) => {
              const isDirty = dirtyUpdates.some((u) => u.id === row.id);
              return (
                <tr key={row.id} className={isDirty ? 'is-dirty' : undefined}>
                  {canWrite ? (
                    <td className="admn-td-check">
                      <input
                        type="checkbox"
                        checked={!!selectedIds[row.id]}
                        onChange={(e) =>
                          setSelectedIds((prev) => ({
                            ...prev,
                            [row.id]: e.target.checked,
                          }))
                        }
                        aria-label={`Select row ${offset + idx + 1}`}
                      />
                    </td>
                  ) : null}
                  <td>{offset + idx + 1}</td>
                  {columnViews.map((col) => {
                    const allowed = allowedMap.get(col.name);
                    const value = row.data?.[col.name] || '';
                    const label = `${col.name} row ${offset + idx + 1}`;
                    return (
                      <td key={col.name}>
                        {canWrite ? (
                          allowed ? (
                            <select
                              className="admn-cell admn-cell--select"
                              value={value}
                              aria-label={label}
                              onChange={(e) => setCell(row.id, col.name, e.target.value)}
                            >
                              <option value="">(empty)</option>
                              {value && !allowed.includes(value) ? (
                                <option value={value}>{value}</option>
                              ) : null}
                              {allowed.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              className="admn-cell"
                              value={value}
                              aria-label={label}
                              onChange={(e) => setCell(row.id, col.name, e.target.value)}
                            />
                          )
                        ) : (
                          <span>{value}</span>
                        )}
                      </td>
                    );
                  })}
                  {canWrite ? (
                    <td className="admn-td-actions">
                      <button
                        type="button"
                        className="admn-btn admn-btn--ghost admn-btn--danger"
                        aria-label={`Delete row ${offset + idx + 1}`}
                        onClick={() => void deleteRowById(row.id)}
                      >
                        Delete
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(1, columns.length + 1 + (canWrite ? 2 : 0))}>
                  No rows in this tab.
                </td>
              </tr>
            ) : null}
            {rows.length > 0 && visibleRows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(1, columns.length + 1 + (canWrite ? 2 : 0))}>
                  No rows match the column prefix filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {canWrite ? (
        <section className="admn-admin-panels" aria-label="Write actions">
          {tableId === 'sadhana' ? (
            <div className="admn-panel">
              <h2>Sadhana overview admin key</h2>
              <p className="admn-panel__hint">
                Used on <code>/sadhana/overview</code> only. Stored on this table in Cosmos — not
                env. Write access required to change.
              </p>
              {canWrite ? (
                <div className="admn-inline">
                  <label className="admn-grow">
                    Admin key
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      maxLength={4}
                      value={adminKeyDraft}
                      onChange={(e) =>
                        setAdminKeyDraft(e.target.value.replace(/\D/g, '').slice(0, 4))
                      }
                      placeholder="4-digit key"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </label>
                  <button
                    type="button"
                    className="admn-btn"
                    disabled={
                      adminKeyDraft.length > 0 && adminKeyDraft.length !== 4
                    }
                    onClick={() => void saveAdminKey()}
                  >
                    Save key
                  </button>
                </div>
              ) : (
                <p className="admn-panel__hint">
                  Current key: <code>{selectedTable?.adminKey || '(not set)'}</code>
                </p>
              )}
            </div>
          ) : null}
          <div className="admn-panel">
            <h2>Add column</h2>
            <p className="admn-panel__hint">
              Adds a header on the current tab only. Existing rows stay empty until you edit them.
            </p>
            <div className="admn-inline">
              <input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="column name"
                aria-label="New column name"
              />
              <button
                type="button"
                className="admn-btn"
                disabled={!newColumnName.trim() || !tabId}
                onClick={() => void addColumnToTab()}
              >
                Add column
              </button>
            </div>
          </div>
          <div className="admn-panel">
            <h2>Allowed values (shared)</h2>
            <p className="admn-panel__hint">
              Pick a column, edit values via the dropdown (or add/remove), then Save. For sadhana
              use storage names like Sleeping Time, Chanting Rounds, श्रवणम्. Empty list = free text
              (do not clear live sadhana option columns).
            </p>
            <div className="admn-schema-editor">
              <label>
                Column
                <select
                  value={schemaCol}
                  onChange={(e) => setSchemaCol(e.target.value)}
                  aria-label="Column for allowed values"
                >
                  <option value="">Select column…</option>
                  {schemaColumnOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              {schemaCol ? (
                <>
                  <div className="admn-inline">
                    <label>
                      Value in list
                      <select
                        value={schemaValueList.length ? String(schemaEditIdx) : ''}
                        onChange={(e) => setSchemaEditIdx(parseInt(e.target.value, 10) || 0)}
                        aria-label="Select allowed value to edit"
                        disabled={schemaValueList.length === 0}
                      >
                        {schemaValueList.length === 0 ? (
                          <option value="">(empty list)</option>
                        ) : (
                          schemaValueList.map((v, i) => (
                            <option key={`${i}-${v}`} value={i}>
                              {v}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    <label className="admn-grow">
                      Edit selected
                      <input
                        value={schemaValueList[schemaEditIdx] || ''}
                        onChange={(e) => {
                          const next = [...schemaValueList];
                          if (!next.length) return;
                          next[schemaEditIdx] = e.target.value;
                          setSchemaValueList(next);
                        }}
                        disabled={schemaValueList.length === 0}
                        aria-label="Edit selected allowed value"
                      />
                    </label>
                    <button
                      type="button"
                      className="admn-btn admn-btn--ghost"
                      disabled={schemaValueList.length === 0}
                      onClick={() => {
                        const next = schemaValueList.filter((_, i) => i !== schemaEditIdx);
                        setSchemaValueList(next);
                        setSchemaEditIdx(Math.max(0, Math.min(schemaEditIdx, next.length - 1)));
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="admn-inline">
                    <label className="admn-grow">
                      Add value
                      <input
                        value={schemaAddValue}
                        onChange={(e) => setSchemaAddValue(e.target.value)}
                        placeholder="New option text"
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return;
                          e.preventDefault();
                          const v = schemaAddValue.trim();
                          if (!v) return;
                          if (schemaValueList.includes(v)) {
                            setError('That value is already in the list.');
                            return;
                          }
                          setSchemaValueList((prev) => [...prev, v]);
                          setSchemaEditIdx(schemaValueList.length);
                          setSchemaAddValue('');
                          setError('');
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="admn-btn admn-btn--ghost"
                      disabled={!schemaAddValue.trim()}
                      onClick={() => {
                        const v = schemaAddValue.trim();
                        if (!v) return;
                        if (schemaValueList.includes(v)) {
                          setError('That value is already in the list.');
                          return;
                        }
                        setSchemaValueList((prev) => [...prev, v]);
                        setSchemaEditIdx(schemaValueList.length);
                        setSchemaAddValue('');
                        setError('');
                      }}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      className="admn-btn"
                      onClick={() => void saveColumnSchema()}
                    >
                      Save values
                    </button>
                  </div>
                  <p className="admn-panel__hint" aria-live="polite">
                    {schemaValueList.length} value(s) — order is used for charts / form options.
                  </p>
                </>
              ) : null}
            </div>
          </div>
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
        <>
          {tableId === 'sadhana' ? (
            <section className="admn-admin-panels" aria-label="Sadhana overview key">
              <div className="admn-panel">
                <h2>Sadhana overview admin key</h2>
                <p className="admn-panel__hint">
                  Current key for <code>/sadhana/overview</code>:{' '}
                  <code>{selectedTable?.adminKey || '(not set)'}</code>
                </p>
              </div>
            </section>
          ) : null}
          <p className="admn-note">
            Your account is read-only. Ask a write admin to grant edit access.
          </p>
        </>
      )}
    </div>
  );
}
