import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ArtistData } from '../../data/artist-data';
import { TrackData } from '../../data/track-data';
import { AlbumData } from '../../data/album-data';
import { SpotifyService } from '../../services/spotify.service';

@Component({
  selector: 'app-artist-page',
  templateUrl: './artist-page.component.html',
  styleUrls: ['./artist-page.component.css'],
  standalone: false
})
export class ArtistPageComponent implements OnInit {
  artistId!: string;
  artist: ArtistData | null = null;
  topTracks: TrackData[] = [];
  albums: AlbumData[] = [];

  constructor(private route: ActivatedRoute, private spotifyService: SpotifyService) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;

      this.artistId = id;
      this.artist = null;
      this.topTracks = [];
      this.albums = [];

      this.spotifyService.getArtist(this.artistId).then(a => this.artist = a);
      this.spotifyService.getTopTracksForArtist(this.artistId).then(ts => this.topTracks = ts || []);
      this.spotifyService.getAlbumsForArtist(this.artistId).then(as => this.albums = as || []);
    });
  }

  // 0..100 or null while loading
  get popularityPercent(): number | null {
    const p: any = (this.artist as any)?.popularity;
    if (p == null) return null;
    const n = (typeof p === 'object' && 'percent' in p) ? (p.percent ?? 0) * 100 : Number(p);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  // IDs for the artist player (avoid arrow functions in template)
  get topTrackIds(): string[] {
    return (this.topTracks ?? []).map(t => t.id);
  }
}