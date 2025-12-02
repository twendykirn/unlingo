import { Toaster } from "@/components/ui/sonner";

import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
	useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import Header from "../components/header";
import appCss from "../index.css?url";
import type { QueryClient } from "@tanstack/react-query";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { ConvexReactClient } from "convex/react";

import { AuthProvider, getSession, type Session } from "@/lib/auth";

export interface RouterAppContext {
	queryClient: QueryClient;
	convexClient: ConvexReactClient;
	convexQueryClient: ConvexQueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "My App",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	component: RootDocument,
	beforeLoad: async (ctx) => {
		const { session } = await getSession();
		const accessToken = session?.accessToken ?? null;

		if (accessToken) {
			ctx.context.convexQueryClient.serverHttpClient?.setAuth(accessToken);
		}

		return {
			userId: session?.user?.id ?? null,
			user: session?.user ?? null,
			accessToken,
		};
	},
});

function RootDocument() {
	const { user } = useRouteContext({ from: "__root__" });

	return (
		<AuthProvider initialUser={user}>
			<html lang="en" className="dark">
				<head>
					<HeadContent />
				</head>
				<body>
					<div className="grid h-svh grid-rows-[auto_1fr]">
						<Header />
						<Outlet />
					</div>
					<Toaster richColors />
					<TanStackRouterDevtools position="bottom-left" />
					<Scripts />
				</body>
			</html>
		</AuthProvider>
	);
}
