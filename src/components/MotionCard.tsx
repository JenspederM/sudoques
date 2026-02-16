import { type HTMLMotionProps, motion } from "framer-motion";
import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type MotionCardProps = PropsWithChildren<{ className?: string }>;

export function MotionCard({
	children,
	className,
	...props
}: MotionCardProps & HTMLMotionProps<"div">) {
	return (
		<motion.div
			className={cn(
				"glass rounded-2xl border border-white/5 px-6 py-4 w-full max-w-xl",
				className,
			)}
			{...props}
		>
			{children}
		</motion.div>
	);
}

export function MotionCardTitle({
	children,
	className,
	...props
}: MotionCardProps & HTMLMotionProps<"h2">) {
	return (
		<motion.h2
			className={cn("flex items-center gap-3 mb-4", className)}
			{...props}
		>
			{children}
		</motion.h2>
	);
}

export function MotionCardContent({
	children,
	className,
	...props
}: MotionCardProps & HTMLMotionProps<"div">) {
	return (
		<motion.div className={cn("flex flex-col gap-2", className)} {...props}>
			{children}
		</motion.div>
	);
}
