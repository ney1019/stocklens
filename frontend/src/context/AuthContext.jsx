import React, { createContext, useContext, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('stocklens_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  const loginUser = (userData) => {
    setUser(userData);
    localStorage.setItem('stocklens_user', JSON.stringify(userData));
  };

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('stocklens_user');
  };

  // Helpers de validación estricta de roles
  const isAdmin = user?.rol_nombre === 'Administrador' || user?.rol_id === 1;
  const isAlmacenero =
    user?.rol_nombre === 'Almacenero' ||
    user?.rol_nombre === 'Operador' ||
    user?.rol_id === 2;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginUser,
        logoutUser,
        isAdmin,
        isAlmacenero,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};

/**
 * Componente para proteger rutas según estado de autenticación y rol.
 * Si un Almacenero intenta entrar a una ruta no permitida (ej. /dashboard o /usuarios),
 * es redirigido automáticamente a /escaner.
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.includes(user?.rol_nombre);
    if (!hasRole) {
      // Redirección estricta según el rol del usuario
      const target =
        user?.rol_nombre === 'Administrador' || user?.rol_id === 1
          ? '/dashboard'
          : '/escaner';
      return <Navigate to={target} replace />;
    }
  }

  return children;
};
