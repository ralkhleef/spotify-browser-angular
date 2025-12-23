import { Component, HostListener } from '@angular/core';
import { PlayerStateService } from './services/player-state.service';
import { AuthStateService } from './services/auth-state.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false
})
export class AppComponent {
  profileOpen = false;

  readonly isLoggedIn$ = this.authState.isLoggedIn$;
  readonly profile$ = this.authState.profile$;

  constructor(
    public playerState: PlayerStateService,
    private authState: AuthStateService
  ) {}

  login(): void {
    this.profileOpen = false;
    this.authState.login();
  }

  toggleProfile(): void {
    this.profileOpen = !this.profileOpen;
  }

  async logout(): Promise<void> {
    await this.authState.logout();
    this.profileOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.profileOpen) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('.auth-actions')) return;
    this.profileOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.profileOpen = false;
  }
}
