export function roomFromUrl(url:string|null):string {
 if(!url)return '';
 return url.match(/(?:challenge\/|[?&]room=)([A-F0-9]{12})(?:[/?&#]|$)/i)?.[1].toUpperCase()||'';
}
