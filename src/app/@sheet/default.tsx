/**
 * Nothing, which is the point.
 *
 * This slot only fills when a route is intercepted into it. On a direct visit
 * or a reload there is nothing to put over the page, and Next needs to be told
 * that in so many words or the slot 404s the whole layout.
 */
export default function NoSheet() {
  return null;
}
