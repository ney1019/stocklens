import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanLine,
  Building2,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { login } from '../api/api';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { loginUser, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirección si ya cuenta con sesión activa
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.rol_nombre === 'Administrador' || user.rol_id === 1) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/escaner', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const emailLimpio = email.trim();
    if (!emailLimpio || !password) {
      setError('Por favor ingrese su correo electrónico y contraseña.');
      return;
    }

    try {
      setLoading(true);
      const data = await login({ email: emailLimpio, password });
      loginUser(data);

      // Redirección estricta según el rol validado por el backend
      if (data.rol_nombre === 'Administrador' || data.rol_id === 1) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/escaner', { replace: true });
      }
    } catch (err) {
      setError(
        err.message ||
          'No se pudo conectar con el servidor. Verifique su conexión o intente más tarde.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* =========================================================================
          COLUMNA IZQUIERDA: COMUNICACIÓN ORIENTADA A NEGOCIO Y OPERACIÓN (#0F172A)
          ========================================================================= */}
      <div className="w-full md:w-1/2 lg:w-7/12 bg-[#0F172A] text-white p-8 md:p-14 flex flex-col justify-between relative overflow-hidden">
        {/* Patrón de cuadrícula industrial sutil */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #0284C7 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Encabezado e Identidad */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xs border border-white/15 text-xs font-mono text-[#38BDF8] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
            Gestión Inteligente de Almacén • Coca-Cola Perú
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#1E40AF] border border-[#0284C7]/40 flex items-center justify-center text-white shadow-lg">
              <ScanLine className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                StockLens
              </h1>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#DC2626]" />
                Distribuidora Embotelladora Coca-Cola Perú
              </p>
            </div>
          </div>
        </div>

        {/* Mensaje central */}
        <div className="relative z-10 my-8 max-w-xl">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white leading-tight mb-4">
            Tu inventario al día,{' '}
            <span className="text-[#38BDF8]">en segundos y sin errores.</span>
          </h2>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-8">
            Registra el ingreso de paquetes y pallets con una sola foto, verifica las
            cantidades fácilmente y mantén el stock siempre sincronizado.
          </p>

          {/* Dos tarjetas operativas limpias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-[#38BDF8] mb-1.5 font-semibold text-xs font-mono">
                <Zap className="w-4 h-4" />
                Escaneo Rápido
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Toma una foto al lote y el sistema identifica automáticamente los
                paquetes y unidades.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-[#16A34A] mb-1.5 font-semibold text-xs font-mono">
                <CheckCircle2 className="w-4 h-4" />
                Control Seguro
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Revisa y confirma cada ingreso antes de actualizar el inventario
                general.
              </p>
            </div>
          </div>
        </div>

        {/* Pie de página izquierdo */}
        <div className="relative z-10 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>StockLens • Operaciones y Logística</span>
          <span className="text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
            Acceso Corporativo Seguro
          </span>
        </div>
      </div>

      {/* =========================================================================
          COLUMNA DERECHA: FORMULARIO REAL DE PRODUCCIÓN (#FFFFFF)
          ========================================================================= */}
      <div className="w-full md:w-1/2 lg:w-5/12 bg-white flex flex-col justify-center px-6 py-12 sm:px-12 md:px-14 lg:px-16">
        <div className="max-w-md w-full mx-auto">
          {/* Encabezado del Formulario */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              Iniciar Sesión
            </h2>
            <p className="text-sm text-[#64748B] mt-1">
              Ingrese su correo y contraseña asignados por la administración
            </p>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-[#DC2626] flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-2 font-mono"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@stocklens.com"
                  className="w-full pl-10 pr-3.5 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-2 font-mono"
              >
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] bg-[#1E40AF] hover:bg-[#1D4ED8] active:bg-blue-800 text-white font-semibold rounded-lg text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Información de soporte corporativo */}
          <div className="mt-10 pt-6 border-t border-[#E2E8F0] text-center">
            <p className="text-xs text-[#64748B]">
              ¿Problemas para acceder? Contacte con el supervisor o administrador del sistema en planta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
