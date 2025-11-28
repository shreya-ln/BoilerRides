import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Rides from "./pages/Rides";
import CreateRide from "./pages/CreateRide";
import ColorShowcase from "./pages/ColorShowcase";
import NotFound from "./pages/NotFound";
import ViewProfile from "./pages/ViewProfile";
import RequestRide from "./pages/RequestRide";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/profiles/:id" element={
              <ProtectedRoute requireProfile>
                <ViewProfile />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute requireProfile>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/rides" element={
              <ProtectedRoute requireProfile>
                <Rides />
              </ProtectedRoute>
            } />
            <Route path="/rides/create" element={
              <ProtectedRoute requireProfile>
                <CreateRide />
              </ProtectedRoute>
            } />
            <Route path="/ride-requests/new" element={
              <ProtectedRoute requireProfile>
                <RequestRide />
              </ProtectedRoute>
            } />
            <Route path="/colors" element={
              <ProtectedRoute>
                <ColorShowcase />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
