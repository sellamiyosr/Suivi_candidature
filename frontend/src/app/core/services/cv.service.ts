import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CvInfo, MatchResult } from '../models/application.model';

@Injectable({ providedIn: 'root' })
export class CvService {
  private readonly api = `${environment.apiUrl}/cv`;
  private readonly matchApi = `${environment.apiUrl}/match`;

  constructor(private readonly http: HttpClient) {}

  info(): Observable<CvInfo> {
    return this.http.get<CvInfo>(this.api);
  }

  upload(file: File): Observable<CvInfo> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CvInfo>(this.api, formData);
  }

  delete(): Observable<void> {
    return this.http.delete<void>(this.api);
  }

  download(): Observable<Blob> {
    return this.http.get(`${this.api}/download`, { responseType: 'blob' });
  }

  previewMatch(payload: {
    jobTitle?: string | null;
    description?: string | null;
    skills?: string | null;
    importantElements?: string | null;
  }): Observable<MatchResult> {
    return this.http.post<MatchResult>(`${this.matchApi}/preview`, payload);
  }
}
