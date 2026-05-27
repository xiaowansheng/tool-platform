export interface OpfsEntry {
  name: string;
  kind: FileSystemHandleKind;
}

interface StorageManagerWithDirectory extends StorageManager {
  getDirectory(): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemDirectoryHandleWithEntries extends FileSystemDirectoryHandle {
  entries(): AsyncIterable<[string, FileSystemHandle]>;
}

function getStorageWithDirectory() {
  if (typeof navigator === "undefined" || !("storage" in navigator)) {
    return null;
  }

  const storage = navigator.storage as StorageManagerWithDirectory;
  return typeof storage.getDirectory === "function" ? storage : null;
}

function splitPath(path: string) {
  return path.split("/").filter(Boolean);
}

export function isOpfsSupported() {
  return getStorageWithDirectory() !== null;
}

export async function getOpfsRoot() {
  const storage = getStorageWithDirectory();

  if (!storage) {
    throw new Error("OPFS is not supported in this browser");
  }

  return storage.getDirectory();
}

export async function ensureOpfsDirectory(path: string) {
  const segments = splitPath(path);
  let current = await getOpfsRoot();

  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }

  return current;
}

export async function writeOpfsText(path: string, contents: string) {
  const segments = splitPath(path);
  const fileName = segments.pop();

  if (!fileName) {
    throw new Error("A file name is required to write to OPFS");
  }

  const directory = segments.length > 0 ? await ensureOpfsDirectory(segments.join("/")) : await getOpfsRoot();
  const fileHandle = await directory.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();

  await writable.write(contents);
  await writable.close();
}

export async function writeOpfsJson(path: string, contents: unknown) {
  await writeOpfsText(path, JSON.stringify(contents, null, 2));
}

export async function readOpfsText(path: string) {
  const segments = splitPath(path);
  const fileName = segments.pop();

  if (!fileName) {
    throw new Error("A file name is required to read from OPFS");
  }

  const directory = segments.length > 0 ? await ensureOpfsDirectory(segments.join("/")) : await getOpfsRoot();
  const fileHandle = await directory.getFileHandle(fileName);
  const file = await fileHandle.getFile();

  return file.text();
}

export async function listOpfsEntries(path = "") {
  const directory = path ? await ensureOpfsDirectory(path) : await getOpfsRoot();
  const entries: OpfsEntry[] = [];
  const iterableDirectory = directory as FileSystemDirectoryHandleWithEntries;

  for await (const [name, handle] of iterableDirectory.entries()) {
    entries.push({
      name,
      kind: handle.kind
    });
  }

  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

export async function deleteOpfsFile(path: string) {
  const segments = splitPath(path);
  const fileName = segments.pop();

  if (!fileName) {
    throw new Error("A file name is required to delete from OPFS");
  }

  const directory = segments.length > 0 ? await ensureOpfsDirectory(segments.join("/")) : await getOpfsRoot();
  await directory.removeEntry(fileName);
}
