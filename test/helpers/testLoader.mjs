import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      const parentDir = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd();
      const basePath = path.resolve(parentDir, specifier);
      const candidates = [
        basePath + '.ts',
        basePath + '.tsx',
        basePath + '.js',
        basePath + '.json',
        path.join(basePath, 'index.ts'),
        path.join(basePath, 'index.tsx'),
        path.join(basePath, 'index.js'),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return {
            url: pathToFileURL(candidate).href,
            shortCircuit: true,
          };
        }
      }
    }
    throw err;
  }
}

