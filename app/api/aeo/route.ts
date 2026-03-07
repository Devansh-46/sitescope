// app/api/aeo/route.ts
// AEO Analysis API Endpoint for SiteScope

import { NextRequest, NextResponse } from "next/server";
import { extractAEOSignals, buildAEOReport } from "@/lib/aeo";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, html } = body;

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        let pageHtml = html;

        // Fetch the page if HTML not provided
        if (!pageHtml) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            try {
                const response = await fetch(url, {
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (compatible; SiteScope-AEO/1.0; +https://sitescope.ai)",
                        Accept:
                            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.5",
                    },
                    signal: controller.signal,
                });
                clearTimeout(timeout);
                pageHtml = await response.text();
            } catch (fetchError) {
                clearTimeout(timeout);
                return NextResponse.json(
                    {
                        error: "Failed to fetch URL for AEO analysis",
                        details: String(fetchError),
                    },
                    { status: 422 }
                );
            }
        }

        const signals = extractAEOSignals(pageHtml, url);
        const report = buildAEOReport(signals, url);

        return NextResponse.json({
            success: true,
            url,
            report,
            analyzedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[AEO API] Error:", error);
        return NextResponse.json(
            {
                error: "AEO analysis failed",
                details: String(error),
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
        return NextResponse.json({ error: "URL parameter required" }, { status: 400 });
    }

    // Forward to POST
    const mockRequest = new Request(request.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
    });

    return POST(new NextRequest(mockRequest));
}
