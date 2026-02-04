import React, { Suspense, lazy, useEffect, useState, createContext, useContext } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import SuspenseProgress from "@/components/SuspenseProgress";
import GlobalLoadingBar from "@/components/GlobalLoadingBar";
import EntryAnimation from "@/components/EntryAnimation";
import { I18nProvider } from "@/i18n";

// Lazy load pages for better initial load performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Research = lazy(() => import("./pages/Research"));
const Settings = lazy(() => import("./pages/Settings"));
const GlobalSummary = lazy(() => import("./pages/GlobalSummary"));

// Preload critical pages in background for instant navigation
const preloadPages = () => {
  setTimeout(() => {
    import("./pages/Index");
  }, 1000);
};

const queryClient = new QueryClient();

// Context for entry animation
interface EntryAnimationContextType {
  triggerEntryAnimation: () => void;
}
const EntryAnimationContext = createContext<EntryAnimationContextType | null>(null);
export const useEntryAnimation = () => useContext(EntryAnimationContext);

// Inner app with routing
const AppRoutes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showEntryAnimation, setShowEntryAnimation] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'playing' | 'fading' | 'done'>('done');

  const triggerEntryAnimation = () => {
    setShowEntryAnimation(true);
    setAnimationPhase('playing');
  };

  const handleAnimationComplete = () => {
    // Navigate first while animation is still fully opaque
    navigate('/');
    // Wait a bit for the page to render, then start fading
    setTimeout(() => {
      setAnimationPhase('fading');
    }, 100);
    // Complete fade out
    setTimeout(() => {
      setAnimationPhase('done');
      setShowEntryAnimation(false);
    }, 500);
  };

  return (
    <EntryAnimationContext.Provider value={{ triggerEntryAnimation }}>
      <Suspense fallback={<SuspenseProgress />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/research" element={<Research />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/summary" element={<GlobalSummary />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      {/* Entry animation overlay - persists across route changes */}
      {showEntryAnimation && (
        <div
          className="fixed inset-0 z-[100] transition-opacity duration-400"
          style={{ opacity: animationPhase === 'fading' ? 0 : 1 }}
        >
          <EntryAnimation onComplete={handleAnimationComplete} />
        </div>
      )}
    </EntryAnimationContext.Provider>
  );
};

const App = () => {
  useEffect(() => {
    preloadPages();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <GlobalLoadingBar />
          <Toaster />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
};

export default App;
