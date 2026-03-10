interface FooterProps {
  className?: string;
}

export function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`border-t border-border bg-card ${className}`}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>© 2024 TrueOrDO. All rights reserved.</p>
          <p>Premium Documentation System v1.0.0</p>
        </div>
      </div>
    </footer>
  );
}
