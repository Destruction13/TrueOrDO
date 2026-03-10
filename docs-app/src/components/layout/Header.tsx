import { Link } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '../../contexts/LanguageContext';
import './Header.css';

interface HeaderProps {
  className?: string;
}

export function Header({ className = '' }: HeaderProps) {
  const { translate } = useLanguage();
  
  return (
    <header className={`border-b border-border bg-card ${className}`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                TrueOrDO Docs
              </h1>
            </Link>
            
            <nav className="flex items-center gap-6">
              <Link to="/api" className="text-foreground hover:text-primary transition-colors">
                {translate('nav.api')}
              </Link>
              <Link to="/technical" className="text-foreground hover:text-primary transition-colors">
                {translate('nav.technical')}
              </Link>
              <Link to="/guides" className="text-foreground hover:text-primary transition-colors">
                {translate('nav.guides')}
              </Link>
              <Link to="/plan" className="text-foreground hover:text-primary transition-colors">
                {translate('nav.plan')}
              </Link>
            </nav>
          </div>
          
          <nav className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
