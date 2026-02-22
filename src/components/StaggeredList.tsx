import {
	type HTMLMotionProps,
	motion,
	type TargetAndTransition,
	type Variants,
} from "framer-motion";
import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";
import { MotionCard } from "./MotionCard";

const listVariants: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.05,
		},
	},
};

export function StaggeredList({
	children,
	className,
	...props
}: PropsWithChildren<HTMLMotionProps<"div">>) {
	return (
		<motion.div
			variants={listVariants}
			initial="hidden"
			animate="visible"
			{...props}
			className={cn("w-full flex flex-col gap-4", className)}
		>
			{children}
		</motion.div>
	);
}

export function StaggeredListElement({
	children,
	type,
	variant,
	className,
	whileHover,
	whileTap,
	...props
}: PropsWithChildren<
	HTMLMotionProps<"div"> & {
		type?: "button" | "card";
		variant?: "brand" | "default" | "transparent";
		whileHover?: TargetAndTransition;
		whileTap?: TargetAndTransition;
	}
>) {
	const elementVariants: Variants = {
		hidden: { opacity: 0, y: 20 },
		hovering: {
			scale: 1.02,
			transition: {
				duration: 0.1,
			},
			...(whileHover && typeof whileHover === "object" ? whileHover : {}),
		},
		tap: {
			scale: 0.98,
			transition: {
				duration: 0.05,
			},
			...(whileTap && typeof whileTap === "object" ? whileTap : {}),
		},
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.2,
				ease: "easeOut",
			},
		},
	};
	const defaultPadding = "px-6 py-4";
	const defaultColors = {
		brand: "bg-brand-primary text-white shadow-md shadow-brand-primary/10",
		default: "bg-glass text-text-primary shadow-lg shadow-brand-subtle",
		transparent: "bg-transparent text-text-primary shadow-none",
	};
	if (type === "button") {
		return (
			<motion.div
				variants={elementVariants}
				initial="hidden"
				animate="visible"
				whileHover="hovering"
				whileTap="tap"
				className={cn(
					"flex items-center justify-center w-full gap-4 rounded-2xl border border-border-subtle font-bold text-lg cursor-pointer",
					defaultPadding,
					defaultColors[variant || "default"],
					className,
				)}
				role="button"
				{...props}
			>
				{children}
			</motion.div>
		);
	} else if (type === "card") {
		return (
			<motion.div
				className={cn(
					"rounded-2xl border border-border-subtle",
					defaultPadding,
					defaultColors[variant || "default"],
					className,
				)}
				{...props}
			>
				{children}
			</motion.div>
		);
	}
	return (
		<motion.div
			variants={elementVariants}
			className={className}
			initial="hidden"
			animate="visible"
			{...props}
		>
			{children}
		</motion.div>
	);
}
