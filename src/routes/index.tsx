import { createFileRoute } from "@tanstack/react-router";
import { AppProvider, useApp } from "@/lib/app-context";
import { AppHeader } from "@/components/AppHeader";
import { LandingPage } from "@/components/LandingPage";
import { LoadingState } from "@/components/LoadingState";
import { ResultPage } from "@/components/ResultPage";

export const Route = createFileRoute("/")({ component: RootComponent });

function RootComponent() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <AppContent />
      </div>
    </AppProvider>
  );
}

function AppContent() {
  const { step } = useApp();

  switch (step) {
    case 'loading':
      return <LoadingState />;
    case 'result':
      return <ResultPage />;
    case 'landing':
    default:
      return <LandingPage />;
  }
}
