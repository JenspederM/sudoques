import { type HTMLMotionProps, m } from "framer-motion";
import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type MotionCardProps = PropsWithChildren<{ className?: string }>;

export function MotionCard({
	children,
	className,
	...props
}: MotionCardProps & HTMLMotionProps<"div">) {
	return (
		<m.div
			className={cn(
				"glass rounded-2xl border border-border px-6 py-4 w-full",
				className,
			)}
			{...props}
		>
			{children}
		</m.div>
	);
}
