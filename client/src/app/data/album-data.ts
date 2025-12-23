import { ResourceData } from './resource-data';
import { ArtistData } from './artist-data';

export class AlbumData extends ResourceData {
  genres: string[] = [];
  artists: ArtistData[] = [];

  constructor(objectModel: any) {
    super(objectModel);
    this.category = "album";

    // Genres may be missing on lightweight album objects
    this.genres = Array.isArray(objectModel?.genres) ? objectModel.genres : [];

    // Artists array guard
    const rawArtists = Array.isArray(objectModel?.artists) ? objectModel.artists : [];
    this.artists = rawArtists.map((artist: any) => new ArtistData(artist));
  }
}