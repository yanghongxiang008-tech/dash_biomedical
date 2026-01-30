import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card px-6 py-8 text-center shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">404</p>
        <h1 className="mt-3 text-xl font-medium text-foreground">{t("Page not found")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("The page you are trying to reach does not exist or has moved.")}
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            {t("Go back")}
          </Button>
          <Button size="sm" onClick={() => navigate('/')}>
            {t("Home")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
