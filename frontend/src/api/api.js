import axios from 'axios';

const api = axios.create({
  
  baseURL: "http://127.0.0.1:8000",
  timeout: 30000,
});

// Interceptor para agregar headers o manejo global si se requiere
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extraer mensaje de error legible del backend si está disponible
    const mensaje = error.response?.data?.detail || error.message || 'Error de conexión con el servidor';
    return Promise.reject(new Error(mensaje));
  }
);

// ==============================================================================
// AUTENTICACIÓN Y USUARIOS
// ==============================================================================

export const login = async (credentials) => {
  const { data } = await api.post('/api/login', credentials);
  return data;
};

export const getUsuarios = async () => {
  const { data } = await api.get('/api/usuarios');
  return data;
};

export const createUsuario = async (userData) => {
  const { data } = await api.post('/api/usuarios', userData);
  return data;
};

export const updateUsuarioRol = async (id, rolData) => {
  const { data } = await api.patch(`/api/usuarios/${id}/rol`, rolData);
  return data;
};

// ==============================================================================
// CATEGORÍAS Y PRODUCTOS
// ==============================================================================

export const getCategorias = async () => {
  const { data } = await api.get('/api/categorias');
  return data;
};

export const getProductos = async () => {
  const { data } = await api.get('/api/productos');
  return data;
};

export const createProducto = async (productoData) => {
  const { data } = await api.post('/api/productos', productoData);
  return data;
};

export const updateProducto = async (id, productoData) => {
  const { data } = await api.put(`/api/productos/${id}`, productoData);
  return data;
};

// ==============================================================================
// VISIÓN ARTIFICIAL (YOLO) Y VALIDACIÓN HITL
// ==============================================================================

export const escanearImagen = async (formData) => {
  const { data } = await api.post('/api/scan', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const confirmarEscaneo = async (escaneoId, items) => {
  const { data } = await api.post(`/api/scan/${escaneoId}/confirmar`, { items });
  return data;
};

export const cancelarEscaneo = async (escaneoId) => {
  const { data } = await api.post(`/api/scan/${escaneoId}/cancelar`);
  return data;
};

// ==============================================================================
// HISTORIAL Y DASHBOARD
// ==============================================================================

export const getEscaneos = async () => {
  const { data } = await api.get('/api/escaneos');
  return data;
};

export const getDashboardStats = async () => {
  const { data } = await api.get('/api/dashboard/stats');
  return data;
};

export default api;
