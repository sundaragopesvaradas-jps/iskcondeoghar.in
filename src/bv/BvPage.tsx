import React, { useCallback, useEffect, useRef, useState } from 'react';
import './BvPage.css';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwe2M3QHtcDKqV3sDrcCJ7XFJS5aw_HQf9qONoRe36kY1zhzDnlxtQmi0jgwTKLtiOr/exec';

interface FormState {
  name: string;
  age: string;
  mobile: string;
  gender: 'Male' | 'Female' | '';
  location: string;
}

const initialForm: FormState = { name: '', age: '', mobile: '', gender: '', location: '' };

function BvPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const syncScroll = useCallback(() => {
    const right = rightRef.current;
    const left = leftRef.current;
    if (!right || !left) return;
    const rightMax = right.scrollHeight - right.clientHeight;
    const leftMax = left.scrollHeight - left.clientHeight;
    if (rightMax <= 0 || leftMax <= 0) return;
    const ratio = right.scrollTop / rightMax;
    left.scrollTop = ratio * leftMax;
  }, []);

  useEffect(() => {
    const right = rightRef.current;
    if (!right) return;
    right.addEventListener('scroll', syncScroll, { passive: true });
    return () => right.removeEventListener('scroll', syncScroll);
  }, [syncScroll]);

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const fieldClass = (value: string) =>
    `bv-field__input${value.trim() ? ' filled' : ''}`;

  const postToScript = async (payload: Record<string, string>) => {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error('Server error');
    }
    return res.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const missing: string[] = [];
    if (!form.name.trim()) missing.push('Name');
    if (!form.age.trim()) missing.push('Age');
    if (!form.mobile.trim()) missing.push('Mobile Number');
    if (!form.gender) missing.push('Gender');
    if (!form.location.trim()) missing.push('Location / Area');

    if (missing.length > 0) {
      setError('Please fill: ' + missing.join(', '));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        action: 'register',
        name: form.name.trim(),
        age: form.age.trim(),
        mobile: form.mobile.trim(),
        gender: form.gender,
        location: form.location.trim(),
      };
      const result = await postToScript(payload);
      if (!result?.success || !result?.registrationId) {
        throw new Error(result?.error || 'Registration failed');
      }
      setSubmitted(true);
      setForm(initialForm);
    } catch (err) {
      const msg = (err as any)?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bv-page">
      {/* Blurred poster background */}
      <div className="bv-bg" style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/images/bv-poster.jpeg)` }} />

      {/* Left Pane - Poster */}
      <div className="bv-left" ref={leftRef}>
        <div className="bv-left__poster-wrap">
          <img
            src="/images/bv-poster.jpeg"
            alt="Bhagavad Gita in 18 Days - Course Poster"
            className="bv-left__poster"
          />
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="bv-right" ref={rightRef}>
        <div className="bv-header">
          <h1 className="bv-header__title">
            {submitted ? 'Thank You!' : 'Register for Bhakti Vriksha Deoghar'}
          </h1>
          {!submitted && <p className="bv-header__subtitle" />}
        </div>
        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <div className="bv-form-card">
              <div className="bv-form-grid">
                {/* Name */}
                <div className="bv-field bv-field--full">
                  <label className="bv-field__label">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    className={fieldClass(form.name)}
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Age */}
                <div className="bv-field">
                  <label className="bv-field__label">Age *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.age}
                    onChange={(e) => update('age', e.target.value)}
                    className={fieldClass(form.age)}
                    placeholder="e.g. 25"
                  />
                </div>

                {/* Mobile */}
                <div className="bv-field">
                  <label className="bv-field__label">Mobile Number *</label>
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={(e) => update('mobile', e.target.value)}
                    className={fieldClass(form.mobile)}
                    placeholder="10-digit number"
                  />
                </div>

                {/* Gender */}
                <div className="bv-field">
                  <label className="bv-field__label">Gender *</label>
                  <div className={`bv-gender-group${form.gender ? ' filled' : ''}`}>
                    <label className="bv-gender-option">
                      <input
                        type="radio"
                        name="gender"
                        checked={form.gender === 'Male'}
                        onChange={() => update('gender', 'Male')}
                      />
                      <span>Male</span>
                    </label>
                    <label className="bv-gender-option">
                      <input
                        type="radio"
                        name="gender"
                        checked={form.gender === 'Female'}
                        onChange={() => update('gender', 'Female')}
                      />
                      <span>Female</span>
                    </label>
                  </div>
                </div>

                {/* Location / Area */}
                <div className="bv-field">
                  <label className="bv-field__label">Location / Area *</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => update('location', e.target.value)}
                    className={fieldClass(form.location)}
                    placeholder="e.g. Deoghar, Jasidih"
                  />
                </div>
              </div>

              {error && <div className="bv-error">{error}</div>}

              <div className="bv-submit-section">
                <button type="submit" className="bv-submit-btn" disabled={submitting}>
                  {submitting ? (
                    <>
                      <svg className="bv-spinner" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Registering...
                    </>
                  ) : (
                    <>Register</>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="bv-form-card bv-thankyou-card">
            <p className="bv-success">Your details have been saved successfully.</p>
            <p className="bv-thankyou-text">Thank you for registering.</p>
            <div className="bv-thankyou-actions">
              <button
                type="button"
                className="bv-submit-btn"
                onClick={() => {
                  setSubmitted(false);
                  setError('');
                }}
              >
                Register Another Person
              </button>
              <a href="/bv" className="bv-link-btn">
                Open Registration Page
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BvPage;
