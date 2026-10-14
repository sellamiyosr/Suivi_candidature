import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { STATUS_LABELS, Statistics } from '../../../core/models/application.model';

Chart.register(...registerables);

@Component({
  selector: 'app-statistics',
  standalone: true,
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.scss'
})
export class StatisticsComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) stats!: Statistics;

  @ViewChild('monthCanvas') monthCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('platformCanvas') platformCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusCanvas') statusCanvas?: ElementRef<HTMLCanvasElement>;

  private monthChart?: Chart;
  private platformChart?: Chart;
  private statusChart?: Chart;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderCharts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stats'] && this.viewReady) {
      this.renderCharts();
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  private renderCharts(): void {
    if (!this.stats) {
      return;
    }
    this.renderMonthChart();
    this.renderPlatformChart();
    this.renderStatusChart();
  }

  private renderMonthChart(): void {
    const labels = Object.keys(this.stats.byMonth);
    const data = Object.values(this.stats.byMonth);
    this.monthChart = this.upsertChart(this.monthChart, this.monthCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Candidatures',
            data,
            backgroundColor: '#6366F1',
            borderRadius: 6,
            maxBarThickness: 36
          }
        ]
      },
      options: this.baseOptions('Par mois')
    });
  }

  private renderPlatformChart(): void {
    const labels = Object.keys(this.stats.byPlatform);
    const data = Object.values(this.stats.byPlatform);
    const colors = this.palette(labels.length);
    const textColor =
      getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#64748b';
    this.platformChart = this.upsertChart(this.platformChart, this.platformCanvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor } },
          title: {
            display: true,
            text: 'Par plateforme',
            color: textColor,
            font: { size: 13, weight: 600 }
          }
        }
      }
    });
  }

  private renderStatusChart(): void {
    const entries = Object.entries(this.stats.byStatus);
    const labels = entries.map(([key]) => STATUS_LABELS[key as keyof typeof STATUS_LABELS] ?? key);
    const data = entries.map(([, value]) => value);
    this.statusChart = this.upsertChart(this.statusChart, this.statusCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Candidatures',
            data,
            backgroundColor: [
              '#818cf8',
              '#fb923c',
              '#f97316',
              '#a78bfa',
              '#4ade80',
              '#f87171',
              '#94a3b8'
            ],
            borderRadius: 6,
            maxBarThickness: 28
          }
        ]
      },
      options: this.baseOptions('Par statut')
    });
  }

  private upsertChart(
    existing: Chart | undefined,
    canvas: ElementRef<HTMLCanvasElement> | undefined,
    config: ChartConfiguration
  ): Chart | undefined {
    if (!canvas) {
      return existing;
    }
    existing?.destroy();
    return new Chart(canvas.nativeElement, config);
  }

  private destroyCharts(): void {
    this.monthChart?.destroy();
    this.platformChart?.destroy();
    this.statusChart?.destroy();
  }

  private baseOptions(title: string): ChartConfiguration['options'] {
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#64748b';
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#e2e8f0';
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: title,
          color: textColor,
          font: { size: 13, weight: 600 }
        }
      },
      scales: {
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        },
        y: {
          beginAtZero: true,
          ticks: { color: textColor, precision: 0 },
          grid: { color: gridColor }
        }
      }
    };
  }

  private palette(count: number): string[] {
    const colors = ['#6366F1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#84cc16'];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  }
}
