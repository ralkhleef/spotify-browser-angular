import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TrackData } from '../data/track-data';

@Injectable({ providedIn: 'root' })
export class PlayerStateService {
  // shared state (so the mini-player can live in AppComponent)
  readonly trackUri$ = new BehaviorSubject<string>('');
  readonly coverUrl$ = new BehaviorSubject<string>('assets/unknown.jpg');
  readonly title$ = new BehaviorSubject<string>('Nothing playing');
  readonly subtitle$ = new BehaviorSubject<string>('Pick a track');

  setFromTrack(track: TrackData | null | undefined) {
    if (!track) return;

    const uri = track.uri || (track.id ? `spotify:track:${track.id}` : '');
    const cover = this.resolveCover(track);
    const title = track.name || 'Unknown track';
    const artists = (track.artists || []).map(a => a?.name).filter(Boolean).join(', ');

    this.trackUri$.next(uri);
    this.coverUrl$.next(cover);
    this.title$.next(title);
    this.subtitle$.next(artists || 'Unknown artist');
  }

  private resolveCover(track: TrackData): string {
    const candidates = [
      track.album?.imageURL,
      track.imageURL,
      (track as any)?.album?.images?.[0]?.url,
      (track as any)?.images?.[0]?.url,
      (track as any)?.album?.images?.[0]?.url,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim().length) return c;
    }
    return 'assets/unknown.jpg';
  }
}
