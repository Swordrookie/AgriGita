import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 || err.response?.status === 422) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
}

export const valveAPI = {
  getAll: () => api.get('/valves/'),
  get: (id) => api.get(`/valves/${id}`),
  create: (data) => api.post('/valves/', data),
  update: (id, data) => api.put(`/valves/${id}`, data),
  delete: (id) => api.delete(`/valves/${id}`),
  toggle: (id) => api.post(`/valves/${id}/toggle`),
  getLogs: (id) => api.get(`/valves/${id}/logs`),
}

export const wellAPI = {
  getAll: () => api.get('/wells/'),
  get: (id) => api.get(`/wells/${id}`),
  create: (data) => api.post('/wells/', data),
  update: (id, data) => api.put(`/wells/${id}`, data),
  delete: (id) => api.delete(`/wells/${id}`),
}

export const pipelineAPI = {
  getAll: () => api.get('/pipelines/'),
  get: (id) => api.get(`/pipelines/${id}`),
  create: (data) => api.post('/pipelines/', data),
  update: (id, data) => api.put(`/pipelines/${id}`, data),
  delete: (id) => api.delete(`/pipelines/${id}`),
}

export const alertAPI = {
  getAll: () => api.get('/alerts/'),
  getUnreadCount: () => api.get('/alerts/unread'),
  markRead: (id) => api.post(`/alerts/${id}/read`),
  markAllRead: () => api.post('/alerts/read-all'),
  delete: (id) => api.delete(`/alerts/${id}`),
}

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
}

export const aiAPI = {
  getSuggestions: () => api.get('/ai/suggestions'),
  getProductRecommendations: () => api.get('/ai/product-recommendations'),
}

export default api
