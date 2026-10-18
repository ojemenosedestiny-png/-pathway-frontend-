# AnimatedGlobe

Dependency-free canvas component using a true orthographic projection and unit-sphere great-circle interpolation. No CDN, map service, or d3 bundle is loaded. Import from `animated-globe.js` and include the existing `journey/theme.css`.

```ts
import {AnimatedGlobe, studyDestinations} from './animated-globe.js';

const globe = new AnimatedGlobe(container, {
  rotationSpeed: 60, // seconds per full turn; 0 disables automatic motion
  origin: {name: 'Abuja, Nigeria', lat: 9.0765, lon: 7.3986},
  destinations: studyDestinations.map(destination => ({
    ...destination,
    href: '/pathways?q=' + encodeURIComponent(destination.name),
  })),
  colors: {
    sea: '#123c32', cream: '#f9efda', gold: '#d8b975', label: '#183f34',
  },
  initialRotation: [15, 18], // yaw and latitude tilt, in degrees
});

// Before removing/replacing the container:
globe.destroy();
```

Destinations accept `name`, `lat`, `lon`, and optional same-origin `href`. Defaults use London, Ottawa, Washington DC and Abu Dhabi. Omit href when a country's pathway does not exist; the pill remains a hover highlight. Labels are upright HTML elements, clipped from keyboard navigation when behind the globe. Arrow keys provide a keyboard alternative to dragging; focus pauses animation.

The spherical grid, elevated routes, travelling dots and pins use the same orthographic camera basis. Segments crossing the horizon are clipped at z=0, pins/labels fade at the limb, and automatic rotation eases back to six degrees per second after interaction. Hover, keyboard focus, page visibility and IntersectionObserver stop RAF work. Reduced motion gives a static globe (manual rotation remains available). ResizeObserver and devicePixelRatio keep the canvas sharp. The homepage retains its existing caption outside the component.

Verification: `npm run build`, then with the website running on port 3000, `node globe-qa.cjs`.
