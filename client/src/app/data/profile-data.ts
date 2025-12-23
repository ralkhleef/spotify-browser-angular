export class ProfileData {
  name: string;
  email: string;
  spotifyProfile: string;
  imageURL: string;

  constructor(objectModel: any) {
    this.name = objectModel['display_name'];
    this.email = objectModel?.['email'] ?? '';
    this.spotifyProfile = objectModel?.['external_urls']?.['spotify'];
    if (objectModel?.['images']?.length > 0) {
      this.imageURL = objectModel['images'][0].url;
    } else {
      this.imageURL = 'assets/unknown.jpg';
    }
  }
}
