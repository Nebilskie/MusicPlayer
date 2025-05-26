import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';
import { ToastController } from '@ionic/angular';
import { ServerService } from '../services/server.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {

  selectedFiles: any[] = [];
  deezerResults: any[] = [];
  topTracks: any[] = [];

  currentTrack: any = null;
  playQueue: any[] = [];
  currentPlaylist: any[] = [];
  userPlaylists: { name: string, tracks: any[] }[] = [];
  currentPlaylistName: string = '';
  currentIndex: number = -1;

  playbackState: 'playing' | 'paused' | 'stopped' = 'stopped';

  audio = new Audio();
  progress = 0;
  currentTime = '0:00';
  totalTime = '0:00';
  volume: number = 1.0;

  private storage: Storage | null = null;

  constructor(
    private http: HttpClient,
    private storageService: Storage,
    private serverService: ServerService,
    private toastController: ToastController
  ) {
    this.initStorage();
  }

  ngOnInit() {
    this.getTopDeezerTracks();
  }

  async initStorage() {
  this.storage = await this.storageService.create();

  const savedVolume = await this.storage.get('volumePreference');
  if (savedVolume !== null) {
    this.volume = savedVolume;
    this.audio.volume = this.volume;
  }

  // Load local tracks
  const savedTracks = await this.storage.get('localTracks');
  if (savedTracks) {
    this.selectedFiles = savedTracks;
  }

  await this.loadPlaylists();

  if (this.userPlaylists.length === 0) {
    await this.addNewPlaylist('Favorites', []);
    this.currentPlaylist = this.userPlaylists[0].tracks;
    this.playQueue = [...this.currentPlaylist];
    this.currentPlaylistName = 'Favorites';
  }
}


  async saveAllPlaylists() {
    if (this.storage) {
      await this.storage.set('userPlaylists', this.userPlaylists);
    }
  }

  async loadPlaylists() {
    if (this.storage) {
      const savedPlaylists = await this.storage.get('userPlaylists');
      if (savedPlaylists) {
        this.userPlaylists = savedPlaylists;
        if (this.userPlaylists.length > 0) {
          this.currentPlaylist = this.userPlaylists[0].tracks;
          this.playQueue = [...this.currentPlaylist];
          this.currentPlaylistName = this.userPlaylists[0].name;
        }
      }
    }
  }

  async saveVolume() {
    if (this.storage) {
      await this.storage.set('volumePreference', this.volume);
    }
  }

  async addNewPlaylist(name: string, tracks: any[] = []) {
    const existing = this.userPlaylists.find(pl => pl.name === name);
    if (!existing) {
      this.userPlaylists.push({ name, tracks });
      await this.saveAllPlaylists();
    } else {
      this.showToast('Playlist name already exists.');
    }
  }

  async addNewPlaylistPrompt() {
    const name = prompt('Enter new playlist name:');
    if (name && name.trim() !== '') {
      await this.addNewPlaylist(name.trim(), []);
    }
  }

  async addSongToPlaylist(playlistName: string, track: any) {
    const playlist = this.userPlaylists.find(pl => pl.name === playlistName);
    if (playlist) {
      const alreadyExists = playlist.tracks.some(
        t => t.name === track.name && t.path === track.path
      );

      if (!alreadyExists) {
        playlist.tracks.push(track);
        await this.saveAllPlaylists();

        // 🔄 Refresh playlist view if it's the current one
        if (this.currentPlaylistName === playlistName) {
          this.currentPlaylist = [...playlist.tracks];
          this.playQueue = [...playlist.tracks];
        }

        this.showToast(`Track added to ${playlistName}`);
      } else {
        this.showToast('Track already exists in the playlist');
      }
    } else {
      this.showToast('Playlist not found');
    }
  }


  async deletePlaylist(name: string) {
    const confirmed = confirm(`Delete playlist "${name}"?`);
    if (confirmed) {
      this.userPlaylists = this.userPlaylists.filter(pl => pl.name !== name);
      await this.saveAllPlaylists();
      this.showToast('Playlist deleted');
    }
  }

  async removeTrackFromPlaylist(playlistName: string, track: any) {
  const playlist = this.userPlaylists.find(pl => pl.name === playlistName);
  if (playlist) {
    // Match by a unique property (like name + path or file name)
    playlist.tracks = playlist.tracks.filter(t => t.name !== track.name || t.path !== track.path);
    await this.saveAllPlaylists();

    // Refresh the current playlist in UI
    if (this.currentPlaylistName === playlistName) {
      this.currentPlaylist = [...playlist.tracks];
      this.playQueue = [...playlist.tracks];
    }

    this.showToast('Track removed from playlist');
  }
}


  shufflePlaylist(playlistName: string) {
    const playlist = this.userPlaylists.find(pl => pl.name === playlistName);
    if (playlist) {
      this.playQueue = [...playlist.tracks];
      for (let i = this.playQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.playQueue[i], this.playQueue[j]] = [this.playQueue[j], this.playQueue[i]];
      }
      this.playTrack(this.playQueue[0]);
    }
  }

  playPlaylist(name: string) {
    const playlist = this.userPlaylists.find(pl => pl.name === name);
    if (playlist) {
      this.currentPlaylist = playlist.tracks;
      this.playQueue = [...this.currentPlaylist];
      this.currentPlaylistName = name;
      if (this.playQueue.length > 0) {
        this.playTrack(this.playQueue[0]);
      }
    }
  }

  pickFiles() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.mp3,.wav,.m4a,.aac,.ogg,.flac,.opus';
  input.multiple = true;

  input.onchange = async (event: any) => {
    const files = Array.from(event.target.files as File[]);

    for (const file of files) {
      const base64 = await this.convertFileToBase64(file);
      const track = {
        name: file.name,
        fileData: base64,
        fileType: file.type,
        source: 'local',
        image: 'assets/placeholder.png'
      };

      this.selectedFiles.push(track);
    }

    await this.saveLocalTracks();
    this.showToast('Local tracks added.');
  };

  input.click();
}

  async saveLocalTracks() {
  if (this.storage) {
    await this.storage.set('localTracks', this.selectedFiles);
  }
}

convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}


  playTrack(track: any, fromSearch: boolean = false) {
  if (fromSearch) {
    // No longer push to playlist or playQueue automatically
    this.currentTrack = track;
    this.playQueue = [track];
    this.currentIndex = 0;
  } else {
    this.currentIndex = this.playQueue.indexOf(track);
  }

  this.audio.src = track.source === 'deezer'
    ? track.path
    : track.fileData;

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
    this.serverService.searchDeezer(query).subscribe((res: any) => {
      this.deezerResults = res.data.map((track: any) => ({
        name: `${track.title_short} - ${track.artist.name}`,
        path: track.preview,
        image: track.album.cover_medium || 'assets/placeholder.png',
        source: 'deezer',
      }));
    }, err => {
      console.error('Deezer API error:', err);
    });
  }

  getTopDeezerTracks() {
    this.serverService.searchDeezer('top hits').subscribe((res: any) => {
      this.topTracks = res.data.slice(0, 10).map((track: any) => ({
        name: `${track.title_short} - ${track.artist.name}`,
        path: track.preview,
        image: track.album.cover_medium || 'assets/placeholder.png',
        source: 'deezer',
      }));
    }, err => {
      console.error('Failed to load top tracks:', err);
    });
  }

  onVolumeChange(event: any) {
    this.audio.volume = this.volume;
    this.saveVolume();
  }

  async showToast(message: string, color: string = 'success') {
  const toast = await this.toastController.create({
    message,
    duration: 2000,
    color,
    position: 'bottom'
  });
  await toast.present();
}

}
