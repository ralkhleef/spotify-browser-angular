import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SpotifyService } from './spotify.service';
import { ProfileData } from '../data/profile-data';
import { API_BASE, SPA_ORIGIN } from '../config/api-base';

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  private readonly isLoggedInSubject = new BehaviorSubject<boolean>(false);
  private readonly profileSubject = new BehaviorSubject<ProfileData | null>(null);

  readonly isLoggedIn$ = this.isLoggedInSubject.asObservable();
  readonly profile$ = this.profileSubject.asObservable();

  private pollTimer: number | null = null;
  private readonly expressBaseUrl = API_BASE;

  constructor(private spotify: SpotifyService) {
    this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      const profile = await this.spotify.aboutMe();
      this.isLoggedInSubject.next(true);
      this.profileSubject.next(profile);
    } catch {
      this.isLoggedInSubject.next(false);
      this.profileSubject.next(null);
    }
  }

  login(): void {
    const loginUrl = `${this.expressBaseUrl}/login?origin=${encodeURIComponent(SPA_ORIGIN)}`;
    const popup = window.open(
      loginUrl,
      'spotifyLogin',
      'width=520,height=700,noopener,noreferrer'
    );
    if (!popup) {
      window.alert('Enable popups to log in.');
      return;
    }
    this.startPolling(popup);
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${this.expressBaseUrl}/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // Ignore if the backend has no logout endpoint.
    }
    this.isLoggedInSubject.next(false);
    this.profileSubject.next(null);
  }

  private startPolling(popup: Window | null): void {
    if (this.pollTimer) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    const startedAt = Date.now();
    let inFlight = false;

    this.pollTimer = window.setInterval(async () => {
      if (Date.now() - startedAt > 20000) {
        this.stopPolling();
        return;
      }

      if (popup && popup.closed) {
        this.stopPolling();
        return;
      }

      if (inFlight) return;
      inFlight = true;

      try {
        const profile = await this.spotify.aboutMe();
        this.isLoggedInSubject.next(true);
        this.profileSubject.next(profile);
        if (popup && !popup.closed) popup.close();
        this.stopPolling();
      } catch {
        // Not logged in yet.
      } finally {
        inFlight = false;
      }
    }, 800);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
