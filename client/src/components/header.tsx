import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/language";
import { LogOut } from "lucide-react";

interface HeaderProps {
  showLogout?: boolean;
  onLogout?: () => void;
}

export function Header({ showLogout = false, onLogout }: HeaderProps) {
  const { t } = useLanguage();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-blue-600">Couflex</h1>
          </div>

          {/* Right side navigation */}
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.href = '/admin'}
              className="text-slate-500 hover:text-slate-700"
            >
              {t('nav.admin')}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}