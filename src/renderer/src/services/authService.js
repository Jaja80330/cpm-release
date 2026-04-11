import axios from 'axios'

const api = axios.create({
  baseURL: 'http://158.220.90.1:3000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

/**
 * Authentifie l'utilisateur et retourne le token JWT.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string }>}
 */
export async function login(email, password) {
  try {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  } catch (error) {
    console.error('=== AUTH ERROR ===')
    console.error('Message    :', error.message)
    console.error('Code       :', error.code)
    console.error('Status     :', error.response?.status)
    console.error('Data       :', error.response?.data)
    console.error('Config URL :', error.config?.url)
    console.error('Base URL   :', error.config?.baseURL)
    if (error.toJSON) console.error('Full JSON  :', JSON.stringify(error.toJSON(), null, 2))
    throw error
  }
}

/**
 * Récupère le profil de l'utilisateur connecté (valide le token au démarrage).
 * @returns {Promise<object>}
 */
export async function getProfile() {
  const response = await api.get('/auth/me')
  return response.data
}

/**
 * Met à jour le profil de l'utilisateur connecté.
 * @param {{ firstName?: string, lastName?: string, phone?: string }} profile
 */
export async function updateProfile(profile) {
  const data = {
    first_name:   profile.firstName  ?? '',
    last_name:    profile.lastName   ?? '',
    phone_number: profile.phone      ?? '',
  }
  console.log('Données envoyées au serveur:', data)
  const response = await api.put('/auth/profile', data)
  return response.data
}

/**
 * Change le mot de passe de l'utilisateur connecté.
 * @param {{ currentPassword: string, newPassword: string }} data
 */
export async function changePassword({ currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    throw new Error('Les champs currentPassword et newPassword sont requis.')
  }
  const body = { currentPassword, newPassword }
  console.log('Données envoyées au PATCH:', body)
  const response = await api.patch('/auth/me/password', body, {
    headers: { 'Content-Type': 'application/json' },
  })
  return response.data
}

/**
 * Injecte le token JWT dans les headers par défaut pour les appels futurs.
 * @param {string} token
 */
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

// Handler appelé quand le compte de l'utilisateur courant est bloqué
let _forceLogoutHandler = null
export function registerForceLogout(fn) {
  _forceLogoutHandler = fn
}

// Intercepteur : déconnexion forcée si le compte est bloqué côté serveur
api.interceptors.response.use(
  res => res,
  err => {
    const code = err?.response?.data?.code
    if (err?.response?.status === 403 && code === 'ACCOUNT_BLOCKED') {
      if (_forceLogoutHandler) _forceLogoutHandler()
    }
    return Promise.reject(err)
  }
)

export default api
