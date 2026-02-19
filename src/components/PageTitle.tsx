export function PageTitle({ title }: { title: string }) {
	return (
		<h2 className="text-2xl font-black tracking-tight text-text-primary">
			{title}
		</h2>
	);
}
