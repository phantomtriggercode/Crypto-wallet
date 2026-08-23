import { clsx } from "clsx";

export function Card({ className, children, ...rest }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={clsx("card p-5", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardGlass({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("card-glass p-5", className)}>{children}</div>;
}
