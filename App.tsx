import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Share,StyleSheet,Text,View,Pressable} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {Asset} from 'expo-asset';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import {WebView} from 'react-native-webview';
import {roomFromUrl} from './src/links';
import {validSoundSettings,type SoundSettings} from './game/src/audio';
import {challengeCodeMessage} from './src/challengeCode';

function Game(){
 const web=useRef<WebView<{}>>(null),token=useRef(''),room=useRef(''),booted=useRef(false),sound=useRef<SoundSettings|null>(null);
 const [uri,setUri]=useState(''),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const subscription=Linking.addEventListener('url',({url})=>{
   const next=roomFromUrl(url);if(!next)return;room.current=next;
   if(booted.current)web.current?.injectJavaScript(`window.WC_CONFIG.room=${JSON.stringify(next)};window.WC_OPEN_ROOM?.(${JSON.stringify(next)});true;`);
  });
  let active=true;
  (async()=>{
   let saved=await SecureStore.getItemAsync('wizard-player');
   if(!saved){saved=Array.from(await Crypto.getRandomBytesAsync(32),n=>n.toString(16).padStart(2,'0')).join('');await SecureStore.setItemAsync('wizard-player',saved);}
   token.current=saved;room.current=roomFromUrl(await Linking.getInitialURL());
   const storedSound=await SecureStore.getItemAsync('wizard-sound-settings');
   try{if(storedSound)sound.current=validSoundSettings(JSON.parse(storedSound))}catch{}
   const asset=await Asset.fromModule(require('./assets/game.html')).downloadAsync();
   if(!asset.localUri)throw new Error('The bundled game could not be opened.');
   if(active)setUri(asset.localUri);
  })().catch(e=>{if(active)setError(e.message||'Could not start Wizards Chess.');});
  return()=>{active=false;subscription.remove();booted.current=false;};
 },[attempt]);
 async function message(raw:string){
  try{
   const data=JSON.parse(raw);
   if(data.type==='ready'){
    web.current?.injectJavaScript(`window.WC_PLAYER_TOKEN=${JSON.stringify(token.current)};window.WC_CONFIG.room=${JSON.stringify(room.current)};window.WC_SOUND_SETTINGS=${JSON.stringify(sound.current)};window.WC_BOOT();true;`);
    booted.current=true;
   }else if(data.type==='sound-settings'){
    sound.current=validSoundSettings(data.settings);await SecureStore.setItemAsync('wizard-sound-settings',JSON.stringify(sound.current));
   }else if((data.type==='copy-code'||data.type==='share-code')&&/^[A-F0-9]{12}$/.test(data.code)){
    if(data.type==='copy-code'){await Clipboard.setStringAsync(data.code);web.current?.injectJavaScript("window.WC_NOTICE?.('Challenge code copied.');true;");}
    else await Share.share({message:challengeCodeMessage(data.code)});
   }
  }catch{web.current?.injectJavaScript("window.WC_NOTICE?.('That action could not be completed. Please try again.');true;");}
 }
 if(error)return <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable onPress={()=>{setError('');setUri('');setAttempt(n=>n+1)}}><Text style={styles.retry}>Try again</Text></Pressable></View>;
 if(!uri)return <View style={styles.center}><ActivityIndicator color="#d4af37"/><Text style={styles.loading}>Opening Wizards Chess…</Text></View>;
 return <WebView<{}> ref={web} source={{uri}} style={styles.game} originWhitelist={['file://*','about:blank']}
  javaScriptEnabled domStorageEnabled allowFileAccess allowUniversalAccessFromFileURLs
  allowingReadAccessToURL={uri.slice(0,uri.lastIndexOf('/')+1)} androidLayerType="hardware"
  setSupportMultipleWindows={false} javaScriptCanOpenWindowsAutomatically={false}
  onShouldStartLoadWithRequest={request=>request.url===uri||request.url==='about:blank'||request.url.startsWith(uri+'#')}
  onMessage={event=>{void message(event.nativeEvent.data)}}
  onError={()=>setError('The game could not open. Please try again.')}
  onRenderProcessGone={()=>{setError('Android paused the 3D game. Tap Try again to reopen it.')}}
  onContentProcessDidTerminate={()=>web.current?.reload()}
 />;
}
export default function App(){return <SafeAreaProvider><StatusBar hidden/><SafeAreaView style={styles.game} edges={['top','bottom','left','right']}><Game/></SafeAreaView></SafeAreaProvider>}
const styles=StyleSheet.create({game:{flex:1,backgroundColor:'#080a0f'},center:{flex:1,backgroundColor:'#080a0f',alignItems:'center',justifyContent:'center',padding:24},loading:{color:'#d4af37',marginTop:16},error:{color:'#f0ece1',textAlign:'center',marginBottom:20},retry:{color:'#d4af37',padding:16,fontSize:18}});
