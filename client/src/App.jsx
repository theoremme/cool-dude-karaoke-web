import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PlaylistProvider } from './contexts/PlaylistContext';
import { AuthProvider, useAuth } from './hooks/useAuth';
import AuthPage from './components/AuthPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import AdminPage from './components/AdminPage';
import RoomLobby from './components/RoomLobby';
import HostDashboard from './components/HostDashboard';
import GuestView from './components/GuestView';
import CloseoutPage from './components/CloseoutPage';
import PopoutPlayer from './components/PopoutPlayer';
import PlayerLoading from './components/PlayerLoading';
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
        path="/reset-password/:token"
        element={user ? <Navigate to="/" replace /> : <ResetPasswordPage />}
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
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
      <Route path="/player" element={<PopoutPlayer />} />
      <Route path="/player-loading" element={<PlayerLoading />} />
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
