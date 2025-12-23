import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ArtistData } from '../data/artist-data';
import { AlbumData } from '../data/album-data';
import { TrackData } from '../data/track-data';
import { ResourceData } from '../data/resource-data';
import { ProfileData } from '../data/profile-data';
import { API_BASE } from '../config/api-base';

@Injectable({ providedIn: 'root' })
export class SpotifyService {
  // Match your Express bind host/port
  private readonly expressBaseUrl = API_BASE;

  constructor(private http: HttpClient) {}

  // Safe join: accepts "foo" or "/foo"
  private url(endpoint: string): string {
    return `${this.expressBaseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  }

  // Generic GET to Express, returns parsed JSON
  private async sendRequestToExpress<T = any>(endpoint: string): Promise<T> {
    try {
      const uri = this.url(endpoint);
      return await firstValueFrom(this.http.get<T>(uri, { withCredentials: true }));
    } catch (err: any) {
      // Give a helpful hint when tokens are missing/expired
      const status = err?.status;
      if (status === 401) {
        const authErr: any = new Error('Log in to continue.');
        authErr.status = 401;
        throw authErr;
      }
      throw err;
    }
  }

  // Bonus: token for Web Playback SDK
  async getPlaybackToken(): Promise<string> {
    const resp = await this.sendRequestToExpress<{ access_token?: string }>('/playback-token');
    const token = resp?.access_token;
    if (!token) throw new Error('No playback token. Log in to enable playback.');
    return token;
  }

  // About / Profile
  async aboutMe(): Promise<ProfileData> {
    const data = await this.sendRequestToExpress<any>('/me');
    return new ProfileData(data);
  }

  // Search
  async searchFor(category: 'artist' | 'album' | 'track', resource: string): Promise<ResourceData[]> {
    const q = encodeURIComponent(resource);
    const t = encodeURIComponent(category);
    const data = await this.sendRequestToExpress<any>(`/search/${t}/${q}`);

    if (category === 'artist') {
      const items = data?.artists?.items ?? [];
      return items.map((a: any) => new ArtistData(a));
    }
    if (category === 'album') {
      const items = data?.albums?.items ?? [];
      return items.map((a: any) => new AlbumData(a));
    }
    const items = data?.tracks?.items ?? [];
    return items.map((t: any) => new TrackData(t));
  }

  // Convenience wrappers 
  searchArtists(q: string): Promise<ArtistData[]> {
    return this.searchFor('artist', q) as Promise<ArtistData[]>;
  }
  searchAlbums(q: string): Promise<AlbumData[]> {
    return this.searchFor('album', q) as Promise<AlbumData[]>;
  }
  searchTracks(q: string): Promise<TrackData[]> {
    return this.searchFor('track', q) as Promise<TrackData[]>;
  }

  // Artist
  async getArtist(artistId: string): Promise<ArtistData> {
    const id = encodeURIComponent(artistId);
    const data = await this.sendRequestToExpress<any>(`/artist/${id}`);
    return new ArtistData(data);
  }

  async getTopTracksForArtist(artistId: string): Promise<TrackData[]> {
    const id = encodeURIComponent(artistId);
    const data = await this.sendRequestToExpress<any>(`/artist-top-tracks/${id}`);
    const items = data?.tracks ?? [];
    return items.map((t: any) => new TrackData(t));
  }

  async getTopTrackIdsForArtist(artistId: string): Promise<string[]> {
    const tracks = await this.getTopTracksForArtist(artistId);
    return tracks.map(t => t.id);
  }

  async getAlbumsForArtist(artistId: string): Promise<AlbumData[]> {
    const id = encodeURIComponent(artistId);
    const data = await this.sendRequestToExpress<any>(`/artist-albums/${id}`);
    const items = data?.items ?? [];
    return items.map((a: any) => new AlbumData(a));
  }

  // Album
  async getAlbum(albumId: string): Promise<AlbumData> {
    const id = encodeURIComponent(albumId);
    const data = await this.sendRequestToExpress<any>(`/album/${id}`);
    return new AlbumData(data);
  }

  async getTracksForAlbum(albumId: string): Promise<TrackData[]> {
    const id = encodeURIComponent(albumId);
    const data = await this.sendRequestToExpress<any>(`/album-tracks/${id}`);
    const items = data?.items ?? [];
    return items.map((t: any) => new TrackData(t));
  }

  // Track
  async getTrack(trackId: string): Promise<TrackData> {
    const id = encodeURIComponent(trackId);
    const data = await this.sendRequestToExpress<any>(`/track/${id}`);
    return new TrackData(data);
  }
}
