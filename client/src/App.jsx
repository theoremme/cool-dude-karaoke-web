import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PlaylistProvider } from './contexts/PlaylistContext';
import { AuthProvider, useAuth } from './hooks/useAuth';
import AuthPage from './components/AuthPage';
import RoomLobby from './components/RoomLobby';
import HostDashboard from './components/HostDashboard';
import GuestView from './components/GuestView';
import CloseoutPage from './components/CloseoutPage';
import './styles/App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoomLobby />
          </ProtectedRoute>
        }
      />
      <Route
        path="/host/:inviteCode"
        element={
          <ProtectedRoute>
            <PlaylistProvider>
              <HostDashboard />
            </PlaylistProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:inviteCode"
        element={
          <PlaylistProvider>
            <GuestView />
          </PlaylistProvider>
        }
      />
      <Route
        path="/closeout/:inviteCode"
        element={<CloseoutPage />}
      />
    </Routes>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
