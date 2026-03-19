// Isolated layout for the standalone preview — strips out the root layout's
// nav bar and pt-16 padding so PreviewClient can fill the full viewport cleanly.
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
