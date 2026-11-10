
import axios from 'axios'
axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: "https://movieflex99.onrender.com/api",
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api
