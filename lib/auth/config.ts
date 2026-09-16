export const AUTH_CONFIG = {
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: "7d",
  cookieName: "session",
  bcryptRounds: 12,
};
