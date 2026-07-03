import React, { useCallback, useEffect, useRef, useState } from 'react';
import './GitamrtaPage.css';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwe2M3QHtcDKqV3sDrcCJ7XFJS5aw_HQf9qONoRe36kY1zhzDnlxtQmi0jgwTKLtiOr/exec';
const DONATION_URL = 'https://rzp.io/rzp/rUdBTvc';
const PENDING_REG_KEY = 'gitamrtaPendingRegistrationId';

interface FormState {
  name: string;
  age: string;
  mobile: string;
  gender: 'Male' | 'Female' | '';
  location: string;
}

const initialForm: FormState = { name: '', age: '', mobile: '', gender: '', location: '' };

function GitamrtaPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    `gitamrta-field__input${value.trim() ? ' filled' : ''}`;

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

  useEffect(() => {
    const syncPaymentStatus = async () => {
      const params = new URLSearchParams(window.location.search);
      const paidStatusRaw = (
        params.get('razorpay_payment_link_status') ||
        params.get('payment_status') ||
        params.get('status') ||
        ''
      ).toLowerCase();
      const paymentId = params.get('razorpay_payment_id') || '';
      const signature = params.get('razorpay_signature') || '';
      const amount = params.get('amount') || '';
      const registrationId =
        params.get('registrationId') || localStorage.getItem(PENDING_REG_KEY) || '';

      const shouldMarkPaid = paidStatusRaw === 'paid' || Boolean(paymentId);
      if (!shouldMarkPaid) return;

      if (!registrationId) {
        setError('Payment detected but registration id is missing. Please contact support.');
        return;
      }

      try {
        const result = await postToScript({
          action: 'markPaid',
          registrationId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          amount,
        });
        if (!result?.success) {
          throw new Error(result?.error || 'Failed to update payment status');
        }
        localStorage.removeItem(PENDING_REG_KEY);
        setSuccess('Payment received successfully. Your registration is now marked as paid.');
        setError('');
      } catch (err) {
        const msg = (err as any)?.message || 'Could not update payment status.';
        setError(msg);
      } finally {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    };

    void syncPaymentStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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

      const registrationId = result.registrationId as string;
      localStorage.setItem(PENDING_REG_KEY, registrationId);
      const redirectUrl = `${DONATION_URL}?registrationId=${encodeURIComponent(registrationId)}`;
      window.location.href = redirectUrl;
    } catch (err) {
      const msg = (err as any)?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="gitamrta-page">
      {/* Blurred poster background */}
      <div className="gitamrta-bg" style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/images/gitamrta-poster.jpeg)` }} />

      {/* Left Pane - Poster */}
      <div className="gitamrta-left" ref={leftRef}>
        <div className="gitamrta-left__poster-wrap">
          <img
            src="/images/gitamrta-poster.jpeg"
            alt="Bhagavad Gita in 18 Days - Course Poster"
            className="gitamrta-left__poster"
          />
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="gitamrta-right" ref={rightRef}>
        <div className="gitamrta-header">
          <h1 className="gitamrta-header__title">Register for Bhagavad Gita Course</h1>
          <p className="gitamrta-header__subtitle">
            Learn Bhagavad Gita in 18 Days — Live Interactive Sessions, Quizzes &amp; Free Course Material
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="gitamrta-form-card">
            <div className="gitamrta-form-grid">
              {/* Name */}
              <div className="gitamrta-field gitamrta-field--full">
                <label className="gitamrta-field__label">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  className={fieldClass(form.name)}
                  placeholder="Enter your full name"
                />
              </div>

              {/* Age */}
              <div className="gitamrta-field">
                <label className="gitamrta-field__label">Age *</label>
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
              <div className="gitamrta-field">
                <label className="gitamrta-field__label">Mobile Number *</label>
                <input
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => update('mobile', e.target.value)}
                  className={fieldClass(form.mobile)}
                  placeholder="10-digit number"
                />
              </div>

              {/* Gender */}
              <div className="gitamrta-field">
                <label className="gitamrta-field__label">Gender *</label>
                <div className={`gitamrta-gender-group${form.gender ? ' filled' : ''}`}>
                  <label className="gitamrta-gender-option">
                    <input
                      type="radio"
                      name="gender"
                      checked={form.gender === 'Male'}
                      onChange={() => update('gender', 'Male')}
                    />
                    <span>Male</span>
                  </label>
                  <label className="gitamrta-gender-option">
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
              <div className="gitamrta-field">
                <label className="gitamrta-field__label">Location / Area *</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                  className={fieldClass(form.location)}
                  placeholder="e.g. Deoghar, Jasidih"
                />
              </div>
            </div>

            {error && <div className="gitamrta-error">{error}</div>}
            {success && <div className="gitamrta-success">{success}</div>}

            <div className="gitamrta-submit-section">
              <button type="submit" className="gitamrta-submit-btn" disabled={submitting}>
                {submitting ? (
                  <>
                    <svg className="gitamrta-spinner" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Registering...
                  </>
                ) : (
                  <>Register &amp; Pay &rarr;</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GitamrtaPage;
