import { Component, OnInit, Input } from '@angular/core';
import { TrackData } from '../../data/track-data';
import { PlayerStateService } from '../../services/player-state.service';

@Component({
  selector: 'app-track-list',
  templateUrl: './track-list.component.html',
  styleUrls: ['./track-list.component.css'],
  standalone: false
})
export class TrackListComponent implements OnInit {
  @Input() tracks: TrackData[] = [];
  @Input() hideArtist: boolean = false;
  @Input() hideAlbum: boolean = false;

  constructor(private playerState: PlayerStateService) {}

  ngOnInit() {}

  primaryArtistName(t: TrackData): string {
    const a = t?.artists && t.artists.length > 0 ? t.artists[0] : null;
    return a?.name ?? 'Unknown';
  }

  primaryArtistLink(t: TrackData): any[] | null {
    const a = t?.artists && t.artists.length > 0 ? t.artists[0] : null;
    return a?.id ? ['/artist', a.id] : null;
  }

  albumName(t: TrackData): string {
    return t?.album?.name ?? 'Unknown';
  }

  albumLink(t: TrackData): any[] | null {
    return t?.album?.id ? ['/album', t.album.id] : null;
  }

  durationStr(t: TrackData): string {
    return t?.durationStr ?? '0:00';
  }

  play(t: TrackData) {
    this.playerState.setFromTrack(t);
  }
}