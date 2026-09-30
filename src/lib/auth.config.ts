import type { NextAuthConfig } from "next-auth";

// Config "edge-safe": sin Credentials provider ni Prisma, para que el
// middleware/proxy (que corre en el Edge Runtime) pueda verificar la sesión
// sin arrastrar módulos nativos (@node-rs/argon2) que no resuelven ahí.
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
};
