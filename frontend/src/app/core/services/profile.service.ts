import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfile } from '../models/application.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = `${environment.apiUrl}/profile`;
  private readonly remindersApi = `${environment.apiUrl}/reminders`;

  constructor(private readonly http: HttpClient) {}

  get(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.api);
  }

  update(payload: { skills?: string; emailRemindersEnabled?: boolean }): Observable<UserProfile> {
    return this.http.put<UserProfile>(this.api, payload);
  }

  sendReminderNow(test = true): Observable<{ sent: boolean; test: boolean; count: number; message: string }> {
    return this.http.post<{ sent: boolean; test: boolean; count: number; message: string }>(
      `${this.remindersApi}/send-now?test=${test}`,
      {}
    );
  }
}
