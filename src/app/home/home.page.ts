import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {

  selectedFiles: any[] = [];
  deezerResults: any[] = [];

  currentTrack: any = null;
  playQueue: any[] = [];
  currentPlaylist: any[] = [];
  currentIndex: number = -1;

  playbackState: 'playing' | 'paused' | 'stopped' = 'stopped';

  audio = new Audio();
  progress = 0;
  currentTime = '0:00';
  totalTime = '0:00';
  volume: number = 1.0;

  private storage: Storage | null = null;

  constructor(private http: HttpClient, private storageService: Storage) {
    this.initStorage();
  }

  async initStorage() {
    this.storage = await this.storageService.create();
    this.loadPlaylists();
    const savedVolume = await this.storage.get('volumePreference');
    if (savedVolume !== null) {
      this.volume = savedVolume;
      this.audio.volume = this.volume;
    }
  }

  async savePlaylist() {
    if (this.storage) {
      await this.storage.set('userPlaylist', this.currentPlaylist);
    }
  }

  async loadPlaylists() {
    if (this.storage) {
      const savedPlaylist = await this.storage.get('userPlaylist');
      if (savedPlaylist) {
        this.currentPlaylist = savedPlaylist;
        this.playQueue = [...this.currentPlaylist];
      }
    }
  }

  async saveVolume() {
    if (this.storage) {
      await this.storage.set('volumePreference', this.volume);
    }
  }

  pickFiles() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mp3,.wav,.m4a,.aac,.ogg,.flac,.opus';
    input.multiple = true;
    input.onchange = (event: any) => {
      const files = Array.from(event.target.files);
      this.selectedFiles = [...this.selectedFiles, ...files];
      this.currentPlaylist = [...this.selectedFiles];
      this.playQueue = [...this.currentPlaylist];
      this.savePlaylist();
    };
    input.click();
  }

  playTrack(track: any, fromSearch: boolean = false) {
    if (fromSearch) {
      this.currentPlaylist.push(track);
      this.playQueue.push(track);
      this.currentIndex = this.playQueue.length - 1;
      this.savePlaylist();
    } else {
      this.currentIndex = this.playQueue.indexOf(track);
    }

    this.audio.src = track.source === 'deezer' ? track.path : URL.createObjectURL(track);
    this.audio.load();
    this.audio.play();
    this.audio.volume = this.volume;

    this.currentTrack = track;
    this.playbackState = 'playing';

    this.audio.ontimeupdate = () => {
      this.progress = (this.audio.currentTime / this.audio.duration) * 100;
      this.currentTime = this.formatTime(this.audio.currentTime);
      this.totalTime = this.formatTime(this.audio.duration);
    };

    this.audio.onended = () => {
      this.nextTrack();
    };
  }

  pauseTrack() {
    this.audio.pause();
    this.playbackState = 'paused';
  }

  resumeTrack() {
    this.audio.play();
    this.playbackState = 'playing';
  }

  stopTrack() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.progress = 0;
    this.currentTrack = null;
    this.playbackState = 'stopped';
  }

  nextTrack() {
    if (this.currentIndex < this.playQueue.length - 1) {
      this.currentIndex++;
      this.playTrack(this.playQueue[this.currentIndex]);
    } else {
      this.stopTrack();
    }
  }

  previousTrack() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.playTrack(this.playQueue[this.currentIndex]);
    }
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
        image: track.album.cover_medium || 'assets/placeholder.png',
        source: 'deezer',
      }));
    });
  }

  onVolumeChange(event: any) {
    this.audio.volume = this.volume;
    this.saveVolume();
  }
}
