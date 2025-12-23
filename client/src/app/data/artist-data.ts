import { ResourceData } from './resource-data';
import { Popularity } from './popularity';

export class ArtistData extends ResourceData {
  genres: string[] = [];
  followers: number = 0;

  constructor(objectModel: any) {
    super(objectModel);
    this.category = 'artist';

    // genres
    this.genres = Array.isArray(objectModel?.genres) ? objectModel.genres : [];

    // followers
    this.followers = Number(objectModel?.followers?.total ?? 0);

    // assign to the inherited 'popularity' 
    if (objectModel && 'popularity' in objectModel) {
      this.popularity = new Popularity(Number(objectModel.popularity ?? 0));
    }
    // Helpful for routing heuristics
    (this as any).type = 'artist';
  }

  get followersStr() {
    return (this.followers ?? 0).toLocaleString();
  }
}