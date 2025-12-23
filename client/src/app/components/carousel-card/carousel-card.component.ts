import { Component, OnInit, Input } from '@angular/core';
import { ResourceData } from '../../data/resource-data';
// These classes exist in the starter models; importing lets us use instanceof
import { ArtistData } from '../../data/artist-data';
import { AlbumData } from '../../data/album-data';

@Component({
  selector: 'app-carousel-card',
  templateUrl: './carousel-card.component.html',
  styleUrls: ['./carousel-card.component.css'],
  standalone: false
})
export class CarouselCardComponent implements OnInit {
  @Input() resource!: ResourceData;

  constructor() {}

  ngOnInit() {}

  /** Decide route based on the resource type. */
  linkTo(): any[] {
    const r: any = this.resource;
    if (!r) return ['/'];

    // 1) Prefer class checks (when Search mapped to model classes)
    if (r instanceof ArtistData) return ['/artist', r.id];
    if (r instanceof AlbumData)  return ['/album',  r.id];

    // 2) Fallback if a "type" field exists
    if (r.type === 'artist') return ['/artist', r.id];
    if (r.type === 'album')  return ['/album',  r.id];

    // 3) Heuristic fallback (artists often have followers)
    if ('followers' in r) return ['/artist', r.id];

    // Default to album
    return ['/album', r.id];
  }
}