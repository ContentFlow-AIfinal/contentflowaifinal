import { useT } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { locale, setLocale } = useT();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "en" ? "bn" : "en")}
      title="Toggle language"
      className="gap-1"
    >
      <Languages className="size-4" />
      <span className="text-xs font-medium uppercase">{locale === "en" ? "বাংলা" : "EN"}</span>
    </Button>
  );
}
