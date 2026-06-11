import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import CitizenDashboard from "./pages/CitizenDashboard";
import ApplicationTracking from "./pages/ApplicationTracking";
import ApplicationDetails from "./pages/ApplicationDetails";
import SavedSchemes from "./pages/SavedSchemes";
import ApplicationHistory from "./pages/ApplicationHistory";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRegister from "./pages/AdminRegister";
import GovernmentDashboard from "./pages/GovernmentDashboard";
import GovernmentLogin from "./pages/GovernmentLogin";
import AgentDashboard from "./pages/AgentDashboard";
import AgentLogin from "./pages/AgentLogin";
import AgentSubscription from "./pages/AgentSubscription";
import Payment from "./pages/Payment";
import SchemeDetail from "./pages/SchemeDetail";
import ApplyScheme from "./pages/ApplyScheme";
import AgentHistory from "./pages/AgentHistory";
import NotFound from "./pages/NotFound";
import AIChatbot from "./components/AIChatbot";
import Discover from "./pages/Discover";
import Eligibility from "./pages/Eligibility";
import Profile from "./pages/Profile";
import AllSchemes from "./pages/AllSchemes";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin' || user.role === 'agent') return <Navigate to="/agent/dashboard" replace />;
    if (user.role === 'government') return <Navigate to="/government/dashboard" replace />;
    return <Navigate to="/eligibility" replace />;
  }

  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === 'admin' || user.role === 'agent') return <Navigate to="/agent/dashboard" replace />;
    if (user.role === 'government') return <Navigate to="/government/dashboard" replace />;
    return <Navigate to="/eligibility" replace />;
  }

  return <>{children}</>;
}

import { useEffect } from 'react';
import { io } from 'socket.io-client';

function AppRoutes() {
  useEffect(() => {
    // Listen for real-time scraped schemes across the entire app
    const WS_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
    const socket = io(WS_URL);
    
    socket.on('NEW_SCHEME_SCRAPED', (newSchemes: any[]) => {
      console.log('Real-time scraped schemes received:', newSchemes);
      // Invalidate schemes cache to instantly trigger re-fetch for citizens, agents, and government
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/admin/register" element={<GuestRoute><AdminRegister /></GuestRoute>} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/schemes" element={<AllSchemes />} />
        <Route path="/eligibility" element={<Eligibility />} />
        <Route path="/dashboard" element={<Navigate to="/discover" replace />} />
        <Route path="/citizen" element={<ProtectedRoute><CitizenDashboard /></ProtectedRoute>} />
        <Route path="/tracking" element={<ProtectedRoute><ApplicationTracking /></ProtectedRoute>} />
        <Route path="/tracking/:applicationId" element={<ProtectedRoute><ApplicationDetails /></ProtectedRoute>} />
        <Route path="/saved-schemes" element={<ProtectedRoute><SavedSchemes /></ProtectedRoute>} />
        <Route path="/applications" element={<ProtectedRoute><ApplicationHistory /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/government/login" element={<GuestRoute><GovernmentLogin /></GuestRoute>} />
        <Route path="/agent/login" element={<GuestRoute><AgentLogin /></GuestRoute>} />
        <Route path="/government/dashboard" element={<ProtectedRoute allowedRoles={['government']}><GovernmentDashboard /></ProtectedRoute>} />
        <Route path="/agent/dashboard" element={<ProtectedRoute allowedRoles={['agent', 'admin']}><AgentDashboard /></ProtectedRoute>} />
        <Route path="/agent-subscription" element={<ProtectedRoute allowedRoles={['agent', 'admin']}><AgentSubscription /></ProtectedRoute>} />
        <Route path="/payment/:planKey" element={<ProtectedRoute allowedRoles={['agent', 'admin']}><Payment /></ProtectedRoute>} />
        <Route path="/agent-history" element={<ProtectedRoute allowedRoles={['agent', 'admin']}><AgentHistory /></ProtectedRoute>} />
        <Route path="/scheme/:id" element={<SchemeDetail />} />
        <Route path="/apply/:id" element={<ApplyScheme />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/government/agent/:id" element={<ProtectedRoute allowedRoles={['government', 'admin']}><AgentHistory /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <AIChatbot />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
