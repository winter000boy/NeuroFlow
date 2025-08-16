import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { store } from './store';
import { queryClient } from './store/queryClient';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import ToastManager from './components/common/ToastManager';
import Layout from './components/layout/Layout';
import './App.css';

// Lazy load components for code splitting
const Dashboard = React.lazy(() => import('./features/dashboard/Dashboard'));
const Login = React.lazy(() => import('./features/auth/Login'));
const Register = React.lazy(() => import('./features/auth/Register'));
const Workflows = React.lazy(() => import('./features/workflows/Workflows'));
const Executions = React.lazy(() => import('./features/executions/Executions'));

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ToastProvider>
              <Router>
                <AuthProvider>
                  <div className="App">
                    <Suspense 
                      fallback={
                        <LoadingSpinner 
                          size="lg" 
                          text="Loading..." 
                          fullScreen 
                        />
                      }
                    >
                      <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route
                          path="/"
                          element={
                            <ProtectedRoute>
                              <Layout />
                            </ProtectedRoute>
                          }
                        >
                          <Route index element={<Dashboard />} />
                          <Route path="workflows" element={<Workflows />} />
                          <Route path="executions" element={<Executions />} />
                        </Route>
                      </Routes>
                    </Suspense>
                    <ToastManager />
                  </div>
                </AuthProvider>
              </Router>
            </ToastProvider>
          </ThemeProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
