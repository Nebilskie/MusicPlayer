import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {

  selectedFiles: any[] = [];
  currentTrack: any = null;
  audio = new Audio();
  progress = 0;
  currentTime = '0:00';
  totalTime = '0:00';
  deezerResults: any[] = [];

  constructor(private http: HttpClient) {}

  pickFiles() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mp3,.wav,.m4a,.aac,.ogg,.flac,.opus';
    input.multiple = true;
    input.onchange = (event: any) => {
      const files = Array.from(event.target.files);
      this.selectedFiles = [...this.selectedFiles, ...files];
    };
    input.click();
  }

  playTrack(track: any) {
    this.audio.src = track.source === 'deezer' ? track.path : URL.createObjectURL(track);
    this.audio.load();
    this.audio.play();
    this.currentTrack = track;

    this.audio.ontimeupdate = () => {
      this.progress = (this.audio.currentTime / this.audio.duration) * 100;
      this.currentTime = this.formatTime(this.audio.currentTime);
      this.totalTime = this.formatTime(this.audio.duration);
    };
  }

  formatTime(time: number): string {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  onDeezerInput(event: any) {
    const value = event.detail.value;
    if (value && value.trim() !== '') {
      this.searchDeezer(value);
    } else {
      this.deezerResults = [];
    }
  }

  searchDeezer(query: string) {
    const apiUrl = `https://deezer-proxy-server-k7xr.onrender.com/deezer/search?q=${encodeURIComponent(query)}`;
    this.http.get(apiUrl).subscribe((res: any) => {
      this.deezerResults = res.data.map((track: any) => ({
        name: `${track.title_short} - ${track.artist.name}`,
        path: track.preview,
        source: 'deezer',
      }));
    });
  }
}
