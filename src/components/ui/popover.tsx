import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { SafePortal } from "@/components/SafePortal";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <SafePortal>
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
...
      />
    </PopoverPrimitive.Portal>
  </SafePortal>
));

PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
