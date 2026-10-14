import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Application } from '../../../core/models/application.model';
import {
  followUpDueLabel,
  nextFollowUpNumber
} from '../../../core/utils/follow-up-message';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';

@Component({
  selector: 'app-follow-up-list',
  standalone: true,
  imports: [RouterLink, StatusBadgeComponent],
  templateUrl: './follow-up-list.component.html',
  styleUrl: './follow-up-list.component.scss'
})
export class FollowUpListComponent {
  @Input({ required: true }) applications: Application[] = [];
  @Input() loading = false;
  @Output() relancer = new EventEmitter<Application>();

  labelFor(app: Application): string {
    return followUpDueLabel(app);
  }

  nextNumber(app: Application): 1 | 2 | null {
    return nextFollowUpNumber(app);
  }

  onRelancer(app: Application, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.relancer.emit(app);
  }
}
