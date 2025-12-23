import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomePageComponent } from './pages/home-page/home-page.component';
import { ArtistPageComponent } from './pages/artist-page/artist-page.component';
import { AlbumPageComponent } from './pages/album-page/album-page.component';
import { TrackPageComponent } from './pages/track-page/track-page.component';

import { SearchComponent } from './components/search/search.component';
import { AboutComponent } from './components/about/about.component';

const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'search', component: SearchComponent },
  { path: 'profile', component: AboutComponent },

  { path: 'artist/:id', component: ArtistPageComponent },
  { path: 'album/:id', component: AlbumPageComponent },
  { path: 'track/:id', component: TrackPageComponent },

  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
