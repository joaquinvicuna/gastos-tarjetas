import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse resuelve a un build "browser" cuando webpack lo empaqueta en el
  // grafo de RSC; marcarlo externo hace que Node lo resuelva nativamente
  // (condiciones require/import correctas) en vez de vía webpack.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  // pdfjs-dist carga su "worker" en tiempo de ejecución (no vía import
  // estático), así que el tracer de archivos de Next no lo detecta solo —
  // hay que incluirlo a mano para que exista en el bundle serverless.
  outputFileTracingIncludes: {
    "/api/statements": ["./node_modules/pdfjs-dist/legacy/build/*.mjs"],
  },
};

export default nextConfig;
