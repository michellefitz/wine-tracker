import "react";

/**
 * Next's App Router builds against its own React canary, which exports the
 * experimental <ViewTransition>; the published @types/react doesn't know it
 * yet. Only the props we use are declared here.
 */
declare module "react" {
  export const ViewTransition: import("react").ComponentType<{
    children?: import("react").ReactNode;
    /** The CSS view-transition-name; pairs of elements with the same name morph. */
    name?: string;
  }>;
}
