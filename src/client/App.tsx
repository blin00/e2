import React, { ChangeEvent } from 'react';
// @ts-ignore
import * as timesync from 'timesync';
import { io, Socket } from 'socket.io-client';
import { PlayerState } from '../types';

interface AppProps {
    videoUrl: string,
    skew: number,
}
interface AppState {
    connected: boolean,
    sync: boolean,
    autopush: boolean,
    showpush: boolean,
}

class App extends React.Component<AppProps, AppState> {
    ts: any;
    video: React.RefObject<HTMLVideoElement>;
    lastReceivedState: PlayerState | null;
    socket: Socket;

    constructor(props: AppProps) {
        super(props);
        this.state = {
            connected: false,
            sync: false,
            autopush: false,
            showpush: false,
        };
        this.video = React.createRef();
        this.lastReceivedState = null;
        this.socket = io();
        this.socket.on('connect', () => this.setState({connected: this.socket.connected}));
        this.socket.on('connect_error', () => {
            console.log('connection error: trying to reconnect');
            this.setState({connected: this.socket.connected});
            setTimeout(() => this.socket.connect(), 1000);
        });
        this.socket.on('disconnect', () => this.setState({connected: this.socket.connected}));
        this.socket.on('state', (state: PlayerState | null) => {
            this.lastReceivedState = state;
            this.updateVideoPlayer();
        });
        this.socket.on('timesync', (data: any) => {
            this.ts.receive(null, data);
        });
        this.ts = timesync.create({
            interval: 30000,
            server: this.socket,
            timeout: 1000,
        });
        this.ts.send = (socket: Socket, data: any, timeout: number) => {
            return new Promise<void>(function(resolve, reject) {
                let timeoutFn = setTimeout(reject, timeout);
                socket.emit('timesync', data, () => {
                    clearTimeout(timeoutFn);
                    resolve();
                });
            });
        };
    }

    pushState = () => {
        const videoElement = this.video.current;
        if (videoElement == null) {
            console.log('null video player');
            return;
        }
        const newState = {
            time: this.ts.now(),
            seek: videoElement.currentTime,
            play: !videoElement.paused,
        };
        this.socket.emit('pushState', newState);
        this.lastReceivedState = newState;
    }
    updateVideoPlayer = () => {
        const videoElement = this.video.current;
        if (videoElement == null) {
            console.log('null video player');
            return;
        }
        if (this.state.autopush) {
            videoElement.playbackRate = 1;
            this.pushState();
            return;
        }
        if (!this.state.sync) {
            videoElement.playbackRate = 1;
            return;
        }
        if (this.lastReceivedState == null) return;
        if (this.lastReceivedState.play) {
            // attempt to play
            videoElement.play();
            const currentTime = videoElement.currentTime;
            const correctedTime = (this.ts.now() - this.lastReceivedState.time) / 1000 + this.lastReceivedState.seek;
            console.log(`time delta: ${(this.ts.now() - Date.now())}`);
            console.log(`video delta: ${(currentTime - correctedTime) * 1000}`);
            const absDelta = Math.abs(currentTime - correctedTime);
            if (absDelta > 2) {
                console.log('  correcting with jump');
                videoElement.currentTime = correctedTime;
            } else if (absDelta > 1) {
                console.log('  correcting with skew');
                if (correctedTime > currentTime) {
                    videoElement.playbackRate = this.props.skew;
                } else {
                    videoElement.playbackRate = 1 / this.props.skew;
                }
            } else {
                videoElement.playbackRate = 1;
            }
        } else {
            videoElement.pause();
            videoElement.currentTime = this.lastReceivedState.seek;
        }
    }
    render() {
        return <>
            <div id="video-container">
                <video
                    ref={this.video}
                    controls
                    height="480"
                    src={this.props.videoUrl}
                    onPlay={() => this.updateVideoPlayer()}
                    onPause={() => this.updateVideoPlayer()}
                    onTimeUpdate={() => this.updateVideoPlayer()}
                />
            </div>
            <div style={{margin: 5}}>
                <div>
                    <input type="checkbox" checked={this.state.sync} onChange={(event) => {
                        this.setState({sync: event.target.checked}, this.updateVideoPlayer);
                    }} />
                    <label>Sync playback</label>
                </div>
                <div>
                    <input type="checkbox" checked={this.state.showpush} onChange={(event) => {
                        this.setState({showpush: event.target.checked});
                    }} />
                    <label>Show options for daily push oncall...</label>
                </div>
                {this.state.showpush &&
                    <div style={{marginTop: 5}}>
                        <button onClick={() => this.pushState()}>Push</button>
                        <input type="checkbox" checked={this.state.autopush} onChange={(event) => {
                            this.setState({autopush: event.target.checked});
                        }} />
                        <label>Autopush</label>
                    </div>
                }
            </div>
        </>;
    }
}

export default App;