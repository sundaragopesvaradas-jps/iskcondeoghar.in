'use client';

import React, { useEffect, useState } from 'react';
import { sadhanaStrings as t } from './sadhanaStrings';

export type LeaderboardRow = {
  rank: number;
  name: string;
  points: number;
  days: number;
  nameParts?: { head: string; rest: string };
  isSelf?: boolean;
};

type Props = {
  /** When set, request includes this name for self highlight / full name if in top 10 */
  highlightName?: string;
  /** Public pages mask names; admin/records with highlight can show full for self */
  maskNames?: boolean;
  title?: string;
  className?: string;
  limit?: number;
};

export function SadhanaLeaderboardPanel({
  highlightName,
  maskNames = true,
  title = t.leaderboardTitle,
  className = '',
  limit = 10,
}: Props) {
  const [entries, setEntries] = useState<LeaderboardRow[]>([]);
  const [self, setSelf] = useState<LeaderboardRow | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams({
          limit: String(limit),
          days: '30',
          mask: maskNames ? '1' : '0',
        });
        if (highlightName?.trim()) qs.set('name', highlightName.trim());
        const res = await fetch(`/api/sadhana/leaderboard?${qs}`);
        const data = await res.json();
        if (!res.ok || data.status === 'error') {
          throw new Error(data.message || 'Failed to load leaderboard');
        }
        if (cancelled) return;
        setEntries(data.entries || []);
        setSelf(data.self || null);
        setFrom(data.from || '');
        setTo(data.to || '');
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load leaderboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [highlightName, maskNames, limit]);

  return (
    <section
      className={`sadhana-lb ${className}`.trim()}
      aria-label={title}
    >
      <h2 className="sadhana-lb__title">{title}</h2>
      {from && to ? (
        <p className="sadhana-lb__period">
          {from} → {to}
        </p>
      ) : null}
      {loading ? <p className="sadhana-lb__hint">{t.leaderboardLoading}</p> : null}
      {error ? (
        <p className="sadhana-lb__err" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && entries.length === 0 ? (
        <p className="sadhana-lb__hint">{t.leaderboardEmpty}</p>
      ) : null}
      {entries.length > 0 ? (
        <ol className="sadhana-lb__list">
          {entries.map((e) => (
            <li
              key={`${e.rank}-${e.name}`}
              className={`sadhana-lb__row${e.isSelf ? ' sadhana-lb__row--self' : ''}`}
            >
              <span className="sadhana-lb__rank">{e.rank}</span>
              <span className="sadhana-lb__name">
                {e.nameParts ? (
                  <>
                    <span className="sadhana-lb__name-head">{e.nameParts.head}</span>
                    {e.nameParts.rest ? (
                      <span className="sadhana-lb__name-rest" aria-hidden>
                        {e.nameParts.rest}
                      </span>
                    ) : null}
                    {e.nameParts.rest ? (
                      <span className="visually-hidden"> (name partially hidden)</span>
                    ) : null}
                  </>
                ) : (
                  e.name
                )}
              </span>
              <span className="sadhana-lb__points">{e.points}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {self && highlightName ? (
        <p
          className={`sadhana-lb__self${self.rank > 0 && self.rank <= limit ? ' sadhana-lb__self--intop' : ''}`}
        >
          {self.rank > 0 ? (
            <>
              {t.leaderboardYourScore}: <strong>{self.points}</strong> · {t.leaderboardRank}{' '}
              <strong>#{self.rank}</strong> · {self.days} {t.leaderboardDays}
            </>
          ) : (
            <>
              {t.leaderboardYourScore}: <strong>0</strong> ({t.leaderboardNoScore})
            </>
          )}
        </p>
      ) : null}
    </section>
  );
}

export default SadhanaLeaderboardPanel;
