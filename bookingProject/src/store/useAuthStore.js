import { create } from "zustand"

const storedToken = localStorage.getItem("luxToken")
const storedUser = localStorage.getItem("luxUser")

export const useAuthStore = create((set) => ({
  token: storedToken || null,
  user: storedUser ? JSON.parse(storedUser) : null,
  login: ({ token, user }) => {
    localStorage.setItem("luxToken", token)
    localStorage.setItem("luxUser", JSON.stringify(user))
    set({ token, user })
  },
  logout: () => {
    localStorage.removeItem("luxToken")
    localStorage.removeItem("luxUser")
    set({ token: null, user: null })
  },
  updateUser: (updates) =>
    set((state) => {
      const nextUser = { ...(state.user || {}), ...updates }
      localStorage.setItem("luxUser", JSON.stringify(nextUser))
      return { user: nextUser }
    }),
}))
