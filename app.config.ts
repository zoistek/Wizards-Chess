import type { ExpoConfig } from 'expo/config';
const projectId=process.env.EXPO_PROJECT_ID;
export default ():ExpoConfig=>({
 name:'Wizards chess',slug:'wizards-chess',version:'0.1.0',scheme:'wizardschess',orientation:'default',
 icon:'./assets/wizards-chess-icon.png',
 userInterfaceStyle:'dark',backgroundColor:'#080a0f',
 ios:{supportsTablet:true,bundleIdentifier:'com.zoistek.wizardschess.test'},
 android:{package:'com.zoistek.wizardschess.test',softwareKeyboardLayoutMode:'resize'},
 plugins:['expo-asset','expo-secure-store'],
 extra:{testBranch:'test/expo-app',...(projectId?{eas:{projectId}}:{})}
});
