"use client";

import { Button, useToast } from "@/components/ui";

/** The one interactive island on the styleguide — toasts need a click. */
export default function ToastDemo() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          toast({
            tone: "success",
            title: "Deposit received",
            description: "Your spot on Telluride · Feb 2027 is held.",
          })
        }
      >
        Confirmation
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          toast({
            tone: "warning",
            title: "Two spots left",
            description: "This departure closes when the lodge fills.",
          })
        }
      >
        Warning
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          toast({ tone: "error", title: "Card declined", description: "Try another method." })
        }
      >
        Error
      </Button>
    </div>
  );
}
