import { type HTMLMotionProps, motion, type Variants } from "framer-motion";
import type { PropsWithChildren } from "react";
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

const elementVariants: Variants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.2,
			ease: "easeOut",
		},
	},
};

export function StaggeredList({ children }: PropsWithChildren) {
	return (
		<motion.div
			variants={listVariants}
			initial="hidden"
			animate="visible"
			className="w-full flex flex-col gap-4"
		>
			{children}
		</motion.div>
	);
}

export function StaggeredListElement({
	children,
	...props
}: PropsWithChildren<HTMLMotionProps<"div">>) {
	return (
		<MotionCard
			variants={elementVariants}
			initial="hidden"
			animate="visible"
			{...props}
		>
			{children}
		</MotionCard>
	);
}
