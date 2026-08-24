// A quiet signature line. Kept low-contrast so it reads as a credit, not a
// banner. Used at the bottom of the authenticated shell and on the Login page.
export function Footer({ className = '' }) {
  const year = new Date().getFullYear();
  return (
    <footer className={`text-center text-xs text-muted ${className}`}>
      PTIS · Developed by <span className="font-medium text-ink/70">Nanatrix Information Systems</span> · © {year}
    </footer>
  );
}
