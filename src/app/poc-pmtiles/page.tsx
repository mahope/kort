import PocPmtilesMap from "./PocPmtilesMap";

// PoC for issue #39: not linked from anywhere, not indexed, not part of the default flow.
export const metadata = { title: "PoC: PMTiles", robots: { index: false, follow: false } };

export default function Page() {
  return <PocPmtilesMap />;
}
