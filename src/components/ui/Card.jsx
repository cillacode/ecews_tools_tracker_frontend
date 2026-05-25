import { cn } from '../../lib/utils';

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn('rounded-xl border border-line bg-white shadow-soft', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, action }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 border-b border-line px-5 py-4', className)}>
      <div>{children}</div>
      {action}
    </div>
  );
}

export function CardTitle({ className, children }) {
  return <h3 className={cn('text-base font-semibold text-ink', className)}>{children}</h3>;
}

export function CardDescription({ className, children }) {
  return <p className={cn('text-sm text-muted', className)}>{children}</p>;
}

export function CardBody({ className, children }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
