import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'

export function reportWebVitals() {
  onCLS(console.log)
  onINP(console.log)
  onFCP(console.log)
  onLCP(console.log)
  onTTFB(console.log)
}