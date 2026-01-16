import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Formulario from './components/Formulario';
import Dashboard from './components/Dashboard';

// Componente para proteger rutas (versión Javascript puro)
const ProtectedRoute = ({ children }) => {
  const role = localStorage.getItem('role');
  if (!role) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const App = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50 font-sans">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/formulario"
            element={
              <ProtectedRoute>
                <Formulario />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;