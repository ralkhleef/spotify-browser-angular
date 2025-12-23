import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../../services/spotify.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
  standalone: false
})
export class AboutComponent implements OnInit {
  name: string | null = null;
  profile_pic: string = 'assets/unknown.jpg';
  profile_link: string | null = null;

  constructor(private spotify: SpotifyService) {}

  ngOnInit() {
    // Try to load immediately; if not logged in, SpotifyService will throw 401.
    this.loadAboutMe();
  }

  loadAboutMe(): void {
    this.spotify.aboutMe().then((p: any) => {

      this.name = p?.name ?? null;
      this.profile_pic = p?.imageURL ?? 'assets/unknown.jpg';

      this.profile_link =
        p?.spotifyProfile ??
        p?.profileURL ??
        p?.spotifyUrl ??
        p?.spotifyURL ??
        null;
    }).catch(err => {
      console.error('[About] /me failed:', err);
      this.name = null;
      this.profile_pic = 'assets/unknown.jpg';
      this.profile_link = null;
    });
  }
}