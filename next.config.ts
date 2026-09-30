import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse resuelve a un build "browser" cuando webpack lo empaqueta en el
  // grafo de RSC; marcarlo externo hace que Node lo resuelva nativamente
  // (condiciones require/import correctas) en vez de vía webpack.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
