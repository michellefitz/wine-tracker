import FormSkeleton from "@/components/FormSkeleton";
import Sheet from "@/components/Sheet";

/**
 * The same immediate sheet for the form.
 *
 * Needed on its own account and also to keep the bottle's out of the way: a
 * loading file covers the segments beneath it too, so without this one, tapping
 * Edit would raise the sheet showing a bottle-shaped skeleton and then replace
 * it with a form.
 */
export default function LoadingEditSheet() {
  return (
    <Sheet label="Edit bottle" dismiss="handle">
      <FormSkeleton />
    </Sheet>
  );
}
