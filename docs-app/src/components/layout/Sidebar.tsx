interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = '' }: SidebarProps) {
  return (
    <aside className={`w-64 border-r border-border bg-card ${className}`}>
      <div className="p-4">
        <nav>
          {/* Navigation tree will be populated later */}
          <p className="text-sm text-muted-foreground">Navigation</p>
        </nav>
      </div>
    </aside>
  );
}
