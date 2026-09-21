import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'expo-secure-store') {
    return {
      shortCircuit: true,
      url: new URL('./expo-secure-store.mjs', import.meta.url).href,
    };
  }
  if (specifier === 'expo-crypto') {
    return {
      shortCircuit: true,
      url: new URL('./expo-crypto.mjs', import.meta.url).href,
    };
  }
  if (specifier === 'expo-file-system/legacy' || specifier === 'expo-file-system') {
    return {
      shortCircuit: true,
      url: new URL('./expo-file-system.mjs', import.meta.url).href,
    };
  }

  // Handle extensionless relative imports in TypeScript files
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    if (context.parentURL && context.parentURL.startsWith('file:')) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const targetPath = path.resolve(parentDir, specifier);
      if (fs.existsSync(targetPath + '.ts')) {
        return {
          shortCircuit: true,
          url: new URL(specifier + '.ts', context.parentURL).href,
        };
      }
      if (fs.existsSync(targetPath + '.tsx')) {
        return {
          shortCircuit: true,
          url: new URL(specifier + '.tsx', context.parentURL).href,
        };
      }
    }
  }

  return nextResolve(specifier, context);
}
