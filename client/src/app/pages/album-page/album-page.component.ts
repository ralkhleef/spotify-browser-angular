import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrackData } from '../../data/track-data';
import { AlbumData } from '../../data/album-data';
import { SpotifyService } from '../../services/spotify.service';

@Component({
  selector: 'app-album-page',
  templateUrl: './album-page.component.html',
  styleUrls: ['./album-page.component.css'],
  standalone: false
})
export class AlbumPageComponent implements OnInit {
  albumId!: string;
  album: AlbumData | null = null;
  tracks: TrackData[] = [];

  constructor(private route: ActivatedRoute, private spotifyService: SpotifyService) {}

  ngOnInit() {
    // Re-run when navigating between albums
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;

      this.albumId = id;
      this.album = null;
      this.tracks = [];

      this.spotifyService.getAlbum(this.albumId).then(a => {
        this.album = a;
        this.patchTracksWithAlbum();
      });
      this.spotifyService.getTracksForAlbum(this.albumId).then(ts => {
        this.tracks = ts || [];
        this.patchTracksWithAlbum();
      });
    });
  }

  get albumPopularityPercent(): number | null {
    const p: any = this.album?.popularity;
    if (p == null) return null;

    let n: number;
    if (typeof p === 'object' && 'percent' in p) {

      n = (p.percent ?? 0) * 100;
    } else {
      n = Number(p);
    }

    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  albumExternalUrl(): string {
  
    const anyAlbum = this.album as any;
    return (anyAlbum?.spotifyLink) || this.album?.url || '';
  }

  private patchTracksWithAlbum(): void {
    if (!this.album || !this.tracks.length) return;
    const fallback = 'assets/unknown.jpg';
    const cover = this.album.imageURL || fallback;
    this.tracks = this.tracks.map(track => {
      track.album = this.album || track.album;
      if (!track.imageURL || track.imageURL === fallback) {
        track.imageURL = cover;
      }
      return track;
    });
  }
}
