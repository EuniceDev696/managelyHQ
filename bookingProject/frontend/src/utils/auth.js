const hasValidToken = (token) => {
  if (typeof token !== "string") return false
  const trimmed = token.trim()
  return Boolean(trimmed && trimmed !== "null" && trimmed !== "undefined")
}

const hasValidUser = (user) => Boolean(user && typeof user === "object")

export const isAuthenticatedUser = (user, token) => hasValidToken(token) && hasValidUser(user)
