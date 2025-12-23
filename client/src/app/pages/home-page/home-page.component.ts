import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SpotifyService } from '../../services/spotify.service';
import { ResourceData } from '../../data/resource-data';
import { TrackData } from '../../data/track-data';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css'],
  standalone: false,
})
export class HomePageComponent implements OnDestroy {
  q = '';
  type: 'album' | 'artist' | 'track' = 'artist';
  vinylError = false;

  resources: ResourceData[] = [];
  tracks: TrackData[] = [];

  loading = false;
  error = '';

  private debounceTimer: any = null;

  constructor(
    private spotify: SpotifyService,
    private router: Router
  ) {}

  ngOnDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  onQueryChange(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.preview(), 300);
  }

  onTypeChange(): void {
    this.onQueryChange();
  }

  async preview(): Promise<void> {
    const q = (this.q || '').trim();
    if (q.length < 2) {
      this.clear();
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const arr = await this.spotify.searchFor(this.type, q);

      if (this.type === 'track') {
        this.tracks = arr as TrackData[];
        this.resources = [];
      } else {
        this.resources = arr as ResourceData[];
        this.tracks = [];
      }
    } catch (e: any) {
      const status = e?.status;
      const raw = (e?.message || e?.statusText || '').toString();
      const msg = raw.toLowerCase();
      if (status === 401 || msg.includes('unauthorized') || msg.includes('log in')) {
        this.error = 'Log in to search.';
      } else if (status) {
        this.error = `Error ${status}: ${raw || 'Search failed.'}`;
      } else {
        this.error = 'Search failed. Try again.';
      }
      if (this.error !== 'Log in to search.') {
        console.error(e);
      }
      this.resources = [];
      this.tracks = [];
    } finally {
      this.loading = false;
    }
  }

  viewAll(): void {
    const q = (this.q || '').trim();
    if (!q) return;

    this.router.navigate(['/search'], {
      queryParams: { q, type: this.type },
    });
  }

  clear(): void {
    this.loading = false;
    this.error = '';
    this.resources = [];
    this.tracks = [];
  }

  onVinylError(): void {
    this.vinylError = true;
  }
}
