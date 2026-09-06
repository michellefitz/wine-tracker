import Sheet from "@/components/Sheet";
import SheetSkeleton from "@/components/SheetSkeleton";

/**
 * The sheet, before the server has said anything at all.
 *
 * This is the whole difference between a tap that responds and one that
 * doesn't. The sheet used to be built inside the page, which meant it could
 * not exist until the route's payload had been fetched — so a tap did nothing
 * for the length of a round trip and then the panel, the skeleton and the
 * bottle all arrived in the same frame. Measured on a slow connection: 811ms
 * of nothing, then everything. The skeleton was never once on screen, and a
 * fade on the content had nothing to fade over.
 *
 * A loading file is part of the shell Next prefetches for the links on the
 * shelf, so it renders from what the browser already has. The panel goes up on
 * the tap, this holds the shape while the bottle is fetched, and the bottle
 * fades in when it lands.
 *
 * The panel itself doesn't move when that happens — see Sheet, which knows
 * this and the page are the same sheet and lets the second one keep the first
 * one's entrance rather than playing it again.
 */
export default function LoadingWineSheet() {
  return (
    <Sheet label="Bottle">
      <SheetSkeleton />
    </Sheet>
  );
}
