import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  UserCheck,
  Mail,
  Lock,
  User,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  updateUsuarioRol,
} from '../api/api';
import { useAuth } from '../context/AuthContext';

export const UsersPage = () => {
  const { user: currentUser } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  // Modal para Crear Usuario
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [nuevoRol, setNuevoRol] = useState('Almacenero'); // Únicamente 'Almacenero' o 'Administrador'
  const [guardandoCrear, setGuardandoCrear] = useState(false);
  const [errorModalCrear, setErrorModalCrear] = useState(null);

  // Modal para Editar Usuario
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRol, setEditRol] = useState('Almacenero');
  const [guardandoEditar, setGuardandoEditar] = useState(false);
  const [errorModalEditar, setErrorModalEditar] = useState(null);

  // Estado de actualización rápida de rol
  const [actualizandoId, setActualizandoId] = useState(null);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsuarios();
      setUsuarios(data || []);
    } catch (err) {
      setError(err.message || 'Error al obtener la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // Crear Usuario
  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    try {
      setGuardandoCrear(true);
      setErrorModalCrear(null);
      await createUsuario({
        nombre: nuevoNombre.trim(),
        email: nuevoEmail.trim().toLowerCase(),
        password: nuevoPassword,
        rol_nombre: nuevoRol,
      });

      setModalCrearAbierto(false);
      setNuevoNombre('');
      setNuevoEmail('');
      setNuevoPassword('');
      setNuevoRol('Almacenero');
      setExito('Usuario creado exitosamente.');
      setTimeout(() => setExito(null), 4000);
      cargarUsuarios();
    } catch (err) {
      setErrorModalCrear(err.message || 'Error al crear la cuenta de usuario.');
    } finally {
      setGuardandoCrear(false);
    }
  };

  // Abrir Modal Editar
  const handleAbrirEditar = (u) => {
    setUsuarioEditar(u);
    setEditNombre(u.nombre);
    setEditEmail(u.email);
    setEditPassword('');
    setEditRol(u.rol_nombre === 'Administrador' ? 'Administrador' : 'Almacenero');
    setErrorModalEditar(null);
    setModalEditarAbierto(true);
  };

  // Guardar Cambios de Usuario
  const handleEditarUsuario = async (e) => {
    e.preventDefault();
    if (!usuarioEditar) return;
    try {
      setGuardandoEditar(true);
      setErrorModalEditar(null);

      const payload = {
        nombre: editNombre.trim(),
        email: editEmail.trim().toLowerCase(),
        rol_nombre: editRol,
      };

      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      await updateUsuario(usuarioEditar.id, payload);

      setModalEditarAbierto(false);
      setExito(`Usuario "${editNombre}" actualizado correctamente.`);
      setTimeout(() => setExito(null), 4000);
      cargarUsuarios();
    } catch (err) {
      setErrorModalEditar(err.message || 'Error al actualizar el usuario.');
    } finally {
      setGuardandoEditar(false);
    }
  };

  // Eliminar Usuario
  const handleEliminarUsuario = async (u) => {
    if (u.id === currentUser?.id) {
      alert('No puede eliminar su propia cuenta activa.');
      return;
    }

    if (!window.confirm(`¿Está seguro de eliminar permanentemente la cuenta de "${u.nombre}"?`)) {
      return;
    }

    try {
      setError(null);
      await deleteUsuario(u.id);
      setExito(`Usuario "${u.nombre}" eliminado correctamente.`);
      setTimeout(() => setExito(null), 4000);
      cargarUsuarios();
    } catch (err) {
      setError(err.message || 'Error al eliminar el usuario.');
      setTimeout(() => setError(null), 6000);
    }
  };

  // Cambiar rol de usuario desde el dropdown
  const handleCambiarRol = async (usuario, nuevoRolNombre) => {
    if (usuario.id === currentUser?.id && nuevoRolNombre !== 'Administrador') {
      if (
        !window.confirm(
          '¿Está seguro de revocar sus propios privilegios de Administrador?'
        )
      ) {
        return;
      }
    }

    try {
      setActualizandoId(usuario.id);
      setError(null);
      await updateUsuarioRol(usuario.id, {
        rol_nombre: nuevoRolNombre,
      });
      setExito(`Rol de ${usuario.nombre} actualizado a ${nuevoRolNombre}.`);
      setTimeout(() => setExito(null), 4000);
      cargarUsuarios();
    } catch (err) {
      setError(err.message || 'Error al actualizar el rol del usuario.');
    } finally {
      setActualizandoId(null);
    }
  };

  const totalAdmins = usuarios.filter((u) => u.rol_nombre === 'Administrador').length;
  const totalAlmaceneros = usuarios.filter((u) => u.rol_nombre !== 'Administrador').length;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1E40AF] uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4 text-[#1E40AF]" />
            Control de Accesos • Solo Administrador
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Gestión de Usuarios y Roles
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Administración de cuentas autorizadas para personal de almacén y supervisores
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={cargarUsuarios}
            className="min-h-[40px] px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#0284C7]" />
            Refrescar
          </button>

          <button
            type="button"
            onClick={() => {
              setErrorModalCrear(null);
              setModalCrearAbierto(true);
            }}
            className="min-h-[40px] px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Alertas globales de éxito o error */}
      {exito && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-xs font-mono text-[#16A34A] flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4" />
          {exito}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-mono text-[#DC2626] flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Tarjetas de resumen de usuarios */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <div className="text-xs font-mono text-[#64748B]">Total Cuentas</div>
          <div className="text-2xl font-bold font-mono text-[#0F172A] mt-1">
            {usuarios.length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <div className="text-xs font-mono text-[#1E40AF]">Administradores</div>
          <div className="text-2xl font-bold font-mono text-[#1E40AF] mt-1">
            {totalAdmins}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <div className="text-xs font-mono text-[#16A34A]">Almaceneros</div>
          <div className="text-2xl font-bold font-mono text-[#16A34A] mt-1">
            {totalAlmaceneros}
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-[#64748B]">
            Cargando usuarios...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[#64748B] font-mono uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Usuario</th>
                  <th className="py-3.5 px-4">Correo Electrónico</th>
                  <th className="py-3.5 px-4">Rol Asignado</th>
                  <th className="py-3.5 px-4">Fecha de Alta</th>
                  <th className="py-3.5 px-4 text-center">Cambiar Rol</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {usuarios.map((u) => {
                  const esAdmin = u.rol_nombre === 'Administrador';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                            {u.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-[#0F172A]">
                              {u.nombre}
                            </div>
                            {u.id === currentUser?.id && (
                              <span className="text-[10px] font-mono text-[#0284C7] font-semibold">
                                (Tu sesión actual)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#64748B]">
                        {u.email}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono font-bold text-[11px] ${
                            esAdmin
                              ? 'bg-blue-100 text-[#1E40AF]'
                              : 'bg-green-100 text-[#16A34A]'
                          }`}
                        >
                          {esAdmin ? (
                            <Shield className="w-3 h-3" />
                          ) : (
                            <UserCheck className="w-3 h-3" />
                          )}
                          {esAdmin ? 'Administrador' : 'Almacenero'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#64748B]">
                        {u.creado_en
                          ? new Date(u.creado_en).toLocaleDateString('es-PE')
                          : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <select
                          disabled={actualizandoId === u.id}
                          value={esAdmin ? 'Administrador' : 'Almacenero'}
                          onChange={(e) => handleCambiarRol(u, e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white font-mono text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E40AF] cursor-pointer disabled:opacity-50"
                        >
                          <option value="Administrador">Administrador</option>
                          <option value="Almacenero">Almacenero</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAbrirEditar(u)}
                            className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-100 text-[#1E40AF] font-semibold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Editar Usuario"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          {u.id !== currentUser?.id && (
                            <button
                              type="button"
                              onClick={() => handleEliminarUsuario(u)}
                              className="px-2 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-[#DC2626] font-semibold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="Eliminar Usuario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL CREAR USUARIO
          ========================================================================= */}
      {modalCrearAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#1E40AF]" />
                Registrar Nuevo Usuario
              </h3>
              <button
                type="button"
                onClick={() => setModalCrearAbierto(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {errorModalCrear && (
              <div className="p-3 bg-red-50 text-xs text-[#DC2626] rounded-lg border border-red-200">
                {errorModalCrear}
              </div>
            )}

            <form onSubmit={handleCrearUsuario} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Ej: Carlos Mendoza"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={nuevoEmail}
                    onChange={(e) => setNuevoEmail(e.target.value)}
                    placeholder="almacen@stocklens.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                  Contraseña Inicial
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={nuevoPassword}
                    onChange={(e) => setNuevoPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                  Rol Asignado
                </label>
                <select
                  value={nuevoRol}
                  onChange={(e) => setNuevoRol(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                >
                  <option value="Almacenero">Almacenero (Recepción, Salidas e Inventario)</option>
                  <option value="Administrador">Administrador (Control Total + Dashboard)</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setModalCrearAbierto(false)}
                  className="flex-1 py-2.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoCrear}
                  className="flex-1 py-2.5 rounded-lg bg-[#1E40AF] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {guardandoCrear ? 'Creando cuenta...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL EDITAR USUARIO
          ========================================================================= */}
      {modalEditarAbierto && usuarioEditar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#0284C7]" />
                Editar Datos de Usuario
              </h3>
              <button
                type="button"
                onClick={() => setModalEditarAbierto(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {errorModalEditar && (
              <div className="p-3 bg-red-50 text-xs text-[#DC2626] rounded-lg border border-red-200">
                {errorModalEditar}
              </div>
            )}

            <form onSubmit={handleEditarUsuario} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                  Nueva Contraseña (Opcional)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Dejar en blanco para mantener la actual"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                  Rol Asignado
                </label>
                <select
                  value={editRol}
                  onChange={(e) => setEditRol(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                >
                  <option value="Almacenero">Almacenero</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setModalEditarAbierto(false)}
                  className="flex-1 py-2.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEditar}
                  className="flex-1 py-2.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {guardandoEditar ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
