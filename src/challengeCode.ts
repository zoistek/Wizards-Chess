export function normalizeChallengeCode(value:string):string {
 const code=value.replace(/[\s-]/g,'').toUpperCase();
 if(!/^[A-F0-9]{12}$/.test(code))throw new Error('Enter a valid 12-character challenge code.');
 return code;
}
export function challengeCodeMessage(code:string):string {
 return 'Wizards chess challenge code: '+normalizeChallengeCode(code);
}
