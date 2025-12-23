import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Subscription } from 'rxjs';
import { SpotifyService } from '../../services/spotify.service';
import { TrackData } from '../../data/track-data';
import { ResourceData } from '../../data/resource-data';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  standalone: false
})
export class SearchComponent implements OnInit, OnDestroy {
  searchString = '';
  searchCategory: 'artist' | 'album' | 'track' = 'artist';

  resources: ResourceData[] = [];
  tracks: TrackData[] = [];

  loading = false;
  error = '';

  private sub: Subscription | null = null;

  constructor(private spotifyService: SpotifyService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Search is driven ONLY by URL query params:
    // /search?q=<query>&type=<artist|album|track>
    this.sub = this.route.queryParamMap.subscribe((params: ParamMap) => {
      const q = (params.get('q') || '').trim();
      const t = params.get('type');

      this.searchString = q;
      if (t === 'artist' || t === 'album' || t === 'track') this.searchCategory = t;

      if (!q) {
        this.clearResults();
        return;
      }

      this.search();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private search(): void {
    const q = this.searchString.trim();
    if (!q) {
      this.clearResults();
      return;
    }

    this.loading = true;
    this.error = '';
    this.spotifyService
      .searchFor(this.searchCategory, q)
      .then((arr: any[]) => {
        this.loading = false;
        this.error = '';

        if (this.searchCategory === 'track') {
          this.tracks = arr as TrackData[];
          this.resources = [];
        } else {
          this.resources = arr as ResourceData[];
          this.tracks = [];
        }
      })
      .catch((err) => {
        this.loading = false;
        const status = err?.status;
        const msg = (err?.message || err?.statusText || '').toString();
        const lower = msg.toLowerCase();
        if (status === 401 || lower.includes('log in') || lower.includes('unauthorized')) {
          this.error = 'Log in to search.';
        } else if (status) {
          this.error = `Error ${status}: ${msg || 'Search failed.'}`;
        } else {
          this.error = 'Search failed. Try again.';
        }
        if (this.error !== 'Log in to search.') {
          console.error('Search error:', err);
        }
        this.resources = [];
        this.tracks = [];
      });
  }

  private clearResults(): void {
    this.loading = false;
    this.error = '';
    this.resources = [];
    this.tracks = [];
  }
}
