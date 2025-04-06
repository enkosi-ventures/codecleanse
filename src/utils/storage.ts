// Basic localStorage wrapper with type safety and error handling

export function setLocalStorage<T>(key: string, value: T): void {
  try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
  } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
  }
}

export function getLocalStorage<T>(key: string): T | null {
  try {
      const serializedValue = localStorage.getItem(key);
      if (serializedValue === null) {
          return null;
      }
      return JSON.parse(serializedValue) as T;
  } catch (error) {
      console.error(`Error getting localStorage key "${key}":`, error);
      // Optionally remove the corrupted item
      // localStorage.removeItem(key);
      return null;
  }
}

export function removeLocalStorage(key: string): void {
   try {
       localStorage.removeItem(key);
   } catch (error) {
       console.error(`Error removing localStorage key "${key}":`, error);
   }
}

// Add sessionStorage equivalents if needed