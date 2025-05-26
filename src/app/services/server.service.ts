import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ServerService {
  private deezerUrl = 'https://deezerdevs-deezer.p.rapidapi.com/search';
  private headers = new HttpHeaders({
    'X-RapidAPI-Key': environment.rapidApiKey,
    'X-RapidAPI-Host': 'deezerdevs-deezer.p.rapidapi.com'
  });

  constructor(private http: HttpClient) {}

  searchDeezer(query: string): Observable<any> {
    return this.http.get(`${this.deezerUrl}?q=${encodeURIComponent(query)}`, {
      headers: this.headers
    });
  }
}
