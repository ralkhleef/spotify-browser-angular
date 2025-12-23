import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-thermometer',
  templateUrl: './thermometer.component.html',
  styleUrls: ['./thermometer.component.css'],
  standalone: false
})
export class ThermometerComponent implements OnInit {
  // Label to show on the bar, e.g., "Popularity" or "Energy"
  @Input() label: string = 'Popularity';

  // May be 0..100, 0..1, or null (hidden until data arrives)
  @Input() percent: number | null = null;

  constructor() {}
  ngOnInit() {}

  // Normalize to 0..100 for width display
  get normalizedPercent(): number {
    const raw = this.percent;
    const n = raw == null ? NaN : Number(raw);  // coerce strings/undefined
    if (!Number.isFinite(n)) return 0;
    const p = n <= 1 ? n * 100 : n;             // allow 0..1 or 0..100
    return Math.max(0, Math.min(100, Math.round(p)));
  }

  // Text to show inside the bar
  get displayText(): string {
    const label = this.label || 'Popularity';
    return `${label}: ${Math.round(this.normalizedPercent)}%`;
  }

  // Simple red→orange→green ramp based on percent
  getBarColor(): string {
    const p = this.normalizedPercent; 
    if (p < 33) return '#c0392b';    
    if (p < 66) return '#e67e22';    
    return '#27ae60';                
  }
}