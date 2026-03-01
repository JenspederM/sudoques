export function Spinner() {
	return (
		<div className="min-h-screen bg-background flex items-center justify-center text-foreground">
			<div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
		</div>
	);
}
