import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals'

export function reportWebVitals() {
  onCLS(console.log)
  onFID(console.log)
  onFCP(console.log)
  onLCP(console.log)
  onTTFB(console.log)
}