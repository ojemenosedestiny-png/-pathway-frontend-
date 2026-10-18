import {spherePoint,orthographicBasis,greatCircle,graticule,type GeoPoint,type Vector3} from './globe-geometry.js';

export interface GlobeDestination extends GeoPoint {name:string;href?:string;}
export interface GlobeColors {sea:string;cream:string;gold:string;label:string;}
export interface AnimatedGlobeProps {
  /** Seconds per full turn; zero disables automatic rotation. */
  rotationSpeed?:number;
  destinations?:GlobeDestination[];
  origin?:GlobeDestination;
  colors?:Partial<GlobeColors>;
  initialRotation?:[number,number];
}
export const studyDestinations:GlobeDestination[]=[
  {name:'United Kingdom',lat:51.5074,lon:-.1278},
  {name:'Canada',lat:45.4215,lon:-75.6972},
  {name:'United States',lat:38.9072,lon:-77.0369},
  {name:'United Arab Emirates',lat:24.4539,lon:54.3773},
];
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const fade=(depth:number)=>clamp(depth/.15,0,1);
interface Route {destination:GlobeDestination;point:Vector3;path:Vector3[];label:HTMLElement;width:number;height:number;}

/** Reusable canvas globe. Call destroy() before removing its host from the DOM. */
export class AnimatedGlobe {
  private canvas=document.createElement('canvas');
  private context:CanvasRenderingContext2D;
  private colors:GlobeColors;
  private routes:Route[]=[];
  private grid=graticule();
  private origin:GlobeDestination;
  private originPoint:Vector3;
  private speed:number;
  private yaw:number;
  private pitch:number;
  private width=400;
  private height=400;
  private ratio=1;
  private frame=0;
  private lastTime=0;
  private elapsed=0;
  private velocity=0;
  private hovered=false;
  private focused=false;
  private inView=false;
  private destroyed=false;
  private drag:{id:number;x:number;y:number}|null=null;
  private active=-1;
  private media=matchMedia('(prefers-reduced-motion: reduce)');
  private intersection:IntersectionObserver;
  private resizeObserver:ResizeObserver;
  private events=new AbortController();

  constructor(private host:HTMLElement,props:AnimatedGlobeProps={}) {
    this.colors={sea:'#123c32',cream:'#f9efda',gold:'#d8b975',label:'#183f34',...props.colors};
    this.speed=Number.isFinite(props.rotationSpeed)?Math.max(0,props.rotationSpeed):60;
    [this.yaw,this.pitch]=props.initialRotation||[15,18];
    this.origin=props.origin||{name:'Abuja, Nigeria',lat:9.0765,lon:7.3986};
    this.originPoint=spherePoint(this.origin);
    host.classList.add('j-globe','j-animated-globe');
    host.setAttribute('role','group');host.setAttribute('aria-label','Animated globe showing study destinations');
    host.tabIndex=0;
    host.setAttribute('aria-description','Drag or use the arrow keys to rotate. Rotation pauses on hover or keyboard focus.');
    for(const [key,value]of Object.entries(this.colors))host.style.setProperty('--globe-'+key,value);
    this.canvas.setAttribute('aria-hidden','true');host.replaceChildren(this.canvas);
    this.context=this.canvas.getContext('2d',{alpha:true})!;
    if(!this.context)throw new Error('Canvas is unavailable.');
    this.routes=(props.destinations||studyDestinations).map((destination,i)=>{
      const point=spherePoint(destination);
      const label=document.createElement(destination.href?'a':'span');
      label.className='j-pin j-globe-label';label.textContent=destination.name;
      if(label instanceof HTMLAnchorElement){const url=new URL(destination.href,location.href);if(url.origin===location.origin&&['http:','https:'].includes(url.protocol))label.href=url.href;}
      label.addEventListener('pointerenter',()=>{this.active=i;this.draw();},{signal:this.events.signal});
      label.addEventListener('pointerleave',()=>{this.active=-1;this.draw();},{signal:this.events.signal});
      label.addEventListener('focus',()=>{this.active=i;this.draw();},{signal:this.events.signal});
      label.addEventListener('blur',()=>{this.active=-1;this.draw();},{signal:this.events.signal});
      host.append(label);
      return {destination,point,path:Array.from({length:73},(_,j)=>greatCircle(this.originPoint,point,j/72)),label,width:0,height:0};
    });
    const options={signal:this.events.signal};
    host.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){this.hovered=true;this.sync();}},options);
    host.addEventListener('pointerleave',()=>{this.hovered=false;this.sync();},options);
    host.addEventListener('focusin',()=>{this.focused=true;this.sync();},options);
    host.addEventListener('focusout',()=>{queueMicrotask(()=>{if(!this.destroyed){this.focused=host.contains(document.activeElement);this.sync();}});},options);
    host.addEventListener('pointerdown',e=>{
      if(e.button!==0||(e.target as HTMLElement).closest('.j-globe-label'))return;
      this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};host.setPointerCapture(e.pointerId);host.classList.add('is-dragging');this.sync();
    },options);
    host.addEventListener('pointermove',e=>{
      if(!this.drag||e.pointerId!==this.drag.id)return;
      this.yaw+=(e.clientX-this.drag.x)*180/this.width;
      this.pitch=clamp(this.pitch-(e.clientY-this.drag.y)*120/this.height,-65,65);
      this.drag.x=e.clientX;this.drag.y=e.clientY;this.draw();
    },options);
    const release=()=>{this.drag=null;host.classList.remove('is-dragging');this.sync();};
    host.addEventListener('pointerup',release,options);host.addEventListener('pointercancel',release,options);host.addEventListener('lostpointercapture',()=>{if(this.drag)release();},options);
    host.addEventListener('keydown',e=>{
      if(e.target!==host||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();this.yaw+=e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0;
      this.pitch=clamp(this.pitch+(e.key==='ArrowUp'?10:e.key==='ArrowDown'?-10:0),-65,65);this.draw();
    },options);
    document.addEventListener('visibilitychange',()=>this.sync(),options);
    window.addEventListener('resize',()=>this.resize(),options);
    this.media.addEventListener('change',this.motionChange);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
    this.intersection=new IntersectionObserver(entries=>{this.inView=entries[0].isIntersecting;this.sync();},{threshold:0});this.intersection.observe(host);
    document.fonts?.ready.then(()=>{if(!this.destroyed)this.resize();});
    this.resize();
  }
  private motionChange=()=>{this.sync();this.draw();};
  private resize() {
    if(this.destroyed)return;
    const rect=this.host.getBoundingClientRect();this.width=rect.width;this.height=rect.height;
    if(!this.width||!this.height)return;
    this.ratio=Math.max(1,window.devicePixelRatio||1);
    this.canvas.width=Math.round(this.width*this.ratio);this.canvas.height=Math.round(this.height*this.ratio);
    this.context.setTransform(this.ratio,0,0,this.ratio,0,0);
    for(const route of this.routes){route.width=route.label.offsetWidth;route.height=route.label.offsetHeight;}
    this.draw();
  }
  private sync() {
    cancelAnimationFrame(this.frame);this.frame=0;this.lastTime=0;this.velocity=0;
    const running=!this.destroyed&&this.inView&&!document.hidden&&!this.media.matches&&!this.hovered&&!this.focused&&!this.drag;
    this.host.dataset.globeState=this.media.matches?'reduced-motion':running?'running':'paused';
    if(running&&this.speed>0)this.frame=requestAnimationFrame(this.tick);
  }
  private tick=(now:number)=>{
    if(this.destroyed)return;
    // Also check in-frame: media/visibility changes can arrive between scheduled callbacks.
    if(this.media.matches||document.hidden||!this.inView){this.sync();this.draw();return;}
    if(Math.max(1,window.devicePixelRatio||1)!==this.ratio)this.resize();
    const dt=this.lastTime?Math.min((now-this.lastTime)/1000,.05):0;this.lastTime=now;
    // Ease up to a constant angular velocity after interaction, without a jump on resume.
    const target=360/this.speed;this.velocity+=(target-this.velocity)*(1-Math.exp(-dt*6));
    this.yaw=(this.yaw+dt*this.velocity)%360;this.elapsed+=dt;
    this.draw();this.frame=requestAnimationFrame(this.tick);
  };
  private draw() {
    if(this.destroyed||!this.width)return;
    const c=this.context,w=this.width,h=this.height,r=Math.min(w,h)*.455,cx=w/2,cy=h/2;
    const rotate=orthographicBasis(this.yaw,this.pitch);
    const screen=(v:Vector3,altitude=1):Vector3=>{const p=rotate(v);return[cx+r*p[0]*altitude,cy-r*p[1]*altitude,p[2]];};
    c.clearRect(0,0,w,h);
    const glow=c.createRadialGradient(cx-r*.35,cy-r*.4,r*.08,cx,cy,r);
    glow.addColorStop(0,'#315849');glow.addColorStop(.6,this.colors.sea);glow.addColorStop(1,'#092c25');
    c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fillStyle=glow;c.fill();
    c.save();c.beginPath();c.arc(cx,cy,r-.5,0,Math.PI*2);c.clip();
    c.strokeStyle=this.colors.cream;c.lineWidth=.65;c.globalAlpha=.17;
    for(const line of this.grid){this.strokeVisible(line.map(v=>screen(v)));}
    c.restore();c.globalAlpha=.38;c.lineWidth=.9;c.strokeStyle=this.colors.gold;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();
    const origin=screen(this.originPoint);
    const labels:{route:Route;pin:Vector3;x:number;y:number;opacity:number}[]=[];
    this.routes.forEach((route,i)=>{
      const points=route.path.map((v,j)=>screen(v,1+.16*Math.sin(Math.PI*j/72)));
      c.strokeStyle=this.colors.gold;c.lineWidth=this.active===i?1.8:1.05;c.globalAlpha=this.active===i?.95:.65;this.strokeVisible(points);
      const phase=(this.elapsed/7+i*.23)%1;
      const dot=screen(greatCircle(this.originPoint,route.point,phase),1+.16*Math.sin(Math.PI*phase));
      if(!this.media.matches&&dot[2]>0){c.globalAlpha=fade(dot[2]);c.fillStyle=this.colors.cream;c.shadowColor=this.colors.gold;c.shadowBlur=7;this.circle(dot[0],dot[1],2.1);c.shadowBlur=0;}
      const pin=screen(route.point),opacity=fade(pin[2]);
      if(opacity>0){c.globalAlpha=opacity;c.fillStyle=this.colors.gold;this.circle(pin[0],pin[1],3.1);c.strokeStyle=this.colors.gold;c.lineWidth=.7;c.globalAlpha=opacity*.4;c.beginPath();c.arc(pin[0],pin[1],6,0,Math.PI*2);c.stroke();}
      route.label.style.opacity=String(opacity);route.label.style.visibility=opacity>0?'visible':'hidden';route.label.style.pointerEvents=opacity>.35?'auto':'none';
      if(route.label instanceof HTMLAnchorElement)route.label.tabIndex=opacity>.35?0:-1;
      route.label.setAttribute('aria-hidden',String(opacity<=0));
      if(opacity>0){const x=clamp(pin[0]<(cx)?pin[0]-route.width-10:pin[0]+10,8,w-route.width-8);let y=clamp(pin[1]-route.height/2,8,h-route.height-8);if(origin[2]>0&&x<origin[0]+50&&x+route.width>origin[0]-50&&y<origin[1]+24&&y+route.height>origin[1]-8)y=origin[1]+30+route.height<h-8?origin[1]+30:origin[1]-route.height-12;labels.push({route,pin,x,y,opacity});}
    });
    // Pack upright HTML labels vertically so Ottawa/Washington remain readable on phones.
    labels.sort((a,b)=>a.y-b.y);
    for(let i=1;i<labels.length;i++)labels[i].y=Math.max(labels[i].y,labels[i-1].y+labels[i-1].route.height+5);
    if(labels.length){const last=labels[labels.length-1];let overflow=Math.max(0,last.y+last.route.height+8-h);for(let i=labels.length-1;i>=0;i--){labels[i].y-=overflow;if(i>0)labels[i-1].y=Math.min(labels[i-1].y,labels[i].y-labels[i-1].route.height-5);}}
    for(const {route,pin,x,y,opacity}of labels){route.label.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;c.globalAlpha=opacity*.4;c.strokeStyle=this.colors.gold;c.lineWidth=.6;c.beginPath();c.moveTo(pin[0],pin[1]);c.lineTo(clamp(pin[0],x,x+route.width),y+route.height/2);c.stroke();}
    if(origin[2]>0){c.globalAlpha=fade(origin[2]);c.fillStyle=this.colors.gold;this.circle(origin[0],origin[1],4.1);c.font='500 10px sans-serif';c.textAlign='center';c.fillStyle=this.colors.cream;const half=c.measureText(this.origin.name).width/2;c.fillText(this.origin.name,clamp(origin[0],half+5,w-half-5),Math.min(h-5,origin[1]+19));}
    c.globalAlpha=1;this.host.dataset.globeLongitude=this.yaw.toFixed(3);
  }
  private circle(x:number,y:number,r:number){this.context.beginPath();this.context.arc(x,y,r,0,Math.PI*2);this.context.fill();}
  /** Clip each spherical segment at z=0: never join points across the hidden hemisphere. */
  private strokeVisible(points:Vector3[]) {
    const c=this.context;c.beginPath();
    for(let i=1;i<points.length;i++){let a=points[i-1],b=points[i];if(a[2]<0&&b[2]<0)continue;
      if((a[2]<0)!==(b[2]<0)){const t=a[2]/(a[2]-b[2]);const edge:Vector3=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,0];if(a[2]<0)a=edge;else b=edge;}
      c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);
    }c.stroke();
  }
  destroy() {this.destroyed=true;cancelAnimationFrame(this.frame);this.events.abort();this.resizeObserver.disconnect();this.intersection.disconnect();this.media.removeEventListener('change',this.motionChange);}
}
