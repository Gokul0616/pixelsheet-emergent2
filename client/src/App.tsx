
import { Route, Switch, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { SpreadsheetPage } from '@/pages/spreadsheet-new';
import LandingPage from '@/pages/landing';
import { DashboardPage } from '@/pages/dashboard';
import { DashboardNew } from '@/pages/dashboard-new';
import '@/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Switch>
            <Route path="/" component={LandingPage} />
            <Route path="/login" component={LoginForm} />
            <Route path="/register" component={RegisterForm} />
            <Route path="/dashboard" component={DashboardNew} />
            <Route path="/spreadsheet/:id" component={SpreadsheetPage} />
            <Route>
              <Redirect to="/" />
            </Route>
          </Switch>
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}