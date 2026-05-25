import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">404</p>
        <h1 className="mt-2 font-serif text-5xl italic text-ink">Lost the trail</h1>
        <p className="mt-3 text-sm text-muted">
          The page you tried to reach doesn't exist, or you don't have access to it.
        </p>
        <div className="mt-6">
          <Link to="/dashboard">
            <Button variant="secondary">Back to dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
