import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanLine,
  Boxes,
  ClipboardList,
  Users,
  LogOut,
  Shield,
  UserCheck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Layout = () => {
  const { user, logoutUser, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  // Ítems de navegación filtrados por rol
  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      adminOnly: true,
    },
    {
      to: '/escaner',
      label: 'Escaneo IA',
      icon: ScanLine,
      adminOnly: false,
      badge: 'YOLOv8',
    },
    {
      to: '/inventario',
      label: 'Inventario',
      icon: Boxes,
      adminOnly: false,
    },
    {
      to: '/historial',
      label: 'Historial',
      icon: ClipboardList,
      adminOnly: false,
    },
    {
      to: '/usuarios',
      label: 'Usuarios',
      icon: Users,
      adminOnly: true,
    },
  ];

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
      {/* =========================================================================
          BARRA LATERAL IZQUIERDA FIJA EN ESCRITORIO (240px)
          ========================================================================= */}
      <aside className="hidden md:flex md:w-[240px] md:flex-col md:fixed md:inset-y-0 z-40 bg-white border-r border-[#E2E8F0] shadow-xs">
        {/* Encabezado y Logo */}
        <div className="h-16 flex items-center px-5 border-b border-[#E2E8F0] gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1E40AF] flex items-center justify-center text-white shadow-xs">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-[#0F172A] leading-tight tracking-tight flex items-center gap-1.5">
              StockLens
              <span className="text-[10px] uppercase font-mono font-bold bg-[#0284C7]/10 text-[#0284C7] px-1.5 py-0.5 rounded">
                v2.0
              </span>
            </h1>
            <p className="text-[11px] text-[#64748B] font-medium flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3 text-[#DC2626]" /> Coca-Cola Perú
            </p>
          </div>
        </div>

        {/* Menú de Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-[#64748B] uppercase font-mono">
            Operaciones
          </div>

          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard' || item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#1E40AF] text-white shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? 'text-white' : 'text-[#64748B]'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#0284C7]/10 text-[#0284C7]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Tarjeta de Perfil y Botón de Salida */}
        <div className="p-3 border-t border-[#E2E8F0] bg-slate-50/70">
          <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-[#E2E8F0] shadow-2xs mb-2">
            <div className="w-8 h-8 rounded-full bg-[#1E40AF]/10 text-[#1E40AF] flex items-center justify-center font-bold text-xs">
              {isAdmin ? (
                <Shield className="w-4 h-4 text-[#1E40AF]" />
              ) : (
                <UserCheck className="w-4 h-4 text-[#16A34A]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#0F172A] truncate">
                {user?.nombre || 'Usuario'}
              </p>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    isAdmin ? 'bg-[#1E40AF]' : 'bg-[#16A34A]'
                  }`}
                />
                <span className="text-[11px] font-medium text-[#64748B] truncate">
                  {user?.rol_nombre || 'Operador'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            type="button"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* =========================================================================
          CONTENEDOR PRINCIPAL
          ========================================================================= */}
      <main className="flex-1 md:pl-[240px] flex flex-col min-h-screen pb-20 md:pb-6">
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>

      {/* =========================================================================
          BARRA DE NAVEGACIÓN INFERIOR FIJA EN MÓVILES (OPERACIÓN TÁCTIL)
          ========================================================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E2E8F0] shadow-lg">
        <nav className="flex items-center justify-around px-2 py-2">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard' || item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] rounded-lg text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'text-[#1E40AF] font-semibold'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <Icon
                        className={`w-5 h-5 ${
                          isActive ? 'text-[#1E40AF]' : 'text-[#64748B]'
                        }`}
                      />
                      {item.badge && (
                        <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-[#0284C7]" />
                      )}
                    </div>
                    <span className="mt-1 leading-tight">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
          <button
            onClick={handleLogout}
            type="button"
            className="flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] rounded-lg text-[11px] font-medium text-[#DC2626]"
          >
            <LogOut className="w-5 h-5" />
            <span className="mt-1 leading-tight">Salir</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Layout;
