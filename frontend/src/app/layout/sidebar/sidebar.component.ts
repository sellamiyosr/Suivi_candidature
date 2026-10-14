import { Component, EventEmitter, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Output() navigate = new EventEmitter<void>();

  readonly links = [
    { path: '/dashboard', label: 'Dashboard', icon: '◫' },
    { path: '/applications', label: 'Mes candidatures', icon: '☰' },
    { path: '/applications/new', label: 'Nouvelle', icon: '+' },
    { path: '/settings', label: 'Paramètres', icon: '⚙' }
  ];
}
