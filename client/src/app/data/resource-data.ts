import { Popularity } from './popularity';

export abstract class ResourceData {
  category: string = "unknown";
  name: string;
  imageURL: string;
  id: string;
  url: string;
  uri?: string; // Spotify URI for playback
  popularity: Popularity | undefined;

  constructor(objectModel: any) {
    this.name = objectModel['name'];
    this.id = objectModel['id'];

    // Image
    if (objectModel?.images?.length > 0) {
      this.imageURL = objectModel.images[0].url;
    } else if (objectModel?.album?.images?.length > 0) {
      this.imageURL = objectModel.album.images[0].url;
    } else {
      this.imageURL = 'assets/unknown.jpg';
    }

    // Popularity (ensure 0 still works)
    if ('popularity' in (objectModel ?? {})) {
      const raw = Number(objectModel.popularity ?? 0);
      if (Number.isFinite(raw)) {
        this.popularity = new Popularity(raw);
      }
    }

    // External Spotify URL
    this.url = objectModel?.external_urls?.spotify ?? '';

    // Spotify URI (needed for playback)
    this.uri = objectModel?.uri ?? undefined;
  }
}
