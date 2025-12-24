import fs from 'fs/promises';
import path from 'path';

export interface CollageMetadata {
  id: string;
  era: string;
  version: number;
  filepath: string;
  filename: string;
  active: boolean;
  createdAt: string;
  fileSize?: number;
}

interface CollageStorage {
  collages: CollageMetadata[];
}

const STORAGE_PATH = path.join(process.cwd(), 'data', 'collages.json');

async function readStorage(): Promise<CollageStorage> {
  try {
    const data = await fs.readFile(STORAGE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    // If file doesn't exist, return empty storage
    if (error.code === 'ENOENT') {
      return { collages: [] };
    }
    throw error;
  }
}

async function writeStorage(storage: CollageStorage): Promise<void> {
  await fs.mkdir(path.dirname(STORAGE_PATH), { recursive: true });
  await fs.writeFile(STORAGE_PATH, JSON.stringify(storage, null, 2), 'utf-8');
}

export async function getAllCollages(): Promise<CollageMetadata[]> {
  const storage = await readStorage();
  return storage.collages;
}

export async function getCollagesByEra(era: string): Promise<CollageMetadata[]> {
  const storage = await readStorage();
  return storage.collages.filter(c => c.era === era);
}

export async function getActiveCollagesByEra(era: string): Promise<CollageMetadata[]> {
  const storage = await readStorage();
  return storage.collages.filter(c => c.era === era && c.active);
}

export async function addCollage(collage: Omit<CollageMetadata, 'id' | 'createdAt'>): Promise<CollageMetadata> {
  const storage = await readStorage();
  const newCollage: CollageMetadata = {
    ...collage,
    id: `${collage.era}-v${collage.version}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  storage.collages.push(newCollage);
  await writeStorage(storage);
  return newCollage;
}

export async function updateCollage(id: string, updates: Partial<CollageMetadata>): Promise<CollageMetadata | null> {
  const storage = await readStorage();
  const index = storage.collages.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  storage.collages[index] = { ...storage.collages[index], ...updates };
  await writeStorage(storage);
  return storage.collages[index];
}

export async function deleteCollage(id: string): Promise<boolean> {
  const storage = await readStorage();
  const index = storage.collages.findIndex(c => c.id === id);
  if (index === -1) return false;
  
  storage.collages.splice(index, 1);
  await writeStorage(storage);
  return true;
}

export async function toggleCollageActive(id: string): Promise<CollageMetadata | null> {
  const storage = await readStorage();
  const index = storage.collages.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  storage.collages[index].active = !storage.collages[index].active;
  await writeStorage(storage);
  return storage.collages[index];
}

