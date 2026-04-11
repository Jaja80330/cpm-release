import api from './authService'

export const usersService = {
  async getAll() {
    const res = await api.get('/users')
    return res.data
  },

  // Retourne { user: {...}, password: "generated" }
  async create(data) {
    const res = await api.post('/users', data)
    return res.data
  },

  async updateRole(id, role) {
    const response = await api.patch(`/users/${id}`, { role })
    return response.data
  },

  async remove(id) {
    await api.delete(`/users/${id}`)
  },

  // Retourne { temporaryPassword: string }
  async resetPassword(id) {
    const res = await api.post(`/users/${id}/reset-password`)
    return res.data
  },

  // blocked: true = bloquer, false = débloquer
  async setBlocked(id, blocked) {
    const res = await api.patch(`/users/${id}`, { is_blocked: blocked })
    return res.data
  },
}
