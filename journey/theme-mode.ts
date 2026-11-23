/** Light or dark portal theme, chosen by the user (never automatic) and remembered on this device. */
export function setTheme(mode:'light'|'dark'){if(mode==='dark')document.documentElement.dataset.theme='dark';else delete document.documentElement.dataset.theme;try{localStorage.setItem('pw-theme',mode);}catch{/* private mode: the choice lasts for this visit */}}
export function applySavedTheme(){let saved:string|null=null;try{saved=localStorage.getItem('pw-theme');}catch{/* storage unavailable */}if(saved==='dark')document.documentElement.dataset.theme='dark';}
