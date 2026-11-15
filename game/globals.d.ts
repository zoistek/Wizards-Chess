interface Window {WC_BOOT:()=>void;}

declare module '*.css';

interface Window {
 WC_STONE_AUDIO?: string;
 WC_SOUND_SETTINGS?: import('./src/audio').SoundSettings;
 ReactNativeWebView?: {postMessage:(message:string)=>void};
}
