const administration = document.getElementById('adminApp');
if (administration) {
  const syncAuthentication = () => document.body.classList.toggle('admin-authenticated', !administration.hidden);
  new MutationObserver(syncAuthentication).observe(administration, {attributes:true,attributeFilter:['hidden']});
  syncAuthentication();
  const navigationLinks = [...document.querySelectorAll('.admin-sidebar nav a')];
  const activate = (id) => navigationLinks.forEach(link => {
    if (link.hash === `#${id}`) link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  });
  navigationLinks.forEach(link => link.addEventListener('click', () => activate(link.hash.slice(1))));
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => a.boundingClientRect.top-b.boundingClientRect.top);
    if (visible.length) activate(visible[0].target.id);
  }, {rootMargin:'-110px 0px -60% 0px'});
  navigationLinks.forEach(link => {const target=document.getElementById(link.hash.slice(1));if(target)observer.observe(target);});
}
