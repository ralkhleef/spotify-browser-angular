import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrackData } from '../../data/track-data';
import { SpotifyService } from '../../services/spotify.service';
import { PlayerStateService } from '../../services/player-state.service';

@Component({
  selector: 'app-track-page',
  templateUrl: './track-page.component.html',
  styleUrls: ['./track-page.component.css'],
  standalone: false
})
export class TrackPageComponent implements OnInit {
  trackId!: string;
  track: TrackData | null = null;

  constructor(
    private route: ActivatedRoute,
    private spotifyService: SpotifyService,
    private playerState: PlayerStateService
  ) {}

  ngOnInit() {
    // Reload data when navigating between tracks
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;
      this.trackId = id;
      this.track = null;
      this.spotifyService.getTrack(this.trackId).then(t => (this.track = t));
    });
  }

  // Artist names for template
  get artistNames(): string {
    const list: any[] = (this.track as any)?.artists ?? [];
    return Array.isArray(list)
      ? list.map(a => a?.name).filter(Boolean).join(', ')
      : '';
  }

  // Popularity as 0..100
  get trackPopularityPercent(): number | null {
    const p: any = this.track?.popularity;
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

  // External Spotify link for the track
  trackExternalUrl(): string {
    const anyTrack = this.track as any;
    return anyTrack?.spotifyLink || this.track?.url || '';
  }

  playInMiniPlayer() {
    this.playerState.setFromTrack(this.track);
  }
}