import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Application,
  ApplicationRequest,
  ApplicationStatus,
  Statistics
} from '../models/application.model';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private readonly api = `${environment.apiUrl}/applications`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<Application[]> {
    return this.http.get<Application[]>(this.api);
  }

  getById(id: number): Observable<Application> {
    return this.http.get<Application>(`${this.api}/${id}`);
  }

  create(payload: ApplicationRequest): Observable<Application> {
    return this.http.post<Application>(this.api, payload);
  }

  update(id: number, payload: ApplicationRequest): Observable<Application> {
    return this.http.put<Application>(`${this.api}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  updateStatus(id: number, status: ApplicationStatus): Observable<Application> {
    return this.http.patch<Application>(`${this.api}/${id}/status`, { status });
  }

  markFollowUp(id: number, number: 1 | 2): Observable<Application> {
    return this.http.patch<Application>(`${this.api}/${id}/follow-up/${number}`, {});
  }

  followUpsToday(): Observable<Application[]> {
    return this.http.get<Application[]>(`${this.api}/follow-ups/today`);
  }

  statistics(): Observable<Statistics> {
    return this.http.get<Statistics>(`${this.api}/statistics`);
  }

  uploadScreenshot(id: number, file: File): Observable<Application> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Application>(`${this.api}/${id}/screenshot`, formData);
  }

  screenshotUrl(id: number): string {
    return `${this.api}/${id}/screenshot`;
  }
}
