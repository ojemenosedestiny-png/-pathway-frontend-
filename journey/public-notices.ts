import {api} from './live-api.js';
import {esc} from './components.js';
import {sanitizeRichText} from './rich-text.js';
export async function insertPosts(target:HTMLElement,placement:string){
 const posts=await api<any[]>('/public/announcements?take=100');
 const selected=posts.filter(post=>post.channels?.includes(placement==='News page'?'NEWS':'BANNER'));
 if(!selected.length)return;
 const section=document.createElement('section');section.className='j-container j-stack';
 section.innerHTML=selected.map(post=>`<article class="j-card"><p class="j-kicker">${esc(post.category||'School update')}</p><h2>${esc(post.title)}</h2><div class="j-rich-content">${sanitizeRichText(post.body)}</div></article>`).join('');target.prepend(section);
}
