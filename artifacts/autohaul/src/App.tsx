import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthGuard } from "@/components/AuthGuard";
import { ScrollToTop } from "@/components/ScrollToTop";

import Home from "./pages/Home";
import Shipments from "./pages/Shipments";
import ShipmentDetail from "./pages/ShipmentDetail";
import CreateShipment from "./pages/CreateShipment";
import DashboardRouter from "./pages/dashboard/DashboardRouter";
import BookingDetail from "./pages/BookingDetail";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import Terms from "./pages/Terms";
import UserProfile from "./pages/UserProfile";
import DriverRoutes from "./pages/DriverRoutes";
import SavedDrivers from "./pages/SavedDrivers";
import VerifyTwoFactor from "./pages/VerifyTwoFactor";
import Support from "./pages/Support";
import Privacy from "./pages/Privacy";
import BackhaulBoard from "./pages/Backhaul";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/shipments">{() => <AuthGuard><Shipments /></AuthGuard>}</Route>
      <Route path="/shipments/:id" component={ShipmentDetail} />
      <Route path="/post-load" component={CreateShipment} />
      <Route path="/dashboard" component={DashboardRouter} />
      <Route path="/bookings/:id" component={BookingDetail} />
      <Route path="/messages" component={Messages} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/terms" component={Terms} />
      <Route path="/driver-routes" component={DriverRoutes} />
      <Route path="/saved-drivers" component={SavedDrivers} />
      <Route path="/verify-2fa" component={VerifyTwoFactor} />
      <Route path="/support" component={Support} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/users/:userId" component={UserProfile} />
      <Route path="/backhaul" component={BackhaulBoard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ScrollToTop />
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
