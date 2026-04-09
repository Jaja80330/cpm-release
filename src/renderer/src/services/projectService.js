import api from './authService'

export const projectService = {
  async getAll() {
    const response = await api.get('/projects')
    return response.data
  },

  async getById(id) {
    const response = await api.get(`/projects/${id}`)
    return response.data
  },

  async create(data) {
    const response = await api.post('/projects', data)
    return response.data
  },

  async update(id, data) {
    const response = await api.put(`/projects/${id}`, data)
    return response.data
  },

  async patch(id, data) {
    const response = await api.patch(`/projects/${id}`, data)
    return response.data
  },

  async remove(id) {
    await api.delete(`/projects/${id}`)
  },

  // ── Équipe ────────────────────────────���─────────────────────────────────
  async getMembers(projectId) {
    const response = await api.get(`/projects/${projectId}/members`)
    return response.data
  },

  async addMember(projectId, data) {
    const response = await api.post(`/projects/${projectId}/members`, data)
    return response.data
  },

  async updateMember(projectId, userId, data) {
    const response = await api.patch(`/projects/${projectId}/members/${userId}`, data)
    return response
  },

  async removeMember(projectId, userId) {
    await api.delete(`/projects/${projectId}/members/${userId}`)
  },

  async searchUsers(query) {
    const response = await api.get('/users/search', { params: { q: query } })
    return response.data
  },

  // ── Versions ──────────────────────────────────────────────────────────────
  async registerVersion(projectId, { version_name, zip_name, file_size, changelog }) {
    const response = await api.post(`/projects/${projectId}/versions`, {
      version_name, zip_name, file_size, changelog
    })
    return response.data
  },

  async getRecentActivity() {
    const response = await api.get('/activity/recent')
    return response.data
  },

  async getVersions(projectId) {
    const response = await api.get(`/projects/${projectId}/versions`)
    return response.data
  },

  async publishVersion(projectId, versionId) {
    const response = await api.patch(`/projects/${projectId}/versions/${versionId}/publish`)
    return response.data
  },

  async unpublishVersion(projectId, versionId) {
    const response = await api.patch(`/projects/${projectId}/versions/${versionId}/unpublish`)
    return response.data
  },

  async deprecateVersion(projectId, versionId) {
    const response = await api.patch(`/projects/${projectId}/versions/${versionId}/deprecate`)
    return response.data
  },

  // ── Apparence (bannière / logo) ────────────────────────────────────────────
  async uploadBanner(projectId, file) {
    const form = new FormData()
    form.append('banner', file)
    const response = await api.put(`/projects/${projectId}/banner`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  async deleteBanner(projectId) {
    const response = await api.delete(`/projects/${projectId}/banner`)
    return response.data
  },

  async uploadLogo(projectId, file) {
    const form = new FormData()
    form.append('logo', file)
    const response = await api.put(`/projects/${projectId}/logo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  async deleteLogo(projectId) {
    const response = await api.delete(`/projects/${projectId}/logo`)
    return response.data
  },

  // ── Screenshots ────────────────────────────────────────────────────────────
  async addScreenshots(projectId, files) {
    const form = new FormData()
    files.forEach(f => form.append('images', f))
    const response = await api.post(`/projects/${projectId}/screenshots`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  async deleteScreenshot(projectId, screenshotId) {
    const response = await api.delete(`/projects/${projectId}/screenshots/${screenshotId}`)
    return response.data
  },

  // ── Fonctionnalités projet ─────────────────────────────────────────────────
  async updateFeatures(projectId, data) {
    const response = await api.patch(`/projects/${projectId}`, data)
    return response.data
  },

  // ── Backlogs ───────────────────────────────────────────────────────────────
  async getBacklogs(projectId) {
    const response = await api.get(`/projects/${projectId}/backlogs`)
    return response.data
  },

  async createBacklog(projectId, data) {
    const response = await api.post(`/projects/${projectId}/backlogs`, data)
    return response.data
  },

  async updateBacklog(projectId, backlogId, data) {
    const response = await api.patch(`/projects/${projectId}/backlogs/${backlogId}`, data)
    return response.data
  },

  async deleteBacklog(projectId, backlogId) {
    await api.delete(`/projects/${projectId}/backlogs/${backlogId}`)
  },

  async addBacklogComment(projectId, backlogId, content) {
    const response = await api.post(`/projects/${projectId}/backlogs/${backlogId}/comments`, { content })
    return response.data
  },

  async uploadBacklogImage(projectId, backlogId, file) {
    const form = new FormData()
    form.append('image', file)
    const response = await api.post(`/projects/${projectId}/backlogs/${backlogId}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  // ── Tickets ────────────────────────────────────────────────────────────────
  async getTickets(projectId) {
    const response = await api.get(`/projects/${projectId}/tickets`)
    return response.data
  },

  async createTicket(projectId, data) {
    const response = await api.post(`/projects/${projectId}/tickets`, data)
    return response.data
  },

  async updateTicket(projectId, ticketId, data) {
    const response = await api.patch(`/projects/${projectId}/tickets/${ticketId}`, data)
    return response.data
  },

  async deleteTicket(projectId, ticketId) {
    await api.delete(`/projects/${projectId}/tickets/${ticketId}`)
  },

  async addTicketComment(projectId, ticketId, content) {
    const response = await api.post(`/projects/${projectId}/tickets/${ticketId}/comments`, { content })
    return response.data
  },

  async uploadTicketImage(projectId, ticketId, file) {
    const form = new FormData()
    form.append('image', file)
    const response = await api.post(`/projects/${projectId}/tickets/${ticketId}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },
}
