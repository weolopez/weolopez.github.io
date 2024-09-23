export class GeoJSONLoader {
    static async load(url) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load GeoJSON data from ${url}`);
      }
      return await response.json();
    }
  }