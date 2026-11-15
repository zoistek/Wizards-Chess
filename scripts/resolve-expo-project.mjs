import {appendFileSync} from 'node:fs';
async function query(query,variables={}){
 const r=await fetch('https://api.expo.dev/graphql',{method:'POST',headers:{Authorization:`Bearer ${process.env.EXPO_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30000)});
 const data=await r.json();if(!r.ok||data.errors)throw new Error(JSON.stringify(data.errors||{status:r.status}));return data.data;
}
if(!process.env.EXPO_TOKEN)throw new Error('The GitHub EXPO secret is empty.');
const {meActor}=await query('query { meActor { accounts { name } } }');
const matches=[];
for(const account of meActor.accounts){
 const {app}=await query('query($fullName:String!){app{byFullName(fullName:$fullName){id name slug fullName ownerAccount{name} githubRepository{metadata{githubRepoOwnerName githubRepoName}}}}}',{fullName:`@${account.name}/wizards-chess`}).catch(()=>({app:null}));
 if(app?.byFullName)matches.push(app.byFullName);
}
if(matches.length!==1)throw new Error(`Expected exactly one existing wizards-chess project; found ${matches.length}. No project was created or build started.`);
const app=matches[0];const linked=app.githubRepository?.metadata;
if(linked&&(linked.githubRepoOwnerName.toLowerCase()!=='zoistek'||linked.githubRepoName.toLowerCase()!=='wizards-chess'))throw new Error('Expo project links to a different repository.');
console.log(JSON.stringify({projectId:app.id,owner:app.ownerAccount.name,slug:app.slug,fullName:app.fullName,repository:linked||null}));
appendFileSync(process.env.GITHUB_ENV,`EXPO_PROJECT_ID=${app.id}\nEXPO_OWNER=${app.ownerAccount.name}\n`);
appendFileSync(process.env.GITHUB_STEP_SUMMARY,`Verified existing Expo project: **${app.fullName}** (${app.id}).\n`);
