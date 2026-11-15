import {appendFileSync} from 'node:fs';
const id='0cab712a-1d86-486d-9229-d1726f772c61';
async function query(query,variables={}){
 const r=await fetch('https://api.expo.dev/graphql',{method:'POST',headers:{Authorization:`Bearer ${process.env.EXPO_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30000)});
 const d=await r.json();if(!r.ok||d.errors)throw new Error(JSON.stringify(d.errors||{status:r.status}));return d.data;
}
const {builds}=await query('query($id:ID!){builds{byId(buildId:$id){id status platform distribution app{id} error{message} artifacts{buildUrl}}}}',{id});
const b=builds.byId;if(b.app.id!=='1d666e75-5074-4a05-be7e-4eba46ca7b7b'||b.platform!=='ANDROID'||b.distribution!=='INTERNAL')throw new Error('Unexpected project or distribution.');
console.log(JSON.stringify({status:b.status,error:b.error}));
if(b.status!=='FINISHED')throw new Error('The APK is not ready for download.');
await query('mutation($data:AppDataInput!){me{updateApp(appData:$data){id internalDistributionBuildPrivacy}}}',{data:{id:b.app.id,internalDistributionBuildPrivacy:'PUBLIC'}});
const download=await fetch(b.artifacts.buildUrl,{method:'HEAD',signal:AbortSignal.timeout(30000)});
if(!download.ok)throw new Error(`Anonymous APK download returned ${download.status}`);
console.log(JSON.stringify({anonymousDownloadStatus:download.status,contentType:download.headers.get('content-type')}));
const url=`https://expo.dev/accounts/zoistek/projects/wizards-chess/builds/${id}`;
console.log(JSON.stringify({downloadPage:url,apk:b.artifacts.buildUrl,access:'PUBLIC'}));
appendFileSync(process.env.GITHUB_STEP_SUMMARY,`[Install Wizards chess for Android](${url})\n\n[Download APK](${b.artifacts.buildUrl})\n\nAnyone with the link can download.\n`);
