export interface DraftRecord {
  content: string
  updatedAt: string
}

const DATABASE_NAME = 'slidev-interaction'
const STORE_NAME = 'editor-drafts'

let databasePromise: Promise<IDBDatabase> | null = null

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) {
    return databasePromise
  }

  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'))
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return databasePromise
}

export function createDraftStorage(storageKey: string) {
  const localStorageKey = `${DATABASE_NAME}:${storageKey}`

  async function getFromIndexedDb() {
    const database = await openDatabase()
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const record = await promisifyRequest(store.get(storageKey))

    return (record as DraftRecord | undefined) ?? null
  }

  async function setToIndexedDb(record: DraftRecord) {
    const database = await openDatabase()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    await promisifyRequest(store.put(record, storageKey))
  }

  async function clearFromIndexedDb() {
    const database = await openDatabase()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    await promisifyRequest(store.delete(storageKey))
  }

  return {
    async get(): Promise<DraftRecord | null> {
      try {
        return await getFromIndexedDb()
      }
      catch {
        const raw = window.localStorage.getItem(localStorageKey)

        if (!raw) {
          return null
        }

        return JSON.parse(raw) as DraftRecord
      }
    },
    async set(record: DraftRecord) {
      try {
        await setToIndexedDb(record)
      }
      catch {
        window.localStorage.setItem(localStorageKey, JSON.stringify(record))
      }
    },
    async clear() {
      try {
        await clearFromIndexedDb()
      }
      catch {
        window.localStorage.removeItem(localStorageKey)
      }
    },
  }
}
