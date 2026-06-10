import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import CitizenDashboard from "./pages/CitizenDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRegister from "./pages/AdminRegister";
import GovernmentDashboard from "./pages/GovernmentDashboard";
import AgentDashboard from "./pages/AgentDashboard";
import SchemeDetail from "./pages/SchemeDetail";
import ApplyScheme from "./pages/ApplyScheme";
import AgentHistory from "./pages/AgentHistory";
import NotFound from "./pages/NotFound";
import AIChatbot from "./components/AIChatbot";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
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
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'government') return <Navigate to="/government" replace />;
    return <Navigate to="/dashboard" replace />;
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
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'government') return <Navigate to="/government" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

import { useEffect } from 'react';
import { io } from 'socket.io-client';

function AppRoutes() {
  useEffect(() => {
    // Listen for real-time scraped schemes across the entire app
    const socket = io("http://localhost:3001");
    
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
        <Route path="/dashboard" element={<Navigate to="/discover" replace />} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/government" element={<ProtectedRoute allowedRoles={['government']}><GovernmentDashboard /></ProtectedRoute>} />
        <Route path="/agent" element={<ProtectedRoute allowedRoles={['admin', 'agent']}><AgentDashboard /></ProtectedRoute>} />
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
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
