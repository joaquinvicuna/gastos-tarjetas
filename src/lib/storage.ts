import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

// El archivo original nunca se vuelve a leer una vez procesado (solo las
// transacciones extraídas persisten en la base de datos), así que basta con
// almacenamiento efímero. os.tmpdir() resuelve a /tmp en funciones
// serverless (el único directorio escribible ahí) y al directorio temporal
// del SO en local — funciona igual en ambos casos sin configurar storage
// en la nube.
const UPLOADS_ROOT = path.join(os.tmpdir(), "gastos-tarjetas-uploads");

export async function saveFile(
  userId: string,
  originalFileName: string,
  buffer: Buffer,
): Promise<{ relativePath: string }> {
  const ext = path.extname(originalFileName);
  const fileName = `${randomUUID()}${ext}`;
  const relativePath = path.join(userId, fileName);
  const absolutePath = path.join(UPLOADS_ROOT, relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return { relativePath };
}

export async function getFile(relativePath: string): Promise<Buffer> {
  return readFile(path.join(UPLOADS_ROOT, relativePath));
}

export async function deleteFile(relativePath: string): Promise<void> {
  await unlink(path.join(UPLOADS_ROOT, relativePath)).catch(() => undefined);
}
