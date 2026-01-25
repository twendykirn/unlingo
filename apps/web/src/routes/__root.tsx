import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast"

import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
	useRouteContext,
} from "@tanstack/react-router";
import appCss from "../index.css?url";
import type { QueryClient } from "@tanstack/react-query";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { ConvexReactClient } from "convex/react";

import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { dark } from '@clerk/themes';

const fetchClerkAuth = createServerFn({ method: "GET" }).handler(async () => {
	const clerkAuth = await auth();
	const token = await clerkAuth.getToken({ template: "convex" });
	return { userId: clerkAuth.userId, token };
});

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
		const { userId, token } = await fetchClerkAuth();
		if (token) {
			ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
		}
		return { userId, token };
	},
});

function RootDocument() {
	const context = useRouteContext({ from: Route.id });
	return (
		<ClerkProvider appearance={{
			theme: dark
		}}>
			<ConvexProviderWithClerk client={context.convexClient} useAuth={useAuth}>
				<html lang="en" className="dark">
					<head>
						<HeadContent />
					</head>
					<body>
						<ToastProvider>
							<AnchoredToastProvider>
								<div className="grid h-svh grid-rows-[auto_1fr]">
									<Outlet />
								</div>
							</AnchoredToastProvider>
						</ToastProvider>
						<Scripts />
					</body>
				</html>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}
