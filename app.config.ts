import type { ExpoConfig } from 'expo/config';
const projectId=process.env.EXPO_PROJECT_ID||'1d666e75-5074-4a05-be7e-4eba46ca7b7b';
export default ():ExpoConfig=>({
 name:'Wizards chess',owner:process.env.EXPO_OWNER||'zoistek',slug:'wizards-chess',version:'0.1.0',scheme:'wizardschess',orientation:'default',
 icon:'./assets/wizards-chess-icon.png',
 userInterfaceStyle:'dark',backgroundColor:'#080a0f',
 ios:{supportsTablet:true,bundleIdentifier:'com.zoistek.wizardschess.test'},
 android:{package:'com.zoistek.wizardschess.test',softwareKeyboardLayoutMode:'resize'},
 plugins:['expo-asset','expo-secure-store'],
 extra:{testBranch:'test/expo-app',...(projectId?{eas:{projectId}}:{})}
});
