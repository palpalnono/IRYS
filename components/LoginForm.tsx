'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { login } from '@/app/actions/auth';

type LoginState = {
  error: boolean;
  kind?: 'wrong' | 'empty' | 'network' | 'throttled';
  // Seconds the server told us to wait before retrying. Only set when
  // kind === 'throttled'.
  retryAfter?: number;
  // Counter that ticks on every server response so React re-fires effects
  // even when the same wrong-password rejection comes back twice in a row.
  attempt?: number;
};

const INITIAL: LoginState = { error: false };

// Client-side bridge around the server action. Catches transport / network
// errors and surfaces them as a distinct error kind so the UI can write the
// right copy. Re-throws Next's redirect signal so success still navigates.
async function loginAction(prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get('password') ?? '');
  if (password.length === 0) {
    return { error: true, kind: 'empty', attempt: (prev.attempt ?? 0) + 1 };
  }
  try {
    const res = await login(prev, formData);
    // login() returns { error: true, ...} on bad password / throttle and
    // otherwise redirects.
    if (res && (res as { error?: boolean }).error) {
      const r = res as { error: true; kind?: string; retryAfter?: number };
      if (r.kind === 'throttled') {
        return {
          error: true,
          kind: 'throttled',
          retryAfter: r.retryAfter,
          attempt: (prev.attempt ?? 0) + 1,
        };
      }
      return { error: true, kind: 'wrong', attempt: (prev.attempt ?? 0) + 1 };
    }
    return { error: false, attempt: (prev.attempt ?? 0) + 1 };
  } catch (err: unknown) {
    // Re-throw Next's redirect so success still navigates.
    const digest = (err as { digest?: string } | null)?.digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    return { error: true, kind: 'network', attempt: (prev.attempt ?? 0) + 1 };
  }
}

function ERROR_COPY(kind: LoginState['kind'], retryAfter?: number): string {
  if (kind === 'empty') return 'Enter the dashboard password.';
  if (kind === 'network') return "Couldn't reach IRYS. Try again.";
  if (kind === 'throttled') {
    const s = Math.max(1, retryAfter ?? 60);
    return `Too many attempts. Try again in ${s}s.`;
  }
  return 'Incorrect password.';
}

function SubmitButton({ pending }: { pending: boolean }) {
  // Read pending from the form context so the parent doesn't have to.
  // Falls back to a passed-in flag for tests / non-form contexts.
  const status = useFormStatus();
  const isPending = status.pending || pending;
  return (
    <button
      className={`pw-btn${isPending ? ' pw-btn-pending' : ''}`}
      type="submit"
      disabled={isPending}
      aria-busy={isPending}
    >
      {isPending ? 'Verifying…' : 'Unlock'}
    </button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useFormState(loginAction, INITIAL);
  const [shake, setShake] = useState(false);

  // Trigger the shake on every wrong-password rejection — but never on the
  // empty/network kinds (those rejections are about absence, not wrongness).
  // Keying off `attempt` ensures repeated identical rejections still fire.
  useEffect(() => {
    if (state.error && state.kind === 'wrong') {
      setShake(true);
      const t = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(t);
    }
  }, [state.attempt, state.error, state.kind]);

  const errorMessage = state.error ? ERROR_COPY(state.kind, state.retryAfter) : null;

  return (
    <div className="pw-overlay">
      <form
        action={formAction}
        className={`pw-modal${shake ? ' pw-shake' : ''}`}
        noValidate
      >
        <div className="pw-brand">
          <div className="pw-brand-mark">
            <Image
              src="/intecs-logo.png"
              alt="INTECS"
              width={96}
              height={36}
              priority
              style={{ display: 'block' }}
            />
          </div>
          <div className="pw-brand-text">
            <div className="pw-wordmark">IRYS</div>
            <div className="pw-tagline">Fleet uptime · Intecs construction equipment</div>
          </div>
        </div>

        <label htmlFor="pw-input" className="pw-label">
          Dashboard password
        </label>
        <input
          id="pw-input"
          className={`pw-input${state.error ? ' pw-input-error' : ''}`}
          type="password"
          name="password"
          placeholder="Enter password"
          autoFocus
          autoComplete="current-password"
          required
          minLength={1}
          aria-invalid={state.error || undefined}
          aria-describedby={errorMessage ? 'pw-error' : undefined}
        />
        {errorMessage && (
          <p id="pw-error" className="pw-error-msg" role="alert" aria-live="polite">
            {errorMessage}
          </p>
        )}
        <SubmitButton pending={false} />

        <p className="pw-footer-note">
          Authorized operators only · Sessions expire on browser close
        </p>
      </form>
    </div>
  );
}
