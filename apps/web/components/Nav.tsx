/**
 * Legacy Nav component.
 * The shell layout now uses <TopNav variant="app" /> directly.
 * Kept as a thin re-export so any lingering imports continue to work.
 */
import TopNav from "./TopNav";

export default function Nav() {
  return <TopNav variant="app" />;
}
