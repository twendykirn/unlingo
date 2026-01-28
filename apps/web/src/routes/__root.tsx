import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast"

import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
	useRouteContext,
} from "@tanstack/react-router";
import "@/lib/openpanel"; // Initialize OpenPanel tracking
import appCss from "../index.css?url";
import type { QueryClient } from "@tanstack/react-query";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { ConvexReactClient } from "convex/react";

import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { dark } from '@clerk/themes';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';

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
				title: "Unlingo - Developer Platform for Internationalization",
			},
			{
				name: "description",
				content: "Unlingo is a developer platform for internationalization. Manage translations, host translation files, and integrate with popular i18n libraries.",
			},
			{
				property: "og:type",
				content: "website",
			},
			{
				property: "og:title",
				content: "Unlingo - Developer Platform for Internationalization",
			},
			{
				property: "og:description",
				content: "Unlingo is a developer platform for internationalization. Manage translations, host translation files, and integrate with popular i18n libraries.",
			},
			{
				property: "og:image",
				content: "/og.png",
			},
			{
				property: "og:site_name",
				content: "Unlingo",
			},
			{
				name: "twitter:card",
				content: "summary_large_image",
			},
			{
				name: "twitter:title",
				content: "Unlingo - Developer Platform for Internationalization",
			},
			{
				name: "twitter:description",
				content: "Unlingo is a developer platform for internationalization. Manage translations, host translation files, and integrate with popular i18n libraries.",
			},
			{
				name: "twitter:image",
				content: "/og.png",
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
				<html lang="en" className="dark" suppressHydrationWarning>
					<head>
						<HeadContent />
					</head>
					<body className="min-h-screen">
						<RootProvider
								theme={{
									enabled: false,
								}}
							>
							<ToastProvider>
								<AnchoredToastProvider>
									<Outlet />
								</AnchoredToastProvider>
							</ToastProvider>
						</RootProvider>
						<Scripts />
					</body>
				</html>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}
