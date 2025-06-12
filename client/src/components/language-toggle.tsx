import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/language';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 bg-white hover:bg-slate-50 border-slate-200"
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">
        {language === 'en' ? '中文' : 'English'}
      </span>
    </Button>
  );
}