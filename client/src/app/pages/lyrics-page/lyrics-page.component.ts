import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { PlayerStateService } from '../../services/player-state.service';

@Component({
  selector: 'app-lyrics-page',
  templateUrl: './lyrics-page.component.html',
  styleUrls: ['./lyrics-page.component.css'],
  standalone: false
})
export class LyricsPageComponent implements OnInit, OnDestroy {
  trackId = '';
  userLyrics = '';

  private sub: Subscription | null = null;

  constructor(public player: PlayerStateService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.sub = this.route.queryParamMap.subscribe((p) => {
      this.trackId = (p.get('track') || '').trim();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  clear() {
    this.userLyrics = '';
  }
}
