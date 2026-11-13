import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';

interface NavLink {
  path: string;
  label: string;
  icon: string;
  exact: boolean;
  children?: { path: string; label: string }[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() navigate = new EventEmitter<void>();
  @Output() toggleCollapse = new EventEmitter<void>();

  /** Les paramètres d'URL (?tab=…) ne doivent pas désactiver le lien. */
  readonly exactMatch: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    fragment: 'ignored',
    matrixParams: 'ignored'
  };
  readonly subsetMatch: IsActiveMatchOptions = {
    paths: 'subset',
    queryParams: 'ignored',
    fragment: 'ignored',
    matrixParams: 'ignored'
  };

  readonly links: NavLink[] = [
    { path: '/dashboard', label: 'Tableau de bord', icon: 'home', exact: true },
    {
      path: '/applications',
      label: 'Candidatures',
      icon: 'list',
      exact: false,
      children: [{ path: '/applications/new', label: 'Nouvelle candidature' }]
    },
    { path: '/settings', label: 'Paramètres', icon: 'settings', exact: true }
  ];
}
