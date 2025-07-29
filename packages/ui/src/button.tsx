import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "ui:inline-flex ui:items-center ui:justify-center ui:whitespace-nowrap ui:rounded-md ui:text-sm ui:font-medium ui:ring-offset-background ui:transition-colors ui:focus-visible:outline-none ui:focus-visible:ring-2 ui:focus-visible:ring-ring ui:focus-visible:ring-offset-2 ui:disabled:pointer-events-none ui:disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "ui:bg-primary ui:text-primary-foreground ui:hover:bg-primary/90",
        destructive:
          "ui:bg-destructive ui:text-destructive-foreground ui:hover:bg-destructive/90",
        outline:
          "ui:border ui:border-input ui:bg-background ui:hover:bg-accent ui:hover:text-accent-foreground",
        secondary:
          "ui:bg-secondary ui:text-secondary-foreground ui:hover:bg-secondary/80",
        ghost: "ui:hover:bg-accent ui:hover:text-accent-foreground",
        link: "ui:text-primary ui:underline-offset-4 ui:hover:underline",
      },
      size: {
        default: "ui:h-10 ui:px-4 ui:py-2",
        sm: "ui:h-9 ui:rounded-md ui:px-3",
        lg: "ui:h-11 ui:rounded-md ui:px-8",
        icon: "ui:h-10 ui:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };