import { ResourceData } from './resource-data';
import { ArtistData } from './artist-data';
import { AlbumData } from './album-data';

export class TrackData extends ResourceData {
  album: AlbumData | undefined;
  artists: ArtistData[] = [];
  duration_ms: number = 0;

  constructor(objectModel: any) {
    super(objectModel);
    this.category = "track";

    const rawArtists = Array.isArray(objectModel?.artists) ? objectModel.artists : [];
    this.artists = rawArtists.map((artist: any) => new ArtistData(artist));

    if (objectModel?.album) {
      this.album = new AlbumData(objectModel.album);
    }

    this.duration_ms = Number(objectModel?.duration_ms ?? 0);
  }

  // Return duration_ms in X:XX form (and drop ms component)
  get durationStr() {
    const minutes: number = Math.trunc(this.duration_ms / 60000);
    const seconds: number = Math.trunc((this.duration_ms) / 1000 % 60);
    return minutes.toString() + ':' + seconds.toString().padStart(2, '0');
  }
}