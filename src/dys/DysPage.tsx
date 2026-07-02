import React, { useCallback, useEffect, useRef, useState } from 'react';
import './DysPage.css';

const SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
const DONATION_URL = 'https://rzp.io/rzp/rUdBTvc';

interface FormState {
  name: string;
  age: string;
  mobile: string;
  gender: 'Male' | 'Female' | '';
  location: string;
}

const initialForm: FormState = { name: '', age: '', mobile: '', gender: '', location: '' };

function DysPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
    `dys-field__input${value.trim() ? ' filled' : ''}`;

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
        name: form.name.trim(),
        age: form.age.trim(),
        mobile: form.mobile.trim(),
        gender: form.gender,
        location: form.location.trim(),
      };

      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Server error');

      window.location.href = DONATION_URL;
    } catch (err) {
      const msg = (err as any)?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dys-page">
      {/* Blurred poster background */}
      <div className="dys-bg" style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/images/dys-poster.jpeg)` }} />

      {/* Left Pane - Poster */}
      <div className="dys-left" ref={leftRef}>
        <div className="dys-left__poster-wrap">
          <img
            src="/images/dys-poster.jpeg"
            alt="Bhagavad Gita in 18 Days - Course Poster"
            className="dys-left__poster"
          />
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="dys-right" ref={rightRef}>
        <div className="dys-header">
          <h1 className="dys-header__title">Register for Bhagavad Gita Course</h1>
          <p className="dys-header__subtitle">
            Learn Bhagavad Gita in 18 Days — Live Interactive Sessions, Quizzes &amp; Free Course Material
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="dys-form-card">
            <div className="dys-form-grid">
              {/* Name */}
              <div className="dys-field dys-field--full">
                <label className="dys-field__label">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  className={fieldClass(form.name)}
                  placeholder="Enter your full name"
                />
              </div>

              {/* Age */}
              <div className="dys-field">
                <label className="dys-field__label">Age *</label>
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
              <div className="dys-field">
                <label className="dys-field__label">Mobile Number *</label>
                <input
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => update('mobile', e.target.value)}
                  className={fieldClass(form.mobile)}
                  placeholder="10-digit number"
                />
              </div>

              {/* Gender */}
              <div className="dys-field">
                <label className="dys-field__label">Gender *</label>
                <div className={`dys-gender-group${form.gender ? ' filled' : ''}`}>
                  <label className="dys-gender-option">
                    <input
                      type="radio"
                      name="gender"
                      checked={form.gender === 'Male'}
                      onChange={() => update('gender', 'Male')}
                    />
                    <span>Male</span>
                  </label>
                  <label className="dys-gender-option">
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
              <div className="dys-field">
                <label className="dys-field__label">Location / Area *</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                  className={fieldClass(form.location)}
                  placeholder="e.g. Deoghar, Jasidih"
                />
              </div>
            </div>

            {error && <div className="dys-error">{error}</div>}

            <div className="dys-submit-section">
              <button type="submit" className="dys-submit-btn" disabled={submitting}>
                {submitting ? (
                  <>
                    <svg className="dys-spinner" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Registering...
                  </>
                ) : (
                  <>Register &rarr;</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DysPage;
