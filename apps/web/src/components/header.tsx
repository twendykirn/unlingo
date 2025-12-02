import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function Header() {
	const { user, isAuthenticated, signIn, signOut, isLoading } = useAuth();

	const links = [
		{ to: "/", label: "Home" },
		{ to: "/dashboard", label: "Dashboard" },
		{ to: "/todos", label: "Todos" },
	] as const;

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => {
						return (
							<Link key={to} to={to}>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					{isAuthenticated ? (
						<>
							<span className="text-sm text-muted-foreground">
								{user?.email}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={signOut}
								disabled={isLoading}
							>
								Sign out
							</Button>
						</>
					) : (
						<Button
							variant="outline"
							size="sm"
							onClick={() => signIn()}
							disabled={isLoading}
						>
							Sign in
						</Button>
					)}
				</div>
			</div>
			<hr />
		</div>
	);
}
