import axios from 'axios';

const api = axios.create({
  
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  timeout: 45000,
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

export const updateUsuario = async (id, userData) => {
  const { data } = await api.put(`/api/usuarios/${id}`, userData);
  return data;
};

export const updateUsuarioRol = async (id, rolData) => {
  const { data } = await api.patch(`/api/usuarios/${id}/rol`, rolData);
  return data;
};

export const deleteUsuario = async (id) => {
  const { data } = await api.delete(`/api/usuarios/${id}`);
  return data;
};

// ==============================================================================
// CATEGORÍAS Y PRODUCTOS (EN PAQUETES)
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

export const deleteProducto = async (id) => {
  const { data } = await api.delete(`/api/productos/${id}`);
  return data;
};

// ==============================================================================
// ESCANEO VOLUMÉTRICO Y VALIDACIÓN OPERATIVA DE INGRESO
// ==============================================================================

export const escanearImagen = async (formData) => {
  const { data } = await api.post('/api/escanear', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const confirmarEscaneo = async (escaneoId, items) => {
  const { data } = await api.post(`/api/escanear/${escaneoId}/confirmar`, { items });
  return data;
};

export const cancelarEscaneo = async (escaneoId) => {
  const { data } = await api.post(`/api/escanear/${escaneoId}/cancelar`);
  return data;
};

// ==============================================================================
// SALIDAS / DESPACHOS POR BOLETA O FACTURA PDF
// ==============================================================================

export const procesarPdfSalida = async (formData) => {
  const { data } = await api.post('/api/salidas/procesar-pdf', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const confirmarSalida = async (salidaData) => {
  const { data } = await api.post('/api/salidas/confirmar', salidaData);
  return data;
};

export const getSalidas = async () => {
  const { data } = await api.get('/api/salidas');
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
