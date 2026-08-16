import {
	type HTMLMotionProps,
	m,
	stagger,
	type TargetAndTransition,
	useReducedMotionConfig,
	type Variants,
} from "framer-motion";
import type { PropsWithChildren } from "react";
import { getMotionInitial } from "@/lib/motion";
import { cn } from "@/lib/utils";

const listVariants: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			delayChildren: stagger(0.1),
		},
	},
};

export function StaggeredList({
	children,
	className,
	...props
}: PropsWithChildren<HTMLMotionProps<"div">>) {
	const shouldReduceMotion = useReducedMotionConfig();

	return (
		<m.div
			variants={listVariants}
			initial={getMotionInitial(shouldReduceMotion, "hidden")}
			animate="visible"
			{...props}
			className={cn("w-full flex flex-col gap-4", className)}
		>
			{children}
		</m.div>
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
		},
	};
	const defaultPadding = "px-6 py-4";
	const defaultShadow = "shadow-lg shadow-border/10";
	const defaultBorder = "border border-border";
	const variantStyles = {
		brand: `${defaultPadding} bg-primary text-white ${defaultShadow} ${defaultBorder}`,
		default: `${defaultPadding} bg-glass text-foreground ${defaultShadow} ${defaultBorder}`,
		transparent: "bg-transparent text-foreground drop-shadow-none",
	};
	if (type === "button") {
		return (
			<m.div
				variants={elementVariants}
				whileHover="hovering"
				whileTap="tap"
				className={cn(
					"flex items-center justify-center w-full gap-4 rounded-2xl font-bold text-lg cursor-pointer",
					variantStyles[variant || "default"],
					className,
				)}
				role="button"
				{...props}
			>
				{children}
			</m.div>
		);
	} else if (type === "card") {
		return (
			<m.div
				variants={elementVariants}
				className={cn(
					"rounded-2xl",
					variantStyles[variant || "default"],
					className,
				)}
				{...props}
			>
				{children}
			</m.div>
		);
	}
	return (
		<m.div variants={elementVariants} className={className} {...props}>
			{children}
		</m.div>
	);
}
