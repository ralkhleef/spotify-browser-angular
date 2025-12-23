import { Component, OnInit, Input, ElementRef, ViewChild } from '@angular/core';
import { ResourceData } from '../../data/resource-data';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
  standalone: false
})
export class CarouselComponent implements OnInit {
  @Input() carouselId: string;
  @Input() resources: ResourceData[];
  @ViewChild('rail') railRef?: ElementRef<HTMLDivElement>;

  constructor() {}

  ngOnInit() {}

  // for data-bs-target binding
  get carouselIdForBinding(): string {
    return '#' + this.carouselId;
  }

  trackById = (_: number, r: ResourceData) => r.id;

  scrollBy(amount: number): void {
    const rail = this.railRef?.nativeElement;
    if (!rail) return;
    rail.scrollBy({ left: amount, behavior: 'smooth' });
  }

  scrollLeft(): void {
    const rail = this.railRef?.nativeElement;
    if (!rail) return;
    this.scrollBy(-rail.clientWidth * 0.8);
  }

  scrollRight(): void {
    const rail = this.railRef?.nativeElement;
    if (!rail) return;
    this.scrollBy(rail.clientWidth * 0.8);
  }

}
