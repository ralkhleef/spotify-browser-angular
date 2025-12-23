import { Component, Input, OnDestroy, OnInit, OnChanges, SimpleChanges, NgZone, HostBinding } from '@angular/core';
import { API_BASE } from '../../config/api-base';

declare global {
  interface Window {
    Spotify?: any;
    onSpotifyWebPlaybackSDKReady?: () => void;
    __INF133_PLAYER__?: any;       // shared player
    __INF133_DEVICE_ID__?: string; // shared device id
    __INF133_CONNECTED__?: boolean;
  }
}

type MiniPlayerPosition = 'bottom-right' | 'bottom' | 'inline';

@Component({
  selector: 'app-spotify-player',
  templateUrl: './spotify-player.component.html',
  styleUrls: ['./spotify-player.component.css'],
  standalone: false
})
export class SpotifyPlayerComponent implements OnInit, OnDestroy, OnChanges {
  // inputs
  @Input() trackUri: string = '';
  @Input() coverUrl: string = 'assets/unknown.jpg';
  @Input() trackTitle: string = 'Unknown track';
  @Input() trackSubtitle: string = 'Unknown artist';
  @Input() position: MiniPlayerPosition = 'bottom-right';

  // host classes
  @HostBinding('class.position-bottom-right') get posBR() { return this.position === 'bottom-right'; }
  @HostBinding('class.position-bottom')       get posB()  { return this.position === 'bottom'; }
  @HostBinding('class.position-inline')       get posIn() { return this.position === 'inline'; }

  // shared player/device
  private get player(): any { return window.__INF133_PLAYER__; }
  private set player(p: any) { window.__INF133_PLAYER__ = p; }
  get deviceId(): string | null { return window.__INF133_DEVICE_ID__ ?? null; }
  private set deviceId(v: string | null) { window.__INF133_DEVICE_ID__ = v ?? undefined; }
  private get isConnected(): boolean { return !!window.__INF133_CONNECTED__; }
  private set isConnected(v: boolean) { window.__INF133_CONNECTED__ = v; }

  // ui state
  sdkLoading = false;
  isReady = false;
  status = '';
  isPlaying = false;
  positionMs = 0;
  durationMs = 0;
  coverError = false;
  private raf: number | null = null;
  private changeTimer: any = null;

  // volume (0..1)
  volume = 0.8;
  private readonly expressBaseUrl = API_BASE;

  constructor(private zone: NgZone) {}

  // UI-only stubs (queue/skip not implemented yet)
  prevStub() {}

  nextStub() {}

  ngOnInit() {
    this.mountSdkAndPlayer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['trackUri'] && this.trackUri) {
      clearTimeout(this.changeTimer);
      this.changeTimer = setTimeout(() => {
        this.autoEnsureActive().then(() => this.playTrackUri());
      }, 150);
    }
    if (changes['coverUrl']) {
      this.coverError = false;
    }
  }

  ngOnDestroy(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    // keep shared player alive
  }

  // slider 0..1000
  get progressValue(): number {
    return this.durationMs ? Math.round((this.positionMs / this.durationMs) * 1000) : 0;
  }

  get remainingMs(): number {
    if (!this.durationMs) return 0;
    return Math.max(0, this.durationMs - this.positionMs);
  }

  get remainingStr(): string {
    return `-${this.msToStr(this.remainingMs)}`;
  }

  get displayCoverUrl(): string {
    if (!this.coverUrl || this.coverError) return 'assets/unknown.jpg';
    return this.coverUrl;
  }

  onCoverError(): void {
    this.coverError = true;
  }

  // scrub handler
  onScrub(evt: Event) {
    const raw = (evt.target as HTMLInputElement)?.value ?? '0';
    const val = parseFloat(raw);
    const percent = Number.isFinite(val) ? val / 1000 : 0;
    this.seek(percent);
  }

  // mount sdk or reuse player
  private mountSdkAndPlayer() {
    if (this.player && this.deviceId) {
      this.isReady = true;
      this.status = '';
      this.tick();
      return;
    }
    if (window.Spotify) {
      this.createPlayer();
      return;
    }
    this.sdkLoading = true;
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://sdk.scdn.co/spotify-player.js"]');
    if (!existing) {
      const s = document.createElement('script');
      s.src = 'https://sdk.scdn.co/spotify-player.js';
      s.async = true;
      document.body.appendChild(s);
    }
    window.onSpotifyWebPlaybackSDKReady = () => {
      this.sdkLoading = false;
      this.createPlayer();
    };
  }

  // make web player
  private async createPlayer() {
    try {
      const token = await this.getToken();
      const webPlayer = new window.Spotify.Player({
        name: 'INF133 Web Player',
        getOAuthToken: (cb: (t: string) => void) => cb(token),
        volume: this.volume
      });

      webPlayer.addListener('ready', ({ device_id }: any) => {
        this.zone.run(() => {
          this.deviceId = device_id;
          this.isReady = true;
          this.isConnected = true;
          this.status = '';
        });
        this.tick();
      });

      webPlayer.addListener('not_ready', ({ device_id }: any) => {
        this.zone.run(() => {
          if (this.deviceId === device_id) {
            this.isReady = false;
            this.status = 'Device not ready';
          }
        });
      });

      webPlayer.addListener('initialization_error', ({ message }: any) =>
        this.zone.run(() => (this.status = `Init error: ${message}`))
      );
      webPlayer.addListener('authentication_error', () =>
        this.zone.run(() => (this.status = 'Log in to enable playback'))
      );
      webPlayer.addListener('account_error', ({ message }: any) =>
        this.zone.run(() => (this.status = `Account error (Premium req'd): ${message}`))
      );
      webPlayer.addListener('playback_error', ({ message }: any) =>
        this.zone.run(() => (this.status = `Playback error: ${message}`))
      );

      const ok = await webPlayer.connect();
      if (!ok) throw new Error('player.connect() returned false');

      this.player = webPlayer;
    } catch (e: any) {
      this.status = e?.message || 'Failed to init player';
    }
  }

  // connect + transfer
  async connectDevice() {
    if (!this.player) this.mountSdkAndPlayer();
    if (!this.isReady) {
      this.status = '';
      await new Promise(r => setTimeout(r, 400));
    }
    if (this.isReady) await this.transferHere();
  }

  // ensure active
  private async autoEnsureActive() {
    if (!this.isReady) await this.connectDevice();
    else await this.transferHere();
  }

  // token
  private async getToken(): Promise<string> {
    const resp = await fetch(`${this.expressBaseUrl}/playback-token`, { credentials: 'include' });
    if (!resp.ok) {
      this.status = 'Log in to enable playback';
      throw new Error('Log in to enable playback');
    }
    const data = await resp.json();
    const token = data?.access_token;
    if (!token) throw new Error('No access_token');
    return token;
  }

  // set output device
  async transferHere() {
    if (!this.deviceId) { this.status = 'No device yet - Connect'; return; }
    const token = await this.getToken();
    const r = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_ids: [this.deviceId], play: false })
    });
    this.status = r.ok ? '' : `Transfer failed (${r.status})`;
  }

  // play current uri
  private async playTrackUri() {
    if (!this.trackUri) return;
    if (!this.deviceId) { this.status = 'No device - Connect'; return; }

    const token = await this.getToken();
    const q = `?device_id=${encodeURIComponent(this.deviceId)}`;
    const body = { uris: [this.trackUri] };

    let r = await fetch('https://api.spotify.com/v1/me/player/play' + q, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!r.ok && (r.status === 404 || r.status === 403)) {
      await this.transferHere();
      r = await fetch('https://api.spotify.com/v1/me/player/play' + q, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }

    if (!r.ok) { this.status = `Play failed (${r.status})`; return; }

    this.isPlaying = true;
    this.status = '';
    this.fetchNowPlaying(token);
  }

  // play/pause toggle
  async toggle() {
    if (!this.deviceId) {
      await this.autoEnsureActive();
      return this.playTrackUri();
    }
    if (this.isPlaying) return this.pause();
    return this.playTrackUri();
  }

  // pause
  async pause() {
    try {
      const token = await this.getToken();
      const q = this.deviceId ? `?device_id=${encodeURIComponent(this.deviceId)}` : '';
      await fetch('https://api.spotify.com/v1/me/player/pause' + q, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token }
      });
      this.isPlaying = false;
      this.status = '';
    } catch (e: any) {
      this.status = e?.message || 'Pause error';
    }
  }

  // volume
  async setVolume(v: number) {
    const nv = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : this.volume;
    this.volume = nv;
    try {
      if (this.player?.setVolume) await this.player.setVolume(this.volume);
    } catch { /* noop */ }
  }

  onVolumeInput(evt: Event): void {
    const raw = (evt.target as HTMLInputElement)?.value ?? '0';
    const val = parseFloat(raw);
    const percent = Number.isFinite(val) ? val / 100 : this.volume;
    this.setVolume(percent);
  }

  // seek
  async seek(percent: number) {
    if (!this.durationMs) return;
    const clamped = Math.max(0, Math.min(1, percent || 0));
    const target = Math.round(this.durationMs * clamped);
    try {
      const token = await this.getToken();
      const q = this.deviceId ? `?device_id=${encodeURIComponent(this.deviceId)}` : '';
      await fetch(`https://api.spotify.com/v1/me/player/seek${q}&position_ms=${target}`.replace('?&','?'), {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token }
      });
      this.positionMs = target;
    } catch { /* noop */ }
  }

  // now playing
  private async fetchNowPlaying(token?: string) {
    try {
      const t = token ?? (await this.getToken());
      const r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: 'Bearer ' + t }
      });
      if (!r.ok) return;
      const j = await r.json();
      const item = j?.item;
      if (!item) return;
      this.zone.run(() => {
        this.trackTitle = item?.name ?? this.trackTitle;
        const artists = (item?.artists ?? []).map((a: any) => a?.name).filter(Boolean).join(', ');
        if (artists) this.trackSubtitle = artists;
        const img = item?.album?.images?.[0]?.url;
        if (img) {
          this.coverUrl = img;
          this.coverError = false;
        }
        this.durationMs = item?.duration_ms ?? this.durationMs;
      });
    } catch { /* ignore */ }
  }

  // poll player state
  private tick = async () => {
    try {
      if (this.player?.getCurrentState) {
        const state = await this.player.getCurrentState();
        if (state) {
          this.zone.run(() => {
            this.isPlaying = state.paused === false;
            const track = state.track_window?.current_track;
            this.durationMs = track?.duration_ms ?? this.durationMs;
            this.positionMs = state.position ?? this.positionMs;

            if (!this.trackUri && track?.uri) this.trackUri = track.uri;
            if (!this.trackTitle && track?.name) this.trackTitle = track.name;
            const names = (track?.artists ?? []).map((a: any) => a.name).filter(Boolean).join(', ');
            if (!this.trackSubtitle && names) this.trackSubtitle = names;
            const img = track?.album?.images?.[0]?.url;
            if (!this.coverUrl && img) {
              this.coverUrl = img;
              this.coverError = false;
            }
          });
        }
      }
    } catch { /* noop */ }
    this.raf = requestAnimationFrame(this.tick);
  };

  // mm:ss
  msToStr(ms: number): string {
    if (!Number.isFinite(ms)) return '0:00';
    const safe = Math.max(0, Math.floor(ms));
    const m = Math.floor(safe / 60000);
    const s = Math.floor((safe % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  get showStatus(): boolean {
    if (!this.status) return false;
    const s = this.status.toLowerCase();
    return s.includes('not logged in') || s.includes('log in') || s.includes('error') || s.includes('failed');
  }
}
