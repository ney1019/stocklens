import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { ScannerPage } from './pages/ScannerPage';
import { SalidasPage } from './pages/SalidasPage';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { HistoryPage } from './pages/HistoryPage';
import { UsersPage } from './pages/UsersPage';

/**
 * Redirige la raíz "/" según el rol del usuario autenticado:
 * - Administrador -> /dashboard
 * - Almacenero -> /escaner
 */
const HomeRedirect = () => {
  const { user, isAdmin } = useAuth();
  if (isAdmin || user?.rol_nombre === 'Administrador' || user?.rol_id === 1) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/escaner" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Ruta Pública de Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas Privadas / Operativas dentro del Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Redirección automática de la raíz según rol */}
            <Route index element={<HomeRedirect />} />

            {/* 1. Dashboard (Exclusivo Administrador: Almacenero redirige a /escaner) */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute allowedRoles={['Administrador']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            {/* 2. Recepción y Escaneo de Pallets */}
            <Route path="escaner" element={<ScannerPage />} />
            <Route path="scan" element={<Navigate to="/escaner" replace />} />

            {/* 3. Salidas y Despachos por Boleta o Factura PDF */}
            <Route path="salidas" element={<SalidasPage />} />
            <Route path="despachos" element={<Navigate to="/salidas" replace />} />

            {/* 4. Inventario y Catálogo en Paquetes */}
            <Route path="inventario" element={<InventoryPage />} />
            <Route path="productos" element={<Navigate to="/inventario" replace />} />

            {/* 5. Historial de Operaciones */}
            <Route path="historial" element={<HistoryPage />} />
            <Route path="escaneos" element={<Navigate to="/historial" replace />} />

            {/* 6. Gestión de Usuarios y Roles (Exclusivo Administrador) */}
            <Route
              path="usuarios"
              element={
                <ProtectedRoute allowedRoles={['Administrador']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback general */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
