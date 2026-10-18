/** Unit-sphere geometry. Angles supplied by callers are degrees; longitude is east-positive. */
export type Vector3 = readonly [number, number, number];
export interface GeoPoint {lat:number;lon:number;}
const radians=Math.PI/180;
export function spherePoint({lat,lon}:GeoPoint):Vector3 {
  const phi=lat*radians,lambda=lon*radians;
  return [Math.cos(phi)*Math.cos(lambda),Math.cos(phi)*Math.sin(lambda),Math.sin(phi)];
}
/** True orthographic projection: dot products against an orthonormal camera basis, no perspective. */
export function orthographicBasis(yaw:number,pitch:number) {
  const lambda=yaw*radians,phi=pitch*radians;
  const sl=Math.sin(lambda),cl=Math.cos(lambda),sp=Math.sin(phi),cp=Math.cos(phi);
  return (v:Vector3):Vector3=>[
    sl*v[0]+cl*v[1],
    cp*v[2]-sp*(cl*v[0]-sl*v[1]),
    cp*(cl*v[0]-sl*v[1])+sp*v[2],
  ];
}
/** Great-circle interpolation, including stable coincident/antipodal handling. */
export function greatCircle(a:Vector3,b:Vector3,t:number):Vector3 {
  const dot=Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2]));
  const angle=Math.acos(dot),sin=Math.sin(angle);
  if(angle<1e-8)return a;
  if(Math.abs(sin)<1e-8){const axis:Vector3=Math.abs(a[0])<.9?[1,0,0]:[0,1,0];const d=axis[0]*a[0]+axis[1]*a[1]+axis[2]*a[2];const u=axis.map((x,i)=>x-d*a[i]);const length=Math.hypot(...u);return a.map((x,i)=>Math.cos(Math.PI*t)*x+Math.sin(Math.PI*t)*u[i]/length) as unknown as Vector3;}
  const p=Math.sin((1-t)*angle)/sin,q=Math.sin(t*angle)/sin;
  return [p*a[0]+q*b[0],p*a[1]+q*b[1],p*a[2]+q*b[2]];
}
export function graticule():Vector3[][] {
  const lines:Vector3[][]=[];
  for(let lat=-60;lat<=60;lat+=30){const line:Vector3[]=[];for(let lon=-180;lon<=180;lon+=3)line.push(spherePoint({lat,lon}));lines.push(line);}
  for(let lon=-180;lon<180;lon+=30){const line:Vector3[]=[];for(let lat=-90;lat<=90;lat+=3)line.push(spherePoint({lat,lon}));lines.push(line);}
  return lines;
}
