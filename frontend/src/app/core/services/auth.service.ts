import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthRequest, AuthResponse } from '../models/auth.model';

const TOKEN_KEY = 'pfe_token';
const EMAIL_KEY = 'pfe_email';
const USER_ID_KEY = 'pfe_user_id';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = `${environment.apiUrl}/auth`;

  readonly email = signal<string | null>(localStorage.getItem(EMAIL_KEY));
  readonly isAuthenticated = signal<boolean>(!!localStorage.getItem(TOKEN_KEY));

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

  register(payload: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/register`, payload).pipe(
      tap((res) => this.persistSession(res))
    );
  }

  login(payload: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/login`, payload).pipe(
      tap((res) => this.persistSession(res))
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(USER_ID_KEY);
    try {
      // Conversation de l'assistant : ne doit pas passer d'un compte à l'autre
      sessionStorage.removeItem('pfe_chat_history');
    } catch {
      /* stockage indisponible : ignorer */
    }
    this.email.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private persistSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(EMAIL_KEY, res.email);
    localStorage.setItem(USER_ID_KEY, String(res.userId));
    this.email.set(res.email);
    this.isAuthenticated.set(true);
  }
}
