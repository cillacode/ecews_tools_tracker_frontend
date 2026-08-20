// Login page. Single-column centered card on a warm paper background.
// Two moments of personality:
//   1. The serif italic in the brand mark — already there.
//   2. The headline — a soft, declarative welcome ("Sign in to PTIS").
//
// Form is react-hook-form + zod for inline validation. Errors surface under
// the inputs; submission errors surface as a toast plus an inline strip.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/Button';
import { Input, Field } from '../components/ui/Input';
import { Brand } from '../components/layout/Brand';
import { Footer } from '../components/layout/Footer';

const schema = z.object({
  identifier: z.string().trim().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const { signIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const from = location.state?.from?.pathname || '/dashboard';

  const onSubmit = async (data) => {
    setSubmitError('');
    try {
      const user = await signIn(data);
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}`);
      navigate(from, { replace: true });
    } catch (err) {
      const message = err.response?.data?.error || 'Could not sign in. Please try again.';
      setSubmitError(message);
    }
  };

  return (
    <div className="bg-paper grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-md animate-slide-up">
        {/* Brand mark above the card */}
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>

        <div className="rounded-2xl border border-line bg-white p-7 shadow-card md:p-9">
          <header className="mb-7">
            <h1 className="font-serif text-3xl italic leading-tight text-ink">Sign in</h1>
            <p className="mt-1.5 text-sm text-muted">
              Welcome back. Enter your credentials to continue.
            </p>
          </header>

          {submitError && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Field
              id="identifier"
              label="Username or email"
              required
              error={errors.identifier?.message}
            >
              <Input
                id="identifier"
                autoComplete="username"
                autoFocus
                placeholder="admin"
                error={errors.identifier}
                {...register('identifier')}
              />
            </Field>

            <Field
              id="password"
              label="Password"
              required
              error={errors.password?.message}
            >
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                error={errors.password}
                {...register('password')}
              />
            </Field>

            <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Trouble signing in? Contact your system administrator.
        </p>

        <Footer className="mt-4" />
      </div>
    </div>
  );
}
