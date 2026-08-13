import React, { FormEvent, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fetchNameSearch, getNameScriptUrl } from './fetchNameSearch';
import { hasSearchableNameQuery } from './nameSearchTypes';
import { renderNameWithBoldPrefix } from './renderNameWithBoldPrefix';
import type { NameGender, NameSearchResult, NameWordCount } from './nameSearchTypes';
import './NameSearchPage.css';

function NameSearchPage() {
  const [query, setQuery] = useState('');
  const [gender, setGender] = useState<NameGender>('Boy');
  const [wordCount, setWordCount] = useState<NameWordCount>('any');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<NameSearchResult | null>(null);

  const canSearch = hasSearchableNameQuery(query) && !loading;
  const scriptConfigured = Boolean(getNameScriptUrl());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasSearchableNameQuery(query)) {
      setError('Enter at least one prefix to search.');
      return;
    }

    const scriptUrl = getNameScriptUrl();
    if (!scriptUrl) {
      setError(
        'Name search is not configured. Set NAME_GOOGLE_SCRIPT_URL in src/name/nameBackendConfig.ts and rebuild.'
      );
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const data = await fetchNameSearch(scriptUrl, {
        action: 'NAME_SEARCH',
        gender,
        wordCount,
        query: query.trim(),
      });
      setResult(data);
    } catch (err) {
      const msg = (err as Error)?.message || 'Search failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const totalMatches =
    result?.groups.reduce((sum, g) => sum + g.items.length, 0) ?? 0;

  return (
    <div className="name-page">
      <Header />
      <main className="name-page__main">
        <h1 className="name-page__title">Name search</h1>
        <p className="name-page__lede">
          Enter comma-separated prefixes (for example <code>sa,hi,k,to</code>), choose Boy or Girl,
          and how many words you want in the name.
        </p>

        <form className="name-form" onSubmit={handleSubmit} noValidate>
          <div className="name-field">
            <label htmlFor="name-query">Prefixes</label>
            <input
              id="name-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="sa, hi, k, to"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <fieldset className="name-fieldset">
            <legend>Gender</legend>
            <label className="name-radio">
              <input
                type="radio"
                name="name-gender"
                value="Boy"
                checked={gender === 'Boy'}
                onChange={() => setGender('Boy')}
              />
              Boy
            </label>
            <label className="name-radio">
              <input
                type="radio"
                name="name-gender"
                value="Girl"
                checked={gender === 'Girl'}
                onChange={() => setGender('Girl')}
              />
              Girl
            </label>
          </fieldset>

          <fieldset className="name-fieldset">
            <legend>Number of words</legend>
            {(['1', '2', '3', 'any'] as NameWordCount[]).map((value) => (
              <label key={value} className="name-radio">
                <input
                  type="radio"
                  name="name-word-count"
                  value={value}
                  checked={wordCount === value}
                  onChange={() => setWordCount(value)}
                />
                {value === 'any' ? 'Any' : value}
              </label>
            ))}
          </fieldset>

          <button
            type="submit"
            className="name-search-btn"
            disabled={!canSearch}
            aria-disabled={!canSearch}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>

          {!scriptConfigured && (
            <p className="name-hint" role="status">
              Backend URL not set yet. See <code>src/name/GOOGLE_SHEETS_SETUP.md</code>.
            </p>
          )}
        </form>

        {error && (
          <p className="name-error" role="alert">
            {error}
          </p>
        )}

        {result && (
          <section className="name-results" aria-live="polite">
            <p className="name-results__summary">
              {totalMatches === 0
                ? 'No matching names.'
                : `${totalMatches} name${totalMatches === 1 ? '' : 's'} found.`}
            </p>

            {result.groups.map((group) => (
              <div key={group.prefix} className="name-table-wrap">
                <h2 className="name-table__title">{group.prefix}</h2>
                {group.items.length === 0 ? (
                  <p className="name-table__empty">No names for this prefix.</p>
                ) : (
                  <table className="name-table">
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        {result.includeMeaning && <th scope="col">Meaning</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => (
                        <tr key={`${group.prefix}-${item.name}`}>
                          <td>{renderNameWithBoldPrefix(item.name, group.prefix)}</td>
                          {result.includeMeaning && (
                            <td>{item.meaning || '—'}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default NameSearchPage;
